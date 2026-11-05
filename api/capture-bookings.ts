// Tâche planifiée (vercel.json) : débite les réservations autorisées depuis plus de AUTO_CONFIRM_HOURS
// que le château n'a ni validées ni refusées. Une autorisation de carte expire au bout de 7 jours :
// cette tâche quotidienne débite donc chaque réservation entre 24 h et 48 h après le paiement.
// Pour refuser une réservation avant : Stripe → Paiements → le paiement « Non capturé » → Annuler.
// Pour la valider plus tôt : même écran → Capturer.

import { isCron, stripe, supabase, updateBooking, type BookingRow } from './_lib/server.js'

const AUTO_CONFIRM_HOURS = 24

async function capture(request: Request) {
  if (!isCron(request)) return Response.json({ error: 'Non autorisé' }, { status: 401 })
  if (!process.env.STRIPE_SECRET_KEY) return Response.json({ error: 'Stripe non configuré' }, { status: 500 })

  const before = new Date(Date.now() - AUTO_CONFIRM_HOURS * 3_600_000).toISOString()
  const rows = await (await supabase(`bookings?status=eq.authorized&beds24_booking_id=not.is.null&created_at=lt.${encodeURIComponent(before)}&select=id,payment_intent_id`)).json() as Pick<BookingRow, 'id' | 'payment_intent_id'>[]
  const results: { id: string; ok: boolean }[] = []
  for (const row of rows) {
    try {
      const intent = await stripe().paymentIntents.retrieve(row.payment_intent_id as string)
      if (intent.status === 'requires_capture') await stripe().paymentIntents.capture(intent.id)
      else if (intent.status === 'canceled') await updateBooking(row.id, { status: 'expired' })
      // Le statut confirmed (et Beds24) est mis à jour par le webhook payment_intent.succeeded.
      results.push({ id: row.id, ok: true })
    } catch (error) {
      console.error('capture-bookings', row.id, error)
      results.push({ id: row.id, ok: false })
    }
  }
  return Response.json({ ok: results.every((result) => result.ok), results })
}

export const GET = capture
export const POST = capture
