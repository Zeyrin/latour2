// Synchronise les disponibilités des suites depuis Beds24 vers Supabase (table availability_blocks).
// Déclenchée par la tâche planifiée Vercel (vercel.json) et, en option, par le webhook de réservation Beds24
// (URL : /api/sync-beds24?key=CRON_SECRET). Variables : voir api/_lib/server.ts.

import { isCron, syncBeds24 } from './_lib/server.js'

async function sync(request: Request) {
  if (!isCron(request)) return Response.json({ error: 'Non autorisé' }, { status: 401 })
  if (!process.env.BEDS24_TOKEN || !(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL) || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return Response.json({ error: 'Variables d’environnement manquantes' }, { status: 500 })
  }
  try {
    return Response.json({ ok: true, ...await syncBeds24() })
  } catch (error) {
    console.error('sync-beds24', error)
    return Response.json({ error: error instanceof Error ? error.message : 'Erreur inconnue' }, { status: 502 })
  }
}

export const GET = sync
export const POST = sync
