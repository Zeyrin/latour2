// Webhook Stripe : confirme les réservations payées et libère les dates des paiements abandonnés ou remboursés.
// Dans Stripe → Développeurs → Webhooks, ajouter l'adresse https://<site>/api/stripe-webhook avec les événements
//   checkout.session.completed, checkout.session.expired, charge.refunded
// puis copier le « secret de signature » (whsec_…) dans STRIPE_WEBHOOK_SECRET.

import type Stripe from 'stripe'
import { bookingIdOf, cancelInBeds24, recordPaidSession } from './_lib/bookings.js'
import { getStripe } from './_lib/stripe.js'
import { rpc, type BookingRow } from './_lib/supabase.js'

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret || !process.env.STRIPE_SECRET_KEY) return Response.json({ error: 'Webhook non configuré' }, { status: 500 })

  const signature = request.headers.get('stripe-signature')
  const payload = await request.text()
  let event: Stripe.Event
  try {
    if (!signature) throw new Error('Signature absente')
    event = await getStripe().webhooks.constructEventAsync(payload, signature, secret)
  } catch (error) {
    console.warn('stripe-webhook: signature refusée', error instanceof Error ? error.message : error)
    return Response.json({ error: 'Signature invalide' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object
        if (session.payment_status === 'paid') {
          const result = await recordPaidSession(session)
          console.log('stripe-webhook', event.type, session.id, result.status)
        }
        break
      }
      case 'checkout.session.expired':
      case 'checkout.session.async_payment_failed': {
        const session = event.data.object
        const bookingId = bookingIdOf(session)
        if (bookingId) await rpc('release_booking', { p_id: bookingId, p_status: 'expired' })
        break
      }
      case 'charge.refunded': {
        const charge = event.data.object
        const pi = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id
        // Remboursement partiel : la réservation reste valable.
        if (pi && charge.refunded) {
          const refunded = await rpc<BookingRow | null>('mark_booking_refunded', { p_payment_intent: pi })
          if (refunded) await cancelInBeds24(refunded)
        }
        break
      }
      default:
        break
    }
  } catch (error) {
    // 500 : Stripe renverra l'événement plus tard (jusqu'à 3 jours).
    console.error('stripe-webhook', event.type, error)
    return Response.json({ error: 'Traitement impossible' }, { status: 500 })
  }
  return Response.json({ received: true })
}
