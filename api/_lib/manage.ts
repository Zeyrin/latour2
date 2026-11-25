// Annulation et modification d'une réservation par le client, pendant 24 h après le paiement.
// Utilisé par api/manage-booking.ts (page « Gérer ma réservation ») et api/stripe-webhook.ts (supplément payé).
//
// Choix retenus :
//   - annulation : remboursement intégral automatique dans Stripe, dates libérées sur le site et dans Beds24 ;
//   - modification (suite, dates, personnes) sur la même réservation, au tarif du site :
//       nouveau prix plus bas ou égal → appliquée tout de suite, la différence est remboursée ;
//       nouveau prix plus élevé      → le client paie la différence sur Stripe, la modification est appliquée au paiement.
//     Si les dates ont été prises pendant ce paiement, le supplément est remboursé automatiquement et l'ancienne
//     réservation reste valable : le client ne perd jamais sa réservation d'origine.
//   - le délai de 24 h part du paiement initial ; une modification ne le prolonge pas.
//
// Clé Stripe : en plus de « Checkout Sessions : écriture », il faut « Refunds : écriture » (remboursements).

import type Stripe from 'stripe'
import { CURRENCY, breakfastIncluded, manageDeadline, parisToday, quote, type QuoteError } from '../../src/lib/pricing.js'
import { cancelInBeds24, paymentIntentId, updateInBeds24 } from './bookings.js'
import { sendGuestManageEmail, sendOwnerManageAlert } from './email.js'
import { getStripe } from './stripe.js'
import { rpc, type BookingRow, type Payment, type RefundOrder } from './supabase.js'

/** Mêmes chemins que paths.manageBooking dans src/lib/i18n.ts. */
export const MANAGE_PATHS = { fr: '/reservation/gerer', en: '/en/booking/manage' } as const
const SESSION_MINUTES = 31

/** Petit-déjeuner payé en option (pas celui offert avec la suite Eau ou Bois), repris dans le prix d'une modification. */
const paidBreakfast = (booking: BookingRow) => Boolean(booking.breakfast) && !breakfastIncluded(booking.suite)

export const isManageToken = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{32,128}$/.test(value)

export function canManage(booking: BookingRow, now = new Date()) {
  return booking.status === 'paid' && !booking.cancelled_at && Boolean(booking.paid_at) && now < manageDeadline(booking.paid_at!)
}

/** Ce que voit le client sur la page « Gérer ma réservation » (aucune coordonnée). */
export function manageView(booking: BookingRow) {
  const { status, suite, arrival, departure, nights, guests, amount_total, currency, lang, cancelled_at } = booking
  return {
    status, suite, arrival, departure, nights, guests, amount_total, currency, lang,
    breakfast: Boolean(booking.breakfast),
    amount_refunded: booking.amount_refunded ?? 0,
    cancelled: Boolean(cancelled_at),
    deadline: booking.paid_at ? manageDeadline(booking.paid_at).toISOString() : null,
    can_manage: canManage(booking),
  }
}

const SUITE_LABELS: Record<string, Record<'fr' | 'en', string>> = {
  terre: { fr: 'La Suite Terre', en: 'The Earth Suite' },
  eau: { fr: 'La Suite Eau', en: 'The Water Suite' },
  metal: { fr: 'La Suite Métal', en: 'The Metal Suite' },
  feu: { fr: 'La Suite Feu', en: 'The Fire Suite' },
  bois: { fr: 'Le Cottage Bois', en: 'The Wood Cottage' },
}

async function refund(pi: string, amount: number, key: string, bookingId: string) {
  await getStripe().refunds.create(
    { payment_intent: pi, amount, reason: 'requested_by_customer', metadata: { booking_id: bookingId } },
    { idempotencyKey: key },
  )
}

/** Fait les remboursements demandés ; renvoie ceux qui ont échoué (à faire à la main, le château est prévenu). */
async function runRefunds(orders: RefundOrder[], bookingId: string) {
  const failed: RefundOrder[] = []
  for (const order of orders) {
    try {
      await refund(order.pi, order.amount, order.key, bookingId)
    } catch (cause) {
      console.error('refund', bookingId, order.pi, cause instanceof Error ? cause.message : cause)
      failed.push(order)
    }
  }
  return failed
}

const sum = (orders: { amount: number }[]) => orders.reduce((total, order) => total + order.amount, 0)

export type ManageError = 'not_found' | 'deadline' | 'status' | 'unavailable' | 'same' | 'stale' | 'refund' | 'payment' | QuoteError

/** Annulation par le client : remboursement intégral, puis dates libérées (site et Beds24). */
export async function cancelByGuest(booking: BookingRow): Promise<{ booking: BookingRow } | { error: ManageError }> {
  if (booking.cancelled_at) return { booking }
  if (!canManage(booking)) return { error: booking.status === 'paid' ? 'deadline' : 'status' }
  const orders = (booking.payments ?? [])
    .map((payment: Payment) => ({ pi: payment.pi, amount: payment.amount - payment.refunded, key: `cancel/${booking.id}/${payment.pi}` }))
    .filter((order) => order.amount > 0)
  const failed = await runRefunds(orders, booking.id)
  // Aucun remboursement n'a pu être fait (clé Stripe sans le droit « Refunds », panne) : rien ne change.
  if (orders.length && failed.length === orders.length) return { error: 'refund' }
  const result = await rpc<{ changed: boolean; booking: BookingRow } | null>('guest_cancel_booking', { p_id: booking.id })
  if (!result) return { error: 'not_found' }
  if (result.changed) {
    await cancelInBeds24(result.booking)
    const refunded = sum(orders) - sum(failed)
    await Promise.all([
      sendGuestManageEmail(result.booking, { kind: 'cancelled', refunded }),
      sendOwnerManageAlert(result.booking, { kind: 'cancelled', refunded, failedRefunds: sum(failed) }),
    ])
  }
  return { booking: result.booking }
}

export interface ChangeRequest {
  suite: unknown
  arrival: unknown
  departure: unknown
  guests: unknown
}

type Previous = Pick<BookingRow, 'suite' | 'arrival' | 'departure' | 'guests' | 'amount_total'>
const previousOf = ({ suite, arrival, departure, guests, amount_total }: BookingRow): Previous => ({ suite, arrival, departure, guests, amount_total })

/** Après une modification enregistrée : remboursement éventuel, Beds24, e-mails. */
async function afterChange(booking: BookingRow, previous: Previous, refunds: RefundOrder[], extraPaid: number) {
  const failed = await runRefunds(refunds, booking.id)
  const beds24Ok = await updateInBeds24(booking)
  const refunded = sum(refunds) - sum(failed)
  await Promise.all([
    sendGuestManageEmail(booking, { kind: 'changed', refunded, extraPaid, previous }),
    sendOwnerManageAlert(booking, { kind: 'changed', refunded, extraPaid, previous, failedRefunds: sum(failed), beds24Failed: !beds24Ok }),
  ])
}

/**
 * Modification demandée par le client. Renvoie la réservation modifiée,
 * ou l'adresse de paiement Stripe quand le nouveau prix est plus élevé.
 */
export async function changeByGuest(booking: BookingRow, change: ChangeRequest, origin: string):
  Promise<{ booking: BookingRow } | { url: string } | { error: ManageError }> {
  if (!canManage(booking)) return { error: booking.status === 'paid' && !booking.cancelled_at ? 'deadline' : 'status' }
  const priced = quote(change.suite, String(change.arrival ?? ''), String(change.departure ?? ''), Number(change.guests), parisToday(), { breakfast: paidBreakfast(booking) })
  if ('error' in priced) return { error: priced.error }
  if (priced.suite === booking.suite && priced.arrival === booking.arrival && priced.departure === booking.departure && priced.guests === booking.guests) return { error: 'same' }
  if (!await rpc<boolean>('change_available', { p_id: booking.id, p_suite: priced.suite, p_arrival: priced.arrival, p_departure: priced.departure })) return { error: 'unavailable' }

  const difference = priced.total - booking.amount_total
  if (difference <= 0) {
    const previous = previousOf(booking)
    const result = await rpc<{ ok: boolean; error?: ManageError; booking?: BookingRow; refunds?: RefundOrder[] }>('apply_booking_change', {
      p_id: booking.id, p_expected_amount: booking.amount_total, p_suite: priced.suite, p_arrival: priced.arrival, p_departure: priced.departure,
      p_nights: priced.nights, p_guests: priced.guests, p_amount_total: priced.total, p_payment: null,
    })
    if (!result.ok || !result.booking) return { error: result.error ?? 'status' }
    await afterChange(result.booking, previous, result.refunds ?? [], 0)
    return { booking: result.booking }
  }

  // Supplément : payé sur Stripe, la modification est appliquée au paiement (applyPaidChange).
  const lang = booking.lang === 'en' ? 'en' : 'fr'
  const fmt = (iso: string) => new Intl.DateTimeFormat(lang === 'fr' ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${iso}T12:00:00Z`))
  const stay = lang === 'fr'
    ? `Nouveau séjour : du ${fmt(priced.arrival)} au ${fmt(priced.departure)} · ${priced.nights} nuit${priced.nights > 1 ? 's' : ''} · ${priced.guests} pers.`
    : `New stay: ${fmt(priced.arrival)} to ${fmt(priced.departure)} · ${priced.nights} night${priced.nights > 1 ? 's' : ''} · ${priced.guests} guest${priced.guests > 1 ? 's' : ''}`
  const metadata = {
    kind: 'change', booking_id: booking.id, from_amount: String(booking.amount_total), amount_total: String(priced.total),
    suite: priced.suite, arrival: priced.arrival, departure: priced.departure, nights: String(priced.nights), guests: String(priced.guests),
  }
  const manageUrl = `${origin}${MANAGE_PATHS[lang]}?t=${booking.manage_token}`
  // Nouvelle session toutes les 10 minutes au plus pour la même demande (un double clic ne crée pas deux paiements).
  const slot = Math.floor(Date.now() / 600_000)
  try {
    const session = await getStripe().checkout.sessions.create({
      mode: 'payment',
      locale: lang,
      payment_method_types: ['card'],
      customer_email: booking.email,
      metadata,
      payment_intent_data: { metadata, description: `Modification ${SUITE_LABELS[priced.suite].fr} — ${priced.arrival} → ${priced.departure}` },
      expires_at: Math.floor(Date.now() / 1000) + SESSION_MINUTES * 60,
      line_items: [{
        quantity: 1,
        price_data: {
          currency: CURRENCY,
          unit_amount: difference,
          product_data: { name: `${lang === 'fr' ? 'Modification de votre séjour' : 'Change to your stay'} — ${SUITE_LABELS[priced.suite][lang]}`, description: stay },
        },
      }],
      success_url: `${manageUrl}&change={CHECKOUT_SESSION_ID}`,
      cancel_url: manageUrl,
    }, { idempotencyKey: `change/${booking.id}/${booking.change_count ?? 0}/${priced.suite}/${priced.arrival}/${priced.departure}/${priced.guests}/${slot}` })
    if (!session.url) throw new Error('Session Stripe sans adresse')
    return { url: session.url }
  } catch (error) {
    console.error('change: stripe', error)
    return { error: 'payment' }
  }
}

export const isChangeSession = (session: Stripe.Checkout.Session) => session.metadata?.kind === 'change'

/**
 * Supplément d'une modification payé : applique la modification. Idempotent (webhook et page de retour).
 * Si elle n'est plus possible (dates reprises entre-temps…), le supplément est remboursé et la réservation reste inchangée.
 */
export async function applyPaidChange(session: Stripe.Checkout.Session): Promise<{ status: 'changed' | 'refused' | 'unpaid' | 'not_found'; booking?: BookingRow; error?: string }> {
  const meta = session.metadata ?? {}
  const bookingId = meta.booking_id
  if (!isChangeSession(session) || !bookingId) return { status: 'not_found' }
  if (session.payment_status !== 'paid') return { status: 'unpaid' }
  const pi = paymentIntentId(session)
  const fromAmount = Number(meta.from_amount)
  const total = Number(meta.amount_total)
  const before = await rpc<BookingRow | null>('get_booking', { p_id: bookingId })
  if (!before || !pi) return { status: 'not_found' }
  const result = session.amount_total === total - fromAmount
    ? await rpc<{ ok: boolean; changed?: boolean; error?: string; booking?: BookingRow; refunds?: RefundOrder[] }>('apply_booking_change', {
      p_id: bookingId, p_expected_amount: fromAmount, p_suite: meta.suite, p_arrival: meta.arrival, p_departure: meta.departure,
      p_nights: Number(meta.nights), p_guests: Number(meta.guests), p_amount_total: total,
      p_payment: { pi, amount: session.amount_total, refunded: 0, session: session.id },
    })
    : { ok: false, error: 'amount_mismatch' }
  if (result.ok && result.booking) {
    if (result.changed) await afterChange(result.booking, previousOf(before), result.refunds ?? [], session.amount_total ?? 0)
    return { status: 'changed', booking: result.booking }
  }
  // Modification impossible : on rend le supplément, l'ancienne réservation reste valable.
  const failed = await runRefunds([{ pi, amount: session.amount_total ?? 0, key: `change-refused/${session.id}` }], bookingId)
  console.warn('change refused', bookingId, result.error)
  await sendOwnerManageAlert(before, {
    kind: 'refused', refunded: failed.length ? 0 : session.amount_total ?? 0, failedRefunds: failed.length ? session.amount_total ?? 0 : 0,
    sessionId: session.id, reason: result.error,
  })
  return { status: 'refused', booking: before, error: result.error }
}
