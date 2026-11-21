// Accès à Supabase côté serveur (clé service_role) : uniquement des appels de fonctions SQL (supabase/schema.sql).

export function supabaseConfig() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  return url && key ? { url, key } : null
}

export async function rpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
  const config = supabaseConfig()
  if (!config) throw new Error('Variables Supabase manquantes')
  const response = await fetch(`${config.url}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { apikey: config.key, Authorization: `Bearer ${config.key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  })
  if (!response.ok) throw new Error(`Supabase ${name} ${response.status} : ${await response.text()}`)
  const text = await response.text()
  return (text ? JSON.parse(text) : null) as T
}

/** Lecture d'une vue (GET /rest/v1/<chemin>), par exemple `availability?select=…`. */
export async function select<T>(path: string): Promise<T> {
  const config = supabaseConfig()
  if (!config) throw new Error('Variables Supabase manquantes')
  const response = await fetch(`${config.url}/rest/v1/${path}`, { headers: { apikey: config.key, Authorization: `Bearer ${config.key}` } })
  if (!response.ok) throw new Error(`Supabase ${path} ${response.status} : ${await response.text()}`)
  return await response.json() as T
}

export interface BookingRow {
  id: string
  status: 'pending' | 'paid' | 'expired' | 'cancelled' | 'refunded' | 'conflict'
  suite: string
  arrival: string
  departure: string
  nights: number
  guests: number
  name: string
  email: string
  phone: string | null
  message: string | null
  lang: 'fr' | 'en'
  amount_total: number
  currency: string
  hold_until: string
  stripe_session_id: string | null
  stripe_payment_intent: string | null
  paid_at: string | null
  beds24_booking_id: string | null
  /** Petit-déjeuner choisi (compris dans amount_total). Absent avant la mise à jour de supabase/schema.sql. */
  breakfast?: boolean
  /** Le client souhaite des soins ou des renseignements sur le spa : le château le rappelle. */
  spa_callback?: boolean
  /** Secret du lien « Gérer ma réservation » (voir api/manage-booking.ts). */
  manage_token?: string
  /** Paiements Stripe (renvoyés complétés par get_booking_by_token). */
  payments?: Payment[]
  amount_refunded?: number
  change_count?: number
  changed_at?: string | null
  cancelled_at?: string | null
}

/** Un paiement Stripe d'une réservation, en centimes : le paiement initial ou un supplément après modification. */
export interface Payment {
  pi: string
  amount: number
  refunded: number
  session?: string
}

/** Remboursement à faire dans Stripe (calculé par apply_booking_change). */
export interface RefundOrder {
  pi: string
  amount: number
  key: string
}

export interface PaidResult {
  status: BookingRow['status'] | 'not_found'
  changed?: boolean
  booking?: BookingRow
  reason?: string
}
