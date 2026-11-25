// Demande de devis de la page « Séminaires & événements » (src/pages/Events.tsx).
// Enregistrée dans la table booking_requests existante (universe = 'evenements', détails dans message) :
// aucune modification du schéma Supabase n'est nécessaire. Puis alerte e-mail au château (Resend).

import { sendOwnerQuoteAlert, type QuoteFields } from './_lib/email.js'

// Mêmes valeurs que EVENT_TYPES et EVENT_OPTIONS dans src/lib/events.ts.
const TYPES = ['seminaire', 'reception', 'celebration', 'autre']
const OPTIONS = ['hebergement', 'petit-dejeuner', 'spa', 'repas']
const TYPE_NAMES: Record<string, string> = { seminaire: 'Séminaire', reception: 'Réception privée', celebration: 'Célébration', autre: 'Autre' }
const OPTION_NAMES: Record<string, string> = { hebergement: 'Hébergement dans les suites', 'petit-dejeuner': 'Petit-déjeuner', spa: 'Spa privatisé', repas: 'Repas sur place' }
const MAX_BODY = 10_000
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
  const participants = typeof body.participants === 'number' && Number.isInteger(body.participants) && body.participants >= 1 && body.participants <= 500 ? body.participants : null
  if (!participants) return Response.json({ error: 'Nombre de personnes requis' }, { status: 400 })

  const start = date(body.start)
  const endRaw = date(body.end)
  const quote: QuoteFields = {
    type: typeof body.type === 'string' && TYPES.includes(body.type) ? TYPE_NAMES[body.type] : 'Autre',
    start,
    end: start && endRaw && endRaw > start ? endRaw : null,
    flexible: body.flexible === true,
    participants,
    options: Array.isArray(body.options) ? OPTIONS.filter((option) => (body.options as unknown[]).includes(option)).map((option) => OPTION_NAMES[option]) : [],
    organisation: text(body.organisation, 120),
    name,
    email,
    phone: text(body.phone, 40),
    message: text(body.message, 1500),
    lang: body.lang === 'en' ? 'en' : 'fr',
  }

  // Résumé lisible dans la colonne message de booking_requests (2 000 caractères au plus).
  const summary = [
    `DEVIS ${quote.type.toUpperCase()}`,
    quote.organisation && `Organisation : ${quote.organisation}`,
    quote.flexible && 'Dates flexibles',
    quote.options.length > 0 && `Souhaite : ${quote.options.join(', ')}`,
    quote.lang === 'en' && 'Langue : anglais',
    quote.message,
  ].filter(Boolean).join('\n').slice(0, 2000)

  const row = {
    name,
    email,
    phone: quote.phone,
    universe: 'evenements',
    arrival: quote.start,
    departure: quote.end,
    guests: participants,
    message: summary,
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
    await sendOwnerQuoteAlert(quote, crypto.randomUUID())
    return new Response(null, { status: 204 })
  } catch (error) {
    console.error('quote-request', error)
    return Response.json({ error: 'Enregistrement impossible' }, { status: 502 })
  }
}
