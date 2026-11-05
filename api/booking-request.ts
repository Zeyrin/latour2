// Enregistre une demande du formulaire de réservation dans Supabase (table booking_requests).
// Écriture côté serveur avec SUPABASE_SERVICE_ROLE_KEY : seuls les champs ci-dessous, validés, sont acceptés.

const UNIVERSES = ['suites', 'spa', 'evenements']
const SUITES = ['terre', 'eau', 'metal', 'feu', 'bois']
const MAX_BODY = 10_000
// Anti-abus : au plus MAX_RECENT demandes par adresse e-mail sur RECENT_MINUTES.
const MAX_RECENT = 3
const RECENT_MINUTES = 60

function text(value: unknown, max: number) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed.slice(0, max) : null
}

function date(value: unknown) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) ? value : null
}

function oneOf(value: unknown, allowed: string[]) {
  return typeof value === 'string' && allowed.includes(value) ? value : null
}

export async function POST(request: Request) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) return Response.json({ error: 'Variables d’environnement manquantes' }, { status: 500 })

  const raw = await request.text()
  if (raw.length > MAX_BODY) return Response.json({ error: 'Demande trop longue' }, { status: 413 })
  let body: Record<string, unknown>
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error()
    body = parsed as Record<string, unknown>
  } catch {
    return Response.json({ error: 'Demande invalide' }, { status: 400 })
  }

  // Champ piège invisible : un robot le remplit, on fait semblant d'accepter.
  if (body.website) return new Response(null, { status: 204 })

  const name = text(body.name, 100)
  const email = text(body.email, 200)
  if (!name || !email || email.length < 3 || !email.includes('@')) return Response.json({ error: 'Nom et e-mail requis' }, { status: 400 })

  const universe = oneOf(body.universe, UNIVERSES)
  const arrival = date(body.arrival)
  const departure = date(body.departure)
  const guests = typeof body.guests === 'number' && Number.isInteger(body.guests) && body.guests >= 1 && body.guests <= 500 ? body.guests : null
  const row = {
    name,
    email,
    phone: text(body.phone, 40),
    universe,
    suite: universe === 'suites' ? oneOf(body.suite, SUITES) : null,
    arrival,
    departure: arrival && departure && departure > arrival ? departure : null,
    guests,
    message: text(body.message, 2000),
  }

  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }
  try {
    const since = new Date(Date.now() - RECENT_MINUTES * 60_000).toISOString()
    const recent = await fetch(`${supabaseUrl}/rest/v1/booking_requests?select=id&email=eq.${encodeURIComponent(email)}&created_at=gte.${encodeURIComponent(since)}&limit=${MAX_RECENT}`, { headers })
    if (recent.ok && (await recent.json() as unknown[]).length >= MAX_RECENT) return Response.json({ error: 'Trop de demandes, réessayez plus tard' }, { status: 429 })

    const response = await fetch(`${supabaseUrl}/rest/v1/booking_requests`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify(row),
    })
    if (!response.ok) throw new Error(`Supabase ${response.status} : ${await response.text()}`)
    return new Response(null, { status: 204 })
  } catch (error) {
    console.error('booking-request', error)
    return Response.json({ error: 'Enregistrement impossible' }, { status: 502 })
  }
}
