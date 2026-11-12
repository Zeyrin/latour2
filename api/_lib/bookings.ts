// Étapes communes au webhook Stripe, à la page de confirmation et à la synchronisation Beds24.

import type Stripe from 'stripe'
import { rpc, type BookingRow, type PaidResult } from './supabase.js'

// BEDS24_API_BASE : uniquement pour les tests (faux Beds24 local).
const BEDS24_API = process.env.BEDS24_API_BASE || 'https://api.beds24.com/v2'

/** roomId Beds24 → identifiant de la suite sur le site (utilisé aussi par api/sync-beds24.ts). */
export const ROOMS: Record<number, string> = {
  130293: 'terre',
  130319: 'eau',
  130316: 'metal',
  130318: 'feu',
  130321: 'bois',
}
const ROOM_OF_SUITE = Object.fromEntries(Object.entries(ROOMS).map(([id, suite]) => [suite, Number(id)]))

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Identifiant de réservation porté par une session Checkout, ou null si elle ne vient pas de ce site. */
export function bookingIdOf(session: Stripe.Checkout.Session) {
  const id = session.client_reference_id || session.metadata?.booking_id
  return id && UUID.test(id) ? id : null
}

export const isBookingId = (value: string) => UUID.test(value)

function paymentIntentId(session: Stripe.Checkout.Session) {
  const pi = session.payment_intent
  return typeof pi === 'string' ? pi : pi?.id ?? null
}

/**
 * Enregistre le paiement d'une session Checkout terminée. Idempotent : le webhook et la page
 * de confirmation peuvent l'appeler tous les deux, dans n'importe quel ordre.
 */
export async function recordPaidSession(session: Stripe.Checkout.Session): Promise<PaidResult> {
  const bookingId = bookingIdOf(session)
  if (!bookingId || session.payment_status !== 'paid') return { status: 'not_found' }
  const result = await rpc<PaidResult>('mark_booking_paid', {
    p_id: bookingId,
    p_session_id: session.id,
    p_payment_intent: paymentIntentId(session),
    p_amount_total: session.amount_total,
  })
  if (result.changed && result.booking) {
    if (result.status === 'paid') await pushToBeds24(result.booking)
    else console.error('booking conflict: paiement reçu mais réservation impossible, à rembourser', { id: result.booking.id, reason: result.reason })
  }
  return result
}

/** L'envoi vers Beds24 est actif si un jeton d'écriture est configuré. */
function beds24WriteConfigured() {
  return Boolean(process.env.BEDS24_REFRESH_TOKEN || process.env.BEDS24_WRITE_TOKEN)
}

let cachedToken: { token: string; expires: number } | null = null

/**
 * Jeton Beds24 avec le droit d'écriture des réservations.
 * Beds24 ne donne que des jetons de lecture en « long life token » : pour écrire, on garde un refresh token
 * (BEDS24_REFRESH_TOKEN, obtenu une fois à partir d'un code d'invitation) et on en tire un jeton valable 24 h.
 * Le refresh token expire après 30 jours sans usage : la tâche quotidienne api/sync-beds24 le maintient actif.
 * BEDS24_WRITE_TOKEN (jeton fixe) reste accepté, surtout pour les tests.
 */
async function beds24WriteToken() {
  const refreshToken = process.env.BEDS24_REFRESH_TOKEN
  if (!refreshToken) return process.env.BEDS24_WRITE_TOKEN || null
  if (cachedToken && cachedToken.expires > Date.now()) return cachedToken.token
  const response = await fetch(`${BEDS24_API}/authentication/token`, { headers: { refreshToken } })
  const body = await response.json().catch(() => null) as { token?: string; expiresIn?: number } | null
  if (!response.ok || !body?.token) throw new Error(`Beds24 jeton ${response.status} : ${JSON.stringify(body)}`)
  cachedToken = { token: body.token, expires: Date.now() + Math.max(60, (body.expiresIn ?? 3600) - 300) * 1000 }
  return body.token
}

async function beds24Request(payload: Record<string, unknown>) {
  const token = await beds24WriteToken()
  if (!token) throw new Error('Jeton Beds24 absent')
  const response = await fetch(`${BEDS24_API}/bookings`, {
    method: 'POST',
    headers: { token, 'Content-Type': 'application/json' },
    body: JSON.stringify([payload]),
    signal: AbortSignal.timeout(10_000),
  })
  const body = await response.json().catch(() => null) as { success?: boolean; new?: { id?: number }; errors?: unknown }[] | null
  const first = Array.isArray(body) ? body[0] : null
  // Jeton refusé : on en redemandera un au prochain essai.
  if (response.status === 401) cachedToken = null
  if (!response.ok || !first?.success) throw new Error(`Beds24 ${response.status} : ${JSON.stringify(first?.errors ?? body)}`)
  return first
}

/**
 * Crée la réservation payée dans Beds24, pour fermer les dates sur les autres canaux (Airbnb, Booking…).
 * Nécessite BEDS24_REFRESH_TOKEN (voir beds24WriteToken).
 * Un échec n'annule rien : il est noté dans bookings.beds24_error et retenté par api/sync-beds24.
 */
export async function pushToBeds24(booking: BookingRow) {
  if (!beds24WriteConfigured() || booking.beds24_booking_id) return
  let beds24Id: string | null = null
  let error: string | null = null
  try {
    const [firstName, ...rest] = booking.name.split(/\s+/)
    const created = await beds24Request({
      roomId: ROOM_OF_SUITE[booking.suite],
      status: 'confirmed',
      arrival: booking.arrival,
      departure: booking.departure,
      numAdult: booking.guests,
      firstName: rest.length ? firstName : '',
      lastName: rest.length ? rest.join(' ') : firstName,
      email: booking.email,
      mobile: booking.phone ?? '',
      lang: booking.lang,
      price: booking.amount_total / 100,
      referer: 'Site du château (Stripe)',
      apiReference: booking.id,
      comments: booking.message ?? '',
    })
    beds24Id = created.new?.id ? String(created.new.id) : null
    if (!beds24Id) throw new Error('Beds24 n’a pas renvoyé d’identifiant')
  } catch (cause) {
    error = cause instanceof Error ? cause.message.slice(0, 500) : 'Erreur inconnue'
    console.error('beds24 push', booking.id, error)
  }
  await rpc('set_beds24_result', { p_id: booking.id, p_beds24_id: beds24Id, p_error: error }).catch((cause) => console.error('beds24 result', cause))
}

/** Annule dans Beds24 une réservation remboursée, pour rouvrir les dates sur tous les canaux. */
export async function cancelInBeds24(booking: BookingRow) {
  if (!beds24WriteConfigured() || !booking.beds24_booking_id) return
  try {
    await beds24Request({ id: Number(booking.beds24_booking_id), status: 'cancelled' })
  } catch (cause) {
    const error = cause instanceof Error ? cause.message.slice(0, 500) : 'Erreur inconnue'
    console.error('beds24 cancel', booking.id, error)
    await rpc('set_beds24_result', { p_id: booking.id, p_beds24_id: null, p_error: `annulation : ${error}` }).catch(() => undefined)
  }
}

/** Retente l'envoi vers Beds24 des réservations payées qui n'y sont pas encore (appelé par api/sync-beds24). */
export async function retryBeds24Pushes() {
  if (!beds24WriteConfigured()) return 0
  // Demander un jeton chaque jour garde le refresh token actif (il expire après 30 jours sans usage).
  await beds24WriteToken()
  const pending = await rpc<BookingRow[] | null>('bookings_missing_in_beds24', {})
  for (const booking of pending ?? []) await pushToBeds24(booking)
  return pending?.length ?? 0
}
