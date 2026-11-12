// Synchronise les disponibilités des suites depuis Beds24 vers Supabase (table availability_blocks).
// Déclenchée par la tâche planifiée Vercel (vercel.json) et, en option, par le webhook de réservation Beds24.
//
// Variables d'environnement (Vercel → Settings → Environment Variables) :
//   BEDS24_TOKEN               long life token Beds24 (lecture, droit inventory)
//   SUPABASE_URL               URL du projet (sinon VITE_SUPABASE_URL)
//   SUPABASE_SERVICE_ROLE_KEY  clé service_role, uniquement côté serveur
//   CRON_SECRET                secret partagé : Vercel l'envoie dans Authorization, le webhook dans ?key=

import { timingSafeEqual } from 'node:crypto'
import { ROOMS, retryBeds24Pushes } from './_lib/bookings.js'

export { ROOMS }

const BEDS24_API = 'https://api.beds24.com/v2'
const DAYS_AHEAD = 540

interface RoomAvailability {
  roomId: number
  availability: Record<string, boolean>
}

export interface Block {
  resource: string
  start_date: string
  end_date: string
}

function addDays(iso: string, days: number) {
  const date = new Date(`${iso}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
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

async function fetchAvailability(token: string): Promise<RoomAvailability[]> {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date())
  const query = new URLSearchParams({ startDate: today, endDate: addDays(today, DAYS_AHEAD) })
  for (const id of Object.keys(ROOMS)) query.append('roomId', id)
  const rooms: RoomAvailability[] = []
  for (let page = 1; page <= 20; page++) {
    if (page > 1) query.set('page', String(page))
    const response = await fetch(`${BEDS24_API}/inventory/rooms/availability?${query}`, { headers: { token } })
    const body = await response.json() as { success?: boolean; error?: string; data?: RoomAvailability[]; pages?: { nextPageExists?: boolean } }
    if (!response.ok || body.success === false || !Array.isArray(body.data)) throw new Error(`Beds24 ${response.status} : ${body.error ?? 'réponse inattendue'}`)
    rooms.push(...body.data)
    if (!body.pages?.nextPageExists) return rooms
  }
  return rooms
}

/** Comparaison en temps constant, pour ne pas laisser deviner le secret. */
function sameSecret(value: string | null, secret: string) {
  if (!value) return false
  const a = Buffer.from(value)
  const b = Buffer.from(secret)
  return a.length === b.length && timingSafeEqual(a, b)
}

async function sync(request: Request) {
  const secret = process.env.CRON_SECRET
  const key = new URL(request.url).searchParams.get('key')
  if (!secret || (!sameSecret(request.headers.get('authorization'), `Bearer ${secret}`) && !sameSecret(key, secret))) {
    return Response.json({ error: 'Non autorisé' }, { status: 401 })
  }
  const token = process.env.BEDS24_TOKEN
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!token || !supabaseUrl || !serviceKey) return Response.json({ error: 'Variables d’environnement manquantes' }, { status: 500 })

  try {
    // D'abord les réservations payées sur le site qui ne sont pas encore dans Beds24.
    const retried = await retryBeds24Pushes().catch((error) => { console.error('sync-beds24 retry', error); return 0 })
    const rooms = await fetchAvailability(token)
    // Ne rien effacer si Beds24 ne renvoie aucune des suites attendues.
    if (!rooms.some((room) => ROOMS[room.roomId])) throw new Error('Beds24 n’a renvoyé aucune des suites attendues')
    const blocks = toBlocks(rooms)
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/replace_beds24_blocks`, {
      method: 'POST',
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocks }),
    })
    if (!response.ok) throw new Error(`Supabase ${response.status} : ${await response.text()}`)
    return Response.json({ ok: true, rooms: rooms.length, blocks: blocks.length, retried })
  } catch (error) {
    console.error('sync-beds24', error)
    return Response.json({ error: error instanceof Error ? error.message : 'Erreur inconnue' }, { status: 502 })
  }
}

export const GET = sync
export const POST = sync
