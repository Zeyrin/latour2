// Webhook Stripe (Dashboard → Développeurs → Webhooks → URL : /api/stripe-webhook).
// Événements à cocher : checkout.session.completed, payment_intent.succeeded, payment_intent.canceled.
//
//   checkout.session.completed  paiement autorisé → revérifie la disponibilité, crée la réservation
//                               Beds24 (statut « new ») et la ligne bookings (statut authorized)
//   payment_intent.succeeded    montant débité (validation du château ou capture automatique) → confirmed
//   payment_intent.canceled     refus du château (« Annuler » dans Stripe) ou autorisation expirée
//                               → réservation Beds24 annulée, dates libérées, rien n'est débité

import type Stripe from 'stripe'
import { createBeds24Booking, findBooking, setBeds24Status, stayPrice, stripe, supabase, syncBeds24, updateBooking, type BookingRow, type Suite } from './_lib/server.js'

async function resync() {
  try { await syncBeds24() } catch (error) { console.error('stripe-webhook sync', error) }
}

async function completed(session: Stripe.Checkout.Session) {
  const meta = session.metadata ?? {}
  const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id
  if (!paymentIntentId) throw new Error('payment_intent absent')
  const suite = meta.suite as Suite
  const guest = { name: meta.name, email: meta.email, phone: meta.phone || null, guests: Number(meta.guests), message: meta.message || null }
  const price = Number(meta.price)

  // Idempotence : Stripe peut renvoyer le même événement.
  let booking = await findBooking('stripe_session_id', session.id)
  if (booking && (booking.beds24_booking_id || booking.status !== 'authorized')) return
  if (!booking) {
    const row = {
      stripe_session_id: session.id, payment_intent_id: paymentIntentId, suite, arrival: meta.arrival, departure: meta.departure,
      guests: guest.guests, name: guest.name, email: guest.email, phone: guest.phone, message: guest.message,
      amount_cents: session.amount_total ?? Math.round(price * 100), status: 'authorized',
    }
    booking = (await (await supabase('bookings', { method: 'POST', body: JSON.stringify(row), headers: { Prefer: 'return=representation' } })).json() as BookingRow[])[0]
  }

  const intent = await stripe().paymentIntents.retrieve(paymentIntentId)
  if (intent.status !== 'requires_capture') return

  // Quelqu'un a pu réserver les mêmes dates pendant le paiement : on libère alors l'autorisation.
  if (!await stayPrice(suite, meta.arrival, meta.departure, guest.guests)) {
    await stripe().paymentIntents.cancel(paymentIntentId, { cancellation_reason: 'abandoned' })
    await updateBooking(booking.id, { status: 'unavailable' })
    return
  }

  const note = `Paiement Stripe autorisé (${(booking.amount_cents / 100).toFixed(2)} €), en attente de validation : ${paymentIntentId}`
  const beds24Id = await createBeds24Booking(suite, meta.arrival, meta.departure, guest, price, note)
  await updateBooking(booking.id, { beds24_booking_id: beds24Id })
  await resync()
}

async function succeeded(intent: Stripe.PaymentIntent) {
  const booking = await findBooking('payment_intent_id', intent.id)
  if (!booking || booking.status === 'confirmed') return
  await updateBooking(booking.id, { status: 'confirmed' })
  if (booking.beds24_booking_id) await setBeds24Status(booking.beds24_booking_id, 'confirmed')
}

async function canceled(intent: Stripe.PaymentIntent) {
  const booking = await findBooking('payment_intent_id', intent.id)
  if (!booking || booking.status !== 'authorized') return
  await updateBooking(booking.id, { status: intent.cancellation_reason === 'automatic' ? 'expired' : 'refused' })
  if (booking.beds24_booking_id) {
    await setBeds24Status(booking.beds24_booking_id, 'cancelled')
    await resync()
  }
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret || !process.env.STRIPE_SECRET_KEY) return Response.json({ error: 'Webhook non configuré' }, { status: 500 })

  let event: Stripe.Event
  try {
    event = await stripe().webhooks.constructEventAsync(await request.text(), request.headers.get('stripe-signature') ?? '', secret)
  } catch {
    return Response.json({ error: 'Signature invalide' }, { status: 400 })
  }

  try {
    if (event.type === 'checkout.session.completed') await completed(event.data.object)
    else if (event.type === 'payment_intent.succeeded') await succeeded(event.data.object)
    else if (event.type === 'payment_intent.canceled') await canceled(event.data.object)
    return Response.json({ received: true })
  } catch (error) {
    // 500 : Stripe renverra l'événement plus tard (le traitement est idempotent).
    console.error('stripe-webhook', event.type, error)
    return Response.json({ error: 'Traitement impossible' }, { status: 500 })
  }
}
