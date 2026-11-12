// État d'une réservation pour les pages de retour de Stripe.
//   GET ?session_id=cs_…  page de confirmation : vérifie le paiement auprès de Stripe (sans attendre le webhook)
//   POST { booking }      page d'annulation : le client a quitté le paiement, on libère ses dates
// Ne renvoie aucune coordonnée du client.

import { bookingIdOf, isBookingId, recordPaidSession } from './_lib/bookings.js'
import { getStripe, stripeConfigured } from './_lib/stripe.js'
import { rpc, supabaseConfig, type BookingRow } from './_lib/supabase.js'

const noStore = { 'Cache-Control': 'no-store' }

function publicView(booking: BookingRow) {
  const { status, suite, arrival, departure, nights, guests, amount_total, currency } = booking
  return { status, suite, arrival, departure, nights, guests, amount_total, currency }
}

export async function GET(request: Request) {
  if (!stripeConfigured() || !supabaseConfig()) return Response.json({ error: 'disabled' }, { status: 503, headers: noStore })
  const sessionId = new URL(request.url).searchParams.get('session_id') ?? ''
  if (!/^cs_[A-Za-z0-9_]{10,250}$/.test(sessionId)) return Response.json({ error: 'invalid' }, { status: 400, headers: noStore })
  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId)
    const bookingId = bookingIdOf(session)
    if (!bookingId) return Response.json({ error: 'not_found' }, { status: 404, headers: noStore })
    const paid = session.payment_status === 'paid' ? await recordPaidSession(session) : null
    const booking = paid?.booking ?? await rpc<BookingRow | null>('get_booking', { p_id: bookingId })
    if (!booking || (booking.stripe_session_id && booking.stripe_session_id !== session.id)) return Response.json({ error: 'not_found' }, { status: 404, headers: noStore })
    return Response.json(publicView(booking), { headers: noStore })
  } catch (error) {
    const missing = (error as { statusCode?: number }).statusCode === 404
    if (!missing) console.error('booking-status', error)
    return Response.json({ error: missing ? 'not_found' : 'server' }, { status: missing ? 404 : 502, headers: noStore })
  }
}

export async function POST(request: Request) {
  if (!stripeConfigured() || !supabaseConfig()) return Response.json({ error: 'disabled' }, { status: 503, headers: noStore })
  let bookingId = ''
  try {
    const body = await request.json() as { booking?: unknown }
    bookingId = typeof body.booking === 'string' ? body.booking : ''
  } catch { /* corps invalide */ }
  if (!isBookingId(bookingId)) return Response.json({ error: 'invalid' }, { status: 400, headers: noStore })
  try {
    const booking = await rpc<BookingRow | null>('get_booking', { p_id: bookingId })
    if (!booking) return Response.json({ error: 'not_found' }, { status: 404, headers: noStore })
    if (booking.status === 'pending' && booking.stripe_session_id) {
      // Ferme la page de paiement : elle ne pourra plus être réglée une fois les dates libérées.
      const stripe = getStripe()
      const session = await stripe.checkout.sessions.retrieve(booking.stripe_session_id)
      if (session.status === 'open') await stripe.checkout.sessions.expire(session.id)
      else if (session.payment_status === 'paid') await recordPaidSession(session)
    }
    // release_booking ne touche qu'à une réservation encore en attente et renvoie son état actuel (paid, conflict…).
    const status = booking.status === 'pending' ? await rpc<string>('release_booking', { p_id: bookingId, p_status: 'cancelled' }) : booking.status
    return Response.json({ ...publicView(booking), status }, { headers: noStore })
  } catch (error) {
    console.error('booking-status cancel', error)
    return Response.json({ error: 'server' }, { status: 502, headers: noStore })
  }
}
