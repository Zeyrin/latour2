// Envoie un e-mail au château à chaque nouvelle demande de réservation.
// Appelée par le déclencheur notify_booking_request (supabase/schema.sql) avec { id } de la demande.
// Elle relit la demande avec la clé service_role et ne l'envoie qu'une fois (colonne notified_at) :
// un appel extérieur ne peut ni inventer une demande ni provoquer de doublon.
//
// Secrets (Supabase → Edge Functions → Secrets) :
//   RESEND_API_KEY  clé API Resend (obligatoire)
//   NOTIFY_TO       destinataire, par défaut contact@chateaulatoursegur.com
//   NOTIFY_FROM     expéditeur, par défaut onboarding@resend.dev (domaine à vérifier dans Resend pour le changer)

const labels: Record<string, string> = {
  suites: 'Suites', spa: 'Spa', evenements: 'Séminaires & événements',
  terre: 'Terre', eau: 'Eau', metal: 'Métal', feu: 'Feu', bois: 'Bois',
}

function frDate(value: string | null) {
  return value ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full' }).format(new Date(`${value}T12:00:00`)) : 'à convenir'
}

Deno.serve(async (request) => {
  const { id } = await request.json().catch(() => ({})) as { id?: string }
  if (!id) return Response.json({ error: 'id manquant' }, { status: 400 })

  const url = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) return Response.json({ error: 'RESEND_API_KEY manquant' }, { status: 500 })
  const db = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' }

  // Réserve la demande (notified_at) avant l'envoi : deux appels simultanés n'envoient qu'un e-mail.
  const claim = await fetch(`${url}/rest/v1/booking_requests?id=eq.${encodeURIComponent(id)}&notified_at=is.null`, {
    method: 'PATCH',
    headers: { ...db, Prefer: 'return=representation' },
    body: JSON.stringify({ notified_at: new Date().toISOString() }),
  })
  const [row] = claim.ok ? await claim.json() : []
  if (!row) return Response.json({ ok: true, skipped: true })

  const isSuite = row.universe === 'suites'
  const lines = [
    `Nouvelle demande reçue sur le site : ${labels[row.universe] ?? 'non précisé'}`,
    '',
    `Nom : ${row.name}`,
    `E-mail : ${row.email}`,
    `Téléphone : ${row.phone ?? '—'}`,
    `Personnes : ${row.guests ?? '—'}`,
    ...(isSuite
      ? [`Suite : ${row.suite ? labels[row.suite] : 'sans préférence'}`, `Arrivée : ${frDate(row.arrival)}`, `Départ : ${frDate(row.departure)}`]
      : [`Date souhaitée : ${frDate(row.arrival)}`]),
    '',
    'Message :',
    row.message ?? '—',
    '',
    'Répondre à cet e-mail écrit directement au client. Toutes les demandes : Supabase → Table Editor → booking_requests.',
  ]

  const sent = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: Deno.env.get('NOTIFY_FROM') ?? 'Site Château Latour Ségur <onboarding@resend.dev>',
      to: [Deno.env.get('NOTIFY_TO') ?? 'contact@chateaulatoursegur.com'],
      reply_to: row.email,
      subject: `Nouvelle demande — ${row.name}${isSuite && row.arrival ? `, arrivée le ${frDate(row.arrival)}` : ''}`,
      text: lines.join('\n'),
    }),
  })
  if (!sent.ok) {
    const error = await sent.text()
    // Libère la demande pour qu'un nouvel essai reste possible.
    await fetch(`${url}/rest/v1/booking_requests?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: db, body: JSON.stringify({ notified_at: null }) })
    console.error('resend', sent.status, error)
    return Response.json({ error }, { status: 502 })
  }
  return Response.json({ ok: true })
})
