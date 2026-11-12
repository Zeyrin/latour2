// Réservation en ligne d'une suite avec paiement Stripe Checkout.
//   GET  → { enabled } : le site n'affiche le paiement en ligne que s'il est configuré.
//   POST → bloque les dates (réservation « pending » dans Supabase) et renvoie l'adresse de la page de paiement Stripe.
// Le prix est toujours recalculé ici à partir de src/lib/pricing.ts : celui affiché par le navigateur ne compte pas.
//
// Variables d'environnement : STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
// ONLINE_BOOKING=off désactive le paiement en ligne sans retirer les clés.

import { CURRENCY, quote, parisToday } from '../src/lib/pricing.js'
import { getStripe, stripeConfigured } from './_lib/stripe.js'
import { rpc, supabaseConfig } from './_lib/supabase.js'

const MAX_BODY = 10_000
/** Durée de blocage des dates pendant le paiement. Stripe impose au moins 30 minutes avant l'expiration d'une session. */
const SESSION_MINUTES = 31
const HOLD_MINUTES = SESSION_MINUTES + 4

const SUITE_NAMES: Record<string, Record<'fr' | 'en', string>> = {
  terre: { fr: 'La Suite Terre', en: 'The Earth Suite' },
  eau: { fr: 'La Suite Eau', en: 'The Water Suite' },
  metal: { fr: 'La Suite Métal', en: 'The Metal Suite' },
  feu: { fr: 'La Suite Feu', en: 'The Fire Suite' },
  bois: { fr: 'Le Cottage Bois', en: 'The Wood Cottage' },
}

/** Pages de retour après Stripe (mêmes chemins que paths.bookingConfirmed / paths.bookingCancelled dans src/lib/i18n.ts). */
const RETURN_PATHS = {
  fr: { confirmed: '/reservation/confirmation', cancelled: '/reservation/annulation' },
  en: { confirmed: '/en/booking/confirmation', cancelled: '/en/booking/cancelled' },
}

export function onlineBookingEnabled() {
  return stripeConfigured() && Boolean(process.env.STRIPE_WEBHOOK_SECRET) && Boolean(supabaseConfig()) && process.env.ONLINE_BOOKING !== 'off'
}

function text(value: unknown, max: number) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed.slice(0, max) : null
}

function longDate(iso: string, lang: 'fr' | 'en') {
  return new Intl.DateTimeFormat(lang === 'fr' ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${iso}T12:00:00Z`))
}

/** Adresse IP du visiteur (fournie par Vercel), pour limiter les blocages de dates par une même personne. */
function clientIp(request: Request) {
  const ip = request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for')?.split(',')[0]
  return ip?.trim().slice(0, 64) || null
}

export function GET() {
  return Response.json({ enabled: onlineBookingEnabled() }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: Request) {
  if (!onlineBookingEnabled()) return Response.json({ error: 'disabled' }, { status: 503 })

  const raw = await request.text()
  if (raw.length > MAX_BODY) return Response.json({ error: 'invalid' }, { status: 413 })
  let body: Record<string, unknown>
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error()
    body = parsed as Record<string, unknown>
  } catch {
    return Response.json({ error: 'invalid' }, { status: 400 })
  }
  if (body.website) return Response.json({ error: 'invalid' }, { status: 400 })

  const lang = body.lang === 'en' ? 'en' : 'fr'
  const name = text(body.name, 100)
  const email = text(body.email, 200)
  if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({ error: 'contact' }, { status: 400 })
  const priced = quote(body.suite, String(body.arrival ?? ''), String(body.departure ?? ''), Number(body.guests), parisToday())
  if ('error' in priced) return Response.json({ error: priced.error }, { status: 400 })

  let bookingId: string
  try {
    const created = await rpc<{ ok: boolean; id?: string; error?: string }>('create_pending_booking', {
      p_suite: priced.suite,
      p_arrival: priced.arrival,
      p_departure: priced.departure,
      p_nights: priced.nights,
      p_guests: priced.guests,
      p_name: name,
      p_email: email,
      p_phone: text(body.phone, 40),
      p_message: text(body.message, 2000),
      p_lang: lang,
      p_amount_total: priced.total,
      p_hold_minutes: HOLD_MINUTES,
      p_client_ip: clientIp(request),
    })
    if (!created.ok || !created.id) {
      const status = created.error === 'rate_limited' ? 429 : 409
      return Response.json({ error: created.error ?? 'unavailable' }, { status })
    }
    bookingId = created.id
  } catch (error) {
    console.error('checkout: create_pending_booking', error)
    return Response.json({ error: 'server' }, { status: 502 })
  }

  const origin = new URL(request.url).origin
  const suiteName = SUITE_NAMES[priced.suite][lang]
  const stay = lang === 'fr'
    ? `Du ${longDate(priced.arrival, lang)} au ${longDate(priced.departure, lang)} · ${priced.nights} nuit${priced.nights > 1 ? 's' : ''} · ${priced.guests} pers.`
    : `${longDate(priced.arrival, lang)} to ${longDate(priced.departure, lang)} · ${priced.nights} night${priced.nights > 1 ? 's' : ''} · ${priced.guests} guest${priced.guests > 1 ? 's' : ''}`
  const metadata = { booking_id: bookingId, suite: priced.suite, arrival: priced.arrival, departure: priced.departure, guests: String(priced.guests) }

  try {
    const session = await getStripe().checkout.sessions.create({
      mode: 'payment',
      locale: lang,
      // Carte bancaire uniquement (Apple Pay et Google Pay inclus) : paiement immédiat, sans prélèvement différé.
      payment_method_types: ['card'],
      customer_email: email,
      client_reference_id: bookingId,
      metadata,
      payment_intent_data: { metadata, description: `${suiteName} — ${priced.arrival} → ${priced.departure}` },
      expires_at: Math.floor(Date.now() / 1000) + SESSION_MINUTES * 60,
      line_items: [
        { quantity: 1, price_data: { currency: CURRENCY, unit_amount: priced.lodging, product_data: { name: `${suiteName} — Château Latour Ségur`, description: stay } } },
        ...(priced.touristTax > 0 ? [{ quantity: 1, price_data: { currency: CURRENCY, unit_amount: priced.touristTax, product_data: { name: lang === 'fr' ? 'Taxe de séjour' : 'Tourist tax' } } }] : []),
      ],
      success_url: `${origin}${RETURN_PATHS[lang].confirmed}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}${RETURN_PATHS[lang].cancelled}?booking=${bookingId}`,
    }, { idempotencyKey: `checkout-${bookingId}` })
    if (!session.url) throw new Error('Session Stripe sans adresse')
    // En cas d'échec ici, mark_booking_paid rattache quand même la session au paiement.
    await rpc('attach_stripe_session', { p_id: bookingId, p_session_id: session.id }).catch((cause) => console.error('checkout: attach', cause))
    return Response.json({ url: session.url })
  } catch (error) {
    console.error('checkout: stripe', error)
    await rpc('release_booking', { p_id: bookingId, p_status: 'cancelled' }).catch((cause) => console.error('checkout: release', cause))
    return Response.json({ error: 'payment' }, { status: 502 })
  }
}
