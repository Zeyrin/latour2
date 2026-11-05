// Crée une session Stripe Embedded Checkout pour une suite : le formulaire de paiement s'affiche
// dans la fenêtre de réservation du site (aucune redirection).
//
// Le paiement est seulement AUTORISÉ (capture manuelle) : la réservation est créée dans Beds24 dès
// l'autorisation (api/stripe-webhook), puis débitée automatiquement après AUTO_CONFIRM_HOURS
// (api/capture-bookings) sauf si le château l'annule entre-temps dans le tableau de bord Stripe.
//
// Réponses : 200 { clientSecret, publishableKey, suite, amount } · 409 dates indisponibles
//            503 paiement en ligne non configuré (le site revient alors à la demande par e-mail)

import { SUITES, addDays, stayPrice, stripe, stripeConfigured, todayInParis, type Suite } from './_lib/server.js'

const MAX_BODY = 10_000
const MAX_NIGHTS = 30
const SUITE_NAMES: Record<Suite, string> = { terre: 'Terre', eau: 'Eau', metal: 'Métal', feu: 'Feu', bois: 'Bois' }

function text(value: unknown, max: number) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed.slice(0, max) : null
}

function date(value: unknown) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) ? value : null
}

function nights(arrival: string, departure: string) {
  return Math.round((Date.parse(`${departure}T12:00:00Z`) - Date.parse(`${arrival}T12:00:00Z`)) / 86_400_000)
}

export async function POST(request: Request) {
  if (!stripeConfigured() || !process.env.BEDS24_TOKEN) return Response.json({ error: 'Paiement en ligne indisponible' }, { status: 503 })

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

  const name = text(body.name, 100)
  const email = text(body.email, 200)
  const arrival = date(body.arrival)
  const departure = date(body.departure)
  const guests = typeof body.guests === 'number' && Number.isInteger(body.guests) && body.guests >= 1 && body.guests <= 20 ? body.guests : null
  const lang = body.lang === 'en' ? 'en' : 'fr'
  const wanted = typeof body.suite === 'string' && (SUITES as readonly string[]).includes(body.suite) ? body.suite as Suite : null
  if (!name || !email || !email.includes('@') || !arrival || !departure || !guests) return Response.json({ error: 'Champs manquants' }, { status: 400 })
  const count = nights(arrival, departure)
  if (arrival < addDays(todayInParis(), -1) || count < 1 || count > MAX_NIGHTS) return Response.json({ error: 'Dates invalides' }, { status: 400 })

  try {
    // Suite demandée, ou à défaut la première suite libre pour ces dates (prix lu dans Beds24).
    let suite: Suite | null = null
    let price: number | null = null
    for (const candidate of wanted ? [wanted] : SUITES) {
      price = await stayPrice(candidate, arrival, departure, guests)
      if (price) { suite = candidate; break }
    }
    if (!suite || !price) return Response.json({ error: 'Ces dates ne sont plus disponibles' }, { status: 409 })

    const amount = Math.round(price * 100)
    const label = `Suite ${SUITE_NAMES[suite]} · ${count} ${lang === 'fr' ? (count > 1 ? 'nuits' : 'nuit') : (count > 1 ? 'nights' : 'night')} · ${arrival} → ${departure}`
    const metadata = {
      suite, arrival, departure, guests: String(guests), name, email,
      phone: text(body.phone, 40) ?? '',
      message: (text(body.message, 2000) ?? '').slice(0, 490), // les métadonnées Stripe sont limitées à 500 caractères
      price: String(price),
    }
    const session = await stripe().checkout.sessions.create({
      ui_mode: 'embedded_page',
      redirect_on_completion: 'never',
      mode: 'payment',
      locale: lang,
      customer_email: email,
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
      line_items: [{ quantity: 1, price_data: { currency: 'eur', unit_amount: amount, product_data: { name: `Château Latour Ségur — ${label}` } } }],
      payment_intent_data: { capture_method: 'manual', description: label, metadata },
      metadata,
    })
    if (!session.client_secret) throw new Error('Stripe : client_secret absent')
    return Response.json({ clientSecret: session.client_secret, publishableKey: process.env.STRIPE_PUBLISHABLE_KEY, suite, amount })
  } catch (error) {
    console.error('checkout', error)
    return Response.json({ error: 'Paiement en ligne indisponible' }, { status: 503 })
  }
}

/** Le formulaire demande au chargement si le paiement en ligne est actif (sinon : demande par e-mail). */
export function GET() {
  return Response.json({ enabled: stripeConfigured() && Boolean(process.env.BEDS24_TOKEN) }, { headers: { 'Cache-Control': 'public, max-age=0, s-maxage=300' } })
}
