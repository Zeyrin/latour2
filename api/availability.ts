// Périodes indisponibles pour le calendrier du site (vue publique `availability` : dates à venir, sans la note).
// Lue côté serveur avec les variables de api/sync-beds24 : le navigateur n'a besoin d'aucune clé Supabase.

export async function GET() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) return Response.json({ error: 'Variables d’environnement manquantes' }, { status: 500 })

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/availability?select=resource,start_date,end_date`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    })
    if (!response.ok) throw new Error(`Supabase ${response.status} : ${await response.text()}`)
    const blocks = await response.json() as { resource: string; start_date: string; end_date: string }[]
    return Response.json(blocks, {
      headers: {
        // Navigateur : toujours redemander (sinon stale-while-revalidate montre des dates déjà réservées).
        'Cache-Control': 'no-cache',
        // CDN Vercel : cache court ; la réservation reste de toute façon vérifiée par api/checkout.
        'CDN-Cache-Control': 'public, max-age=20, stale-while-revalidate=40',
      },
    })
  } catch (error) {
    console.error('availability', error)
    return Response.json({ error: 'Disponibilités indisponibles' }, { status: 502 })
  }
}
