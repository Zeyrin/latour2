// Vérifie que Supabase répond comme le site l'attend : lecture des disponibilités et enregistrement d'une demande.
// Usage : VITE_SUPABASE_URL=... VITE_SUPABASE_ANON_KEY=... node scripts/check-supabase.mjs
// Une demande de test (nom « TEST — vérification du site ») est ajoutée : la supprimer ensuite dans le Table Editor.

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_ANON_KEY
if (!url || !key) {
  console.error('VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY sont requis.')
  process.exit(1)
}
const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }
let failed = false

const availability = await fetch(`${url}/rest/v1/availability?select=resource,start_date,end_date`, { headers })
if (availability.ok) console.log(`OK  disponibilités : ${(await availability.json()).length} période(s) à venir`)
else { failed = true; console.error(`ÉCHEC disponibilités : ${availability.status} ${await availability.text()}`) }

const insert = await fetch(`${url}/rest/v1/booking_requests`, {
  method: 'POST',
  headers: { ...headers, Prefer: 'return=minimal' },
  body: JSON.stringify({ name: 'TEST — vérification du site', email: 'test@example.com', universe: 'suites', suite: 'eau', guests: 2, message: 'Demande de test, à supprimer.' }),
})
if (insert.ok) console.log('OK  demande enregistrée dans booking_requests')
else { failed = true; console.error(`ÉCHEC demande : ${insert.status} ${await insert.text()}`) }

process.exit(failed ? 1 : 0)
