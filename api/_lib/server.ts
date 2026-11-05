// Outils partagés par les fonctions api/* (le dossier _lib n'est pas exposé comme route par Vercel).
//
// Variables d'environnement (Vercel → Settings → Environment Variables) :
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  base de données (service_role, uniquement côté serveur)
//   BEDS24_TOKEN                              long life token Beds24 (inventory : lecture ; bookings : lecture + écriture)
//   CRON_SECRET                               secret des tâches planifiées et du webhook Beds24
//   STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY clés Stripe (sk_test_… / pk_test_… pour les essais)
//   STRIPE_WEBHOOK_SECRET                     secret de signature du webhook Stripe (whsec_…)

import { timingSafeEqual } from 'node:crypto'
import Stripe from 'stripe'

export const SUITES = ['terre', 'eau', 'metal', 'feu', 'bois'] as const
export type Suite = (typeof SUITES)[number]

/** roomId Beds24 → identifiant de la suite sur le site. */
export const ROOMS: Record<number, Suite> = {
  130293: 'terre',
  130319: 'eau',
  130316: 'metal',
  130318: 'feu',
  130321: 'bois',
}
export const ROOM_OF = Object.fromEntries(Object.entries(ROOMS).map(([id, suite]) => [suite, Number(id)])) as Record<Suite, number>

const BEDS24_API = 'https://api.beds24.com/v2'
const DAYS_AHEAD = 540

export function addDays(iso: string, days: number) {
  const date = new Date(`${iso}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export function todayInParis() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date())
}

/** Comparaison en temps constant, pour ne pas laisser deviner un secret. */
export function sameSecret(value: string | null, secret: string) {
  if (!value) return false
  const a = Buffer.from(value)
  const b = Buffer.from(secret)
  return a.length === b.length && timingSafeEqual(a, b)
}

/** Tâche planifiée Vercel (Authorization: Bearer CRON_SECRET) ou appel manuel avec ?key=CRON_SECRET. */
export function isCron(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return sameSecret(request.headers.get('authorization'), `Bearer ${secret}`) || sameSecret(new URL(request.url).searchParams.get('key'), secret)
}

// ─── Supabase (API REST, clé service_role) ──────────────────────────────────

export function supabaseConfigured() {
  return Boolean((process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL) && process.env.SUPABASE_SERVICE_ROLE_KEY)
}

export async function supabase(path: string, init: RequestInit = {}) {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Variables Supabase manquantes')
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...init.headers },
  })
  if (!response.ok) throw new Error(`Supabase ${response.status} : ${await response.text()}`)
  return response
}

// ─── Beds24 ─────────────────────────────────────────────────────────────────

async function beds24(path: string, init: RequestInit = {}) {
  const token = process.env.BEDS24_TOKEN
  if (!token) throw new Error('BEDS24_TOKEN manquant')
  const response = await fetch(`${BEDS24_API}${path}`, { ...init, headers: { token, 'Content-Type': 'application/json', ...init.headers } })
  const body = await response.json().catch(() => null) as { success?: boolean; error?: string; data?: unknown } | unknown[] | null
  if (!response.ok || (body && !Array.isArray(body) && body.success === false)) {
    throw new Error(`Beds24 ${response.status} : ${body && !Array.isArray(body) ? body.error ?? 'réponse inattendue' : 'réponse inattendue'}`)
  }
  return body
}

interface RoomAvailability {
  roomId: number
  availability: Record<string, boolean>
}

export interface Block {
  resource: string
  start_date: string
  end_date: string
}

/** Regroupe les nuits non disponibles (false) en périodes [start_date, end_date). */
export function toBlocks(rooms: RoomAvailability[]): Block[] {
  const blocks: Block[] = []
  for (const room of rooms) {
    const resource = ROOMS[room.roomId]
    if (!resource) continue
    let current: Block | null = null
    for (const day of Object.keys(room.availability).sort()) {
      const booked = room.availability[day] === false
      if (booked && current && current.end_date === day) current.end_date = addDays(day, 1)
      else if (booked) blocks.push(current = { resource, start_date: day, end_date: addDays(day, 1) })
      else current = null
    }
  }
  return blocks
}

async function fetchAvailability(): Promise<RoomAvailability[]> {
  const today = todayInParis()
  const query = new URLSearchParams({ startDate: today, endDate: addDays(today, DAYS_AHEAD) })
  for (const id of Object.keys(ROOMS)) query.append('roomId', id)
  const rooms: RoomAvailability[] = []
  for (let page = 1; page <= 20; page++) {
    if (page > 1) query.set('page', String(page))
    const body = await beds24(`/inventory/rooms/availability?${query}`) as { data?: RoomAvailability[]; pages?: { nextPageExists?: boolean } }
    if (!Array.isArray(body.data)) throw new Error('Beds24 : réponse inattendue')
    rooms.push(...body.data)
    if (!body.pages?.nextPageExists) return rooms
  }
  return rooms
}

/** Copie les disponibilités Beds24 dans Supabase (remplacement atomique des lignes source = 'beds24'). */
export async function syncBeds24() {
  const rooms = await fetchAvailability()
  // Ne rien effacer si Beds24 ne renvoie aucune des suites attendues.
  if (!rooms.some((room) => ROOMS[room.roomId])) throw new Error('Beds24 n’a renvoyé aucune des suites attendues')
  const blocks = toBlocks(rooms)
  await supabase('rpc/replace_beds24_blocks', { method: 'POST', body: JSON.stringify({ blocks }) })
  return { rooms: rooms.length, blocks: blocks.length }
}

/**
 * Prix total du séjour selon Beds24 (première offre disponible), ou null si la suite n'est pas
 * réservable pour ces dates et ce nombre de personnes.
 */
export async function stayPrice(suite: Suite, arrival: string, departure: string, guests: number) {
  const query = new URLSearchParams({ roomId: String(ROOM_OF[suite]), arrival, departure, numAdults: String(guests) })
  const body = await beds24(`/inventory/rooms/offers?${query}`) as { data?: { roomId: number; offers?: { price?: number; unitsAvailable?: number }[] }[] }
  const offers = body.data?.find((room) => room.roomId === ROOM_OF[suite])?.offers ?? []
  const offer = offers.find((item) => typeof item.price === 'number' && item.price > 0 && (item.unitsAvailable ?? 1) > 0)
  return offer ? offer.price as number : null
}

export interface Guest {
  name: string
  email: string
  phone: string | null
  guests: number
  message: string | null
}

/** Crée la réservation dans Beds24 (bloque les dates) et renvoie son identifiant. */
export async function createBeds24Booking(suite: Suite, arrival: string, departure: string, guest: Guest, price: number, note: string) {
  const parts = guest.name.trim().split(/\s+/)
  const lastName = parts.length > 1 ? parts.pop() as string : parts[0]
  const body = await beds24('/bookings', {
    method: 'POST',
    body: JSON.stringify([{
      roomId: ROOM_OF[suite],
      status: 'new',
      arrival,
      departure,
      numAdult: guest.guests,
      firstName: parts.length ? parts.join(' ') : '',
      lastName,
      email: guest.email,
      phone: guest.phone ?? '',
      price,
      notes: [note, guest.message].filter(Boolean).join('\n\n'),
      referer: 'Site internet (Stripe)',
    }]),
  }) as { success?: boolean; new?: { id?: number }; id?: number; errors?: unknown }[]
  const result = Array.isArray(body) ? body[0] : undefined
  const id = result?.new?.id ?? result?.id
  if (!result?.success || !id) throw new Error(`Beds24 : réservation non créée ${JSON.stringify(result?.errors ?? result)}`)
  return id
}

export async function setBeds24Status(id: number, status: 'confirmed' | 'cancelled') {
  await beds24('/bookings', { method: 'POST', body: JSON.stringify([{ id, status }]) })
}

// ─── Stripe ─────────────────────────────────────────────────────────────────

export function stripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PUBLISHABLE_KEY)
}

let client: Stripe | null = null
export function stripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY manquant')
  return client ??= new Stripe(key)
}

// ─── Réservations payées (table bookings) ───────────────────────────────────

export type BookingStatus = 'authorized' | 'confirmed' | 'refused' | 'expired' | 'unavailable'

export interface BookingRow {
  id: string
  created_at: string
  stripe_session_id: string
  payment_intent_id: string | null
  suite: Suite
  arrival: string
  departure: string
  guests: number
  name: string
  email: string
  phone: string | null
  message: string | null
  amount_cents: number
  status: BookingStatus
  beds24_booking_id: number | null
}

export async function findBooking(column: 'stripe_session_id' | 'payment_intent_id', value: string) {
  const rows = await (await supabase(`bookings?${column}=eq.${encodeURIComponent(value)}&limit=1`)).json() as BookingRow[]
  return rows[0] ?? null
}

export async function updateBooking(id: string, fields: Partial<BookingRow>) {
  await supabase(`bookings?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify(fields), headers: { Prefer: 'return=minimal' } })
}
