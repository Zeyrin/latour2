// Page « Gérer ma réservation » (lien secret ?t=… envoyé dans l'e-mail et affiché sur la page de confirmation).
//   GET  ?t=…                                  état de la réservation + dates indisponibles pour une modification
//   POST { t, action: 'cancel' }               annulation avec remboursement intégral (24 h après le paiement)
//   POST { t, action: 'change', suite, arrival, departure, guests }
//                                              modification : appliquée tout de suite, ou { url } pour payer la différence
//   POST { t, action: 'confirm', session }     retour de Stripe après le paiement d'un supplément
// Voir api/_lib/manage.ts pour les règles. Ne renvoie aucune coordonnée du client.

import { applyPaidChange, cancelByGuest, changeByGuest, isChangeSession, isManageToken, manageView } from './_lib/manage.js'
import { getStripe, stripeConfigured } from './_lib/stripe.js'
import { rpc, select, supabaseConfig, type BookingRow } from './_lib/supabase.js'

const noStore = { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' }
const MAX_BODY = 5_000

interface Block { resource: string; start_date: string; end_date: string }

/** Dates indisponibles, sans les nuits de cette réservation (elle peut les garder en partie). */
function withoutOwnStay(blocks: Block[], booking: BookingRow) {
  const result: Block[] = []
  for (const block of blocks) {
    if (block.resource !== booking.suite || block.end_date <= booking.arrival || block.start_date >= booking.departure) {
      result.push(block)
      continue
    }
    if (block.start_date < booking.arrival) result.push({ ...block, end_date: booking.arrival })
    if (block.end_date > booking.departure) result.push({ ...block, start_date: booking.departure })
  }
  return result
}

async function bookingByToken(token: string) {
  return rpc<BookingRow | null>('get_booking_by_token', { p_token: token })
}

const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: noStore })

const STATUS: Record<string, number> = { not_found: 404, deadline: 409, status: 409, unavailable: 409, stale: 409, same: 400, refund: 502, payment: 502 }

export async function GET(request: Request) {
  if (!stripeConfigured() || !supabaseConfig()) return reply({ error: 'disabled' }, 503)
  const token = new URL(request.url).searchParams.get('t')
  if (!isManageToken(token)) return reply({ error: 'not_found' }, 404)
  try {
    const booking = await bookingByToken(token)
    if (!booking) return reply({ error: 'not_found' }, 404)
    const view = manageView(booking)
    const blocks = view.can_manage ? withoutOwnStay(await select<Block[]>('availability?select=resource,start_date,end_date'), booking) : []
    return reply({ booking: view, blocks })
  } catch (error) {
    console.error('manage-booking', error)
    return reply({ error: 'server' }, 502)
  }
}

export async function POST(request: Request) {
  if (!stripeConfigured() || !supabaseConfig()) return reply({ error: 'disabled' }, 503)
  const raw = await request.text()
  if (raw.length > MAX_BODY) return reply({ error: 'invalid' }, 413)
  let body: Record<string, unknown>
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error()
    body = parsed as Record<string, unknown>
  } catch {
    return reply({ error: 'invalid' }, 400)
  }
  if (!isManageToken(body.t)) return reply({ error: 'not_found' }, 404)

  try {
    const booking = await bookingByToken(body.t)
    if (!booking) return reply({ error: 'not_found' }, 404)

    if (body.action === 'cancel') {
      const result = await cancelByGuest(booking)
      if ('error' in result) return reply({ error: result.error }, STATUS[result.error] ?? 400)
      return reply({ booking: manageView(result.booking) })
    }

    if (body.action === 'change') {
      const result = await changeByGuest(booking, { suite: body.suite, arrival: body.arrival, departure: body.departure, guests: body.guests }, new URL(request.url).origin)
      if ('error' in result) return reply({ error: result.error }, STATUS[result.error] ?? 400)
      if ('url' in result) return reply({ url: result.url })
      return reply({ booking: manageView(result.booking) })
    }

    if (body.action === 'confirm') {
      const sessionId = typeof body.session === 'string' ? body.session : ''
      if (!/^cs_[A-Za-z0-9_]{10,250}$/.test(sessionId)) return reply({ error: 'invalid' }, 400)
      const session = await getStripe().checkout.sessions.retrieve(sessionId)
      if (!isChangeSession(session) || session.metadata?.booking_id !== booking.id) return reply({ error: 'not_found' }, 404)
      const result = await applyPaidChange(session)
      const fresh = await bookingByToken(body.t)
      return reply({ change: result.status, booking: fresh ? manageView(fresh) : null })
    }

    return reply({ error: 'invalid' }, 400)
  } catch (error) {
    console.error('manage-booking', body.action, error)
    return reply({ error: 'server' }, 502)
  }
}
