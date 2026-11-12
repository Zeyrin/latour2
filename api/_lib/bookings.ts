// Étapes communes au webhook Stripe et à la page de confirmation.

import type Stripe from 'stripe'
import { rpc, type BookingRow, type PaidResult } from './supabase.js'

const BEDS24_API = 'https://api.beds24.com/v2'

/** roomId Beds24 de chaque suite (même table que api/sync-beds24.ts). */
const BEDS24_ROOMS: Record<string, number> = {
  terre: 130293,
  eau: 130319,
  metal: 130316,
  feu: 130318,
  bois: 130321,
}

function paymentIntentId(session: Stripe.Checkout.Session) {
  const pi = session.payment_intent
  return typeof pi === 'string' ? pi : pi?.id ?? null
}

/**
 * Enregistre le paiement d'une session Checkout terminée. Idempotent : le webhook et la page
 * de confirmation peuvent l'appeler tous les deux, dans n'importe quel ordre.
 */
export async function recordPaidSession(session: Stripe.Checkout.Session): Promise<PaidResult> {
  const bookingId = session.client_reference_id || session.metadata?.booking_id
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

/**
 * Crée la réservation payée dans Beds24, pour fermer les dates sur les autres canaux (Airbnb, Booking…).
 * Nécessite BEDS24_WRITE_TOKEN (long life token avec le droit d'écriture des réservations).
 * Un échec n'annule rien : il est noté dans bookings.beds24_error et dans les journaux.
 */
export async function pushToBeds24(booking: BookingRow) {
  const token = process.env.BEDS24_WRITE_TOKEN
  if (!token) return
  let beds24Id: string | null = null
  let error: string | null = null
  try {
    const [firstName, ...rest] = booking.name.split(/\s+/)
    const response = await fetch(`${BEDS24_API}/bookings`, {
      method: 'POST',
      headers: { token, 'Content-Type': 'application/json' },
      body: JSON.stringify([{
        roomId: BEDS24_ROOMS[booking.suite],
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
      }]),
    })
    const body = await response.json().catch(() => null) as { success?: boolean; new?: { id?: number }; errors?: unknown }[] | null
    const first = Array.isArray(body) ? body[0] : null
    if (!response.ok || !first?.success) throw new Error(`Beds24 ${response.status} : ${JSON.stringify(first?.errors ?? body)}`)
    beds24Id = first.new?.id ? String(first.new.id) : null
  } catch (cause) {
    error = cause instanceof Error ? cause.message.slice(0, 500) : 'Erreur inconnue'
    console.error('beds24 push', booking.id, error)
  }
  try {
    await rpc('set_beds24_result', { p_id: booking.id, p_beds24_id: beds24Id, p_error: error })
  } catch (cause) {
    console.error('beds24 result', cause)
  }
}
