// Test du paiement avec le VRAI Stripe en mode test (cartes de test, aucun débit réel).
//   - vraie base PostgreSQL locale (supabase/schema.sql), derrière la même petite passerelle « Supabase » que booking-e2e ;
//   - vraies sessions Stripe Checkout, payées dans la vraie page checkout.stripe.com avec Playwright ;
//   - les webhooks sont les vrais événements Stripe (lus avec GET /v1/events), renvoyés signés à api/stripe-webhook :
//     un serveur local n'est pas joignable par Stripe, c'est ce que ferait `stripe listen`.
//
//   npm run build
//   STRIPE_SECRET_KEY=sk_test_… DATABASE_URL=postgres://postgres@localhost:5432/latour_test npx tsx scripts/booking-stripe-live.mts
//
// ⚠️ La base indiquée est vidée : n'utiliser qu'une base de test locale. Refuse les clés sk_live_.

import { createServer, type IncomingMessage } from 'node:http'
import { readFile } from 'node:fs/promises'
import { existsSync, statSync } from 'node:fs'
import { extname, join, normalize } from 'node:path'
import pg from 'pg'
import Stripe from 'stripe'
import { chromium, type Page } from '@playwright/test'

const DATABASE_URL = process.env.DATABASE_URL
const KEY = process.env.STRIPE_SECRET_KEY
if (!DATABASE_URL) throw new Error('DATABASE_URL manquante (base PostgreSQL locale de test)')
if (!KEY?.startsWith('sk_test_')) throw new Error('STRIPE_SECRET_KEY doit être une clé de test (sk_test_…)')

const APP_PORT = 4191
const SUPABASE_PORT = 4192
const APP = `http://127.0.0.1:${APP_PORT}`
const WEBHOOK_SECRET = 'whsec_test_live_local'
process.env.SUPABASE_URL = `http://127.0.0.1:${SUPABASE_PORT}`
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test'
process.env.STRIPE_WEBHOOK_SECRET = WEBHOOK_SECRET
delete process.env.STRIPE_API_BASE
delete process.env.BEDS24_WRITE_TOKEN

const db = new pg.Pool({ connectionString: DATABASE_URL })
await db.query(await readFile('supabase/schema.sql', 'utf8'))
const handlers: Record<string, Record<string, (request: Request) => Response | Promise<Response>>> = {
  checkout: await import('../api/checkout.ts'),
  'stripe-webhook': await import('../api/stripe-webhook.ts'),
  'booking-status': await import('../api/booking-status.ts'),
  availability: await import('../api/availability.ts'),
}
const { parisToday, quote } = await import('../src/lib/pricing.ts')
const stripe = new Stripe(KEY)

function readBody(request: IncomingMessage) {
  return new Promise<string>((resolve, reject) => {
    let data = ''
    request.on('data', (chunk) => { data += chunk })
    request.on('end', () => resolve(data))
    request.on('error', reject)
  })
}
let checks = 0
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`ÉCHEC : ${message}`)
  checks++
  console.log(`  ✓ ${message}`)
}
function addDays(iso: string, days: number) {
  const date = new Date(`${iso}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// Passerelle « Supabase » (comme scripts/booking-e2e.mts).
const supabase = createServer(async (request, response) => {
  try {
    if (request.headers.authorization !== `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`) { response.writeHead(401); return response.end() }
    const url = new URL(request.url!, 'http://x')
    if (request.method === 'GET' && url.pathname === '/rest/v1/availability') {
      const { rows } = await db.query(`select resource, start_date::text, end_date::text from public.availability`)
      response.writeHead(200, { 'Content-Type': 'application/json' })
      return response.end(JSON.stringify(rows))
    }
    const match = /^\/rest\/v1\/rpc\/([a-z_0-9]+)$/.exec(url.pathname)
    if (request.method !== 'POST' || !match) { response.writeHead(404); return response.end() }
    const args = JSON.parse(await readBody(request) || '{}') as Record<string, unknown>
    const keys = Object.keys(args)
    if (keys.some((key) => !/^p_[a-z_0-9]+$/.test(key))) throw new Error('argument invalide')
    const { rows: info } = await db.query(`select prorettype = 'void'::regtype as is_void from pg_proc where proname = $1 and pronamespace = 'public'::regnamespace`, [match[1]])
    const call = `public.${match[1]}(${keys.map((key, index) => `${key} => $${index + 1}`).join(', ')})`
    const values = keys.map((key) => args[key])
    if (info[0]?.is_void) { await db.query(`select ${call}`, values); response.writeHead(204); return response.end() }
    const { rows } = await db.query(`select to_jsonb(${call}) as r`, values)
    response.writeHead(200, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify(rows[0].r))
  } catch (error) {
    response.writeHead(400, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify({ message: (error as Error).message }))
  }
})

const types: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.png': 'image/png' }
const app = createServer(async (request, response) => {
  const url = new URL(request.url!, APP)
  const api = /^\/api\/([a-z0-9-]+)$/.exec(url.pathname)
  try {
    if (api) {
      const handler = handlers[api[1]]?.[request.method!]
      if (!handler) { response.writeHead(405); return response.end() }
      const body = ['GET', 'HEAD'].includes(request.method!) ? undefined : await readBody(request)
      const result = await handler(new Request(url, { method: request.method, headers: request.headers as Record<string, string>, body }))
      response.writeHead(result.status, Object.fromEntries(result.headers))
      return response.end(Buffer.from(await result.arrayBuffer()))
    }
    const clean = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.(\/|\\|$))+/, '')
    let file = join(process.cwd(), 'dist', clean === '/' ? 'index.html' : clean)
    const isFile = (path: string) => existsSync(path) && statSync(path).isFile()
    if (!isFile(file) && isFile(`${file}.html`)) file = `${file}.html`
    if (!isFile(file)) file = join(process.cwd(), 'dist', 'index.html')
    response.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' })
    response.end(await readFile(file))
  } catch (error) {
    console.error(error)
    response.writeHead(500)
    response.end('Erreur')
  }
})
await Promise.all([
  new Promise<void>((resolve) => supabase.listen(SUPABASE_PORT, '127.0.0.1', resolve)),
  new Promise<void>((resolve) => app.listen(APP_PORT, '127.0.0.1', resolve)),
])

// ─── Relais des vrais événements Stripe ─────────────────────────────────────
const startedAt = Math.floor(Date.now() / 1000) - 5
const forwarded = new Set<string>()
/** Attend un vrai événement Stripe concernant `sessionOrIntent` puis le transmet, signé, au webhook du site. */
async function forwardEvent(type: string, matches: (object: any) => boolean, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const events = await stripe.events.list({ type, created: { gte: startedAt }, limit: 20 })
    const event = events.data.find((e) => !forwarded.has(e.id) && matches(e.data.object))
    if (event) {
      forwarded.add(event.id)
      const payload = JSON.stringify(event)
      const header = await stripe.webhooks.generateTestHeaderStringAsync({ payload, secret: WEBHOOK_SECRET })
      const response = await fetch(`${APP}/api/stripe-webhook`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Stripe-Signature': header }, body: payload })
      return { event, status: response.status }
    }
    await sleep(1500)
  }
  throw new Error(`Aucun événement ${type} reçu de Stripe`)
}

async function bookings() {
  return (await db.query('select * from public.bookings order by created_at')).rows
}
const today = parisToday()
const guest = { name: 'Camille Test', email: 'camille.test@example.com', phone: '0600000000', lang: 'fr' }

async function startCheckout(suite: string, start: number, nights: number, extra: Record<string, unknown> = {}) {
  const response = await fetch(`${APP}/api/checkout`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-real-ip': `198.51.100.${start}` }, body: JSON.stringify({ ...guest, suite, arrival: addDays(today, start), departure: addDays(today, start + nights), guests: 2, ...extra }) })
  const body = await response.json() as { url?: string; error?: string }
  if (!body.url) throw new Error(`checkout ${response.status} ${JSON.stringify(body)}`)
  const { rows } = await db.query('select * from public.bookings where suite = $1 order by created_at desc limit 1', [suite])
  return { url: body.url, row: rows[0] }
}

/** Remplit la vraie page Stripe Checkout avec une carte de test. */
async function payOnStripe(page: Page, card: string) {
  await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30_000 })
  const cardRadio = page.locator('[data-testid="card-accordion-item-button"]')
  if (await cardRadio.isVisible({ timeout: 8000 }).catch(() => false)) await cardRadio.click()
  await page.locator('#cardNumber').fill(card)
  await page.locator('#cardExpiry').fill('12 / 34')
  await page.locator('#cardCvc').fill('123')
  await page.locator('#billingName').fill('Camille Test')
  const country = page.locator('#billingCountry')
  if (await country.isVisible().catch(() => false)) await country.selectOption('FR')
  await page.locator('[data-testid="hosted-payment-submit-button"]').click()
}

const browser = await chromium.launch()
let failed = false
try {
  await db.query('delete from public.bookings; delete from public.availability_blocks;')
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'fr-FR' })

  console.log('\n1. Paiement accepté (carte 4242 4242 4242 4242) avec la vraie page Stripe')
  {
    const page = await context.newPage()
    await page.goto(`${APP}/`, { waitUntil: 'networkidle' })
    await page.locator('.header-cta').click()
    await page.locator('input[name="universe"][value="suites"]').check()
    await page.locator('label.suite-choice', { hasText: 'La Suite Métal' }).click()
    await page.waitForFunction(() => document.querySelectorAll('.calendar-day:not([aria-disabled])').length > 10)
    const free = page.locator('.calendar-day:not([aria-disabled])')
    const arrival = await free.nth(10).getAttribute('data-date') as string
    await free.nth(10).click()
    await page.locator(`.calendar-day[data-date="${addDays(arrival, 2)}"]`).click()
    const expected = quote('metal', arrival, addDays(arrival, 2), 2, today)
    assert(!('error' in expected) && expected.total === 79000, 'Suite Métal, 2 nuits : 790 € (2 × 395 €)')
    await page.locator('input[name="name"]').fill(guest.name)
    await page.locator('input[name="email"]').fill(guest.email)
    await page.locator('input[name="consent"]').check()
    await page.locator('.form-submit').click()
    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30_000 })
    const [row] = await bookings()
    const session = await stripe.checkout.sessions.retrieve(row.stripe_session_id, { expand: ['line_items'] })
    assert(session.amount_total === 79000 && session.currency === 'eur', 'Session Stripe réelle créée au bon montant (790,00 €)')
    assert(session.livemode === false, 'Session en mode test')
    assert(session.custom_text?.submit?.message?.includes('24 h'), 'Conditions d’annulation affichées sur la page Stripe')
    console.log('    ', session.line_items?.data.map((item) => `${item.description} : ${item.amount_total / 100} €`).join(' | '))
    await page.waitForLoadState('networkidle').catch(() => {})
    await page.screenshot({ path: 'artifacts/stripe-live-checkout.png' })
    await payOnStripe(page, '4242 4242 4242 4242')
    await page.waitForURL(/\/reservation\/confirmation\?session_id=cs_test_/, { timeout: 60_000 })
    assert(true, 'Retour sur la page de confirmation du site après paiement')
    const { status } = await forwardEvent('checkout.session.completed', (s) => s.id === row.stripe_session_id)
    assert(status === 200, 'Vrai événement checkout.session.completed accepté par le webhook (200)')
    await page.getByRole('heading', { name: /Merci/ }).waitFor({ timeout: 20_000 })
    await page.screenshot({ path: 'artifacts/stripe-live-confirmed.png' })
    const paid = (await bookings())[0]
    assert(paid.status === 'paid' && paid.stripe_payment_intent?.startsWith('pi_') && paid.amount_total === 79000, 'Réservation « paid » avec le vrai PaymentIntent')
    const intent = await stripe.paymentIntents.retrieve(paid.stripe_payment_intent)
    assert(intent.status === 'succeeded' && intent.amount_received === 79000, 'Stripe confirme 790 € encaissés (test)')
    await page.close()

    console.log('\n2. Remboursement depuis Stripe : dates libérées')
    await stripe.refunds.create({ payment_intent: paid.stripe_payment_intent })
    const refund = await forwardEvent('charge.refunded', (charge) => charge.payment_intent === paid.stripe_payment_intent)
    assert(refund.status === 200, 'Vrai événement charge.refunded accepté (200)')
    const after = (await bookings())[0]
    assert(after.status === 'refunded', 'Réservation passée à « refunded »')
  }

  console.log('\n3. Carte refusée (4000 0000 0000 0002)')
  {
    const { url, row } = await startCheckout('eau', 40, 2)
    const page = await context.newPage()
    await page.goto(url)
    await payOnStripe(page, '4000 0000 0000 0002')
    await page.getByText(/refusée|declined/i).first().waitFor({ timeout: 30_000 })
    await page.screenshot({ path: 'artifacts/stripe-live-declined.png' })
    assert(page.url().includes('checkout.stripe.com'), 'Le client reste sur Stripe avec le message « carte refusée »')
    const still = (await db.query('select status from public.bookings where id = $1', [row.id])).rows[0]
    assert(still.status === 'pending', 'Réservation toujours en attente (aucune confirmation sans paiement)')
    await payOnStripe(page, '4242 4242 4242 4242')
    await page.waitForURL(/\/reservation\/confirmation/, { timeout: 60_000 })
    await forwardEvent('checkout.session.completed', (s) => s.id === row.stripe_session_id)
    assert((await db.query('select status from public.bookings where id = $1', [row.id])).rows[0].status === 'paid', 'Nouvel essai avec une bonne carte : réservation payée')
    await page.close()
  }

  console.log('\n4. Authentification 3D Secure (4000 0025 0000 3155)')
  {
    const { url, row } = await startCheckout('bois', 45, 2)
    const page = await context.newPage()
    await page.goto(url)
    await payOnStripe(page, '4000 0025 0000 3155')
    // La fenêtre 3D Secure de test est imbriquée dans plusieurs iframes : on cherche le bouton dans toutes.
    const deadline = Date.now() + 30_000
    let authorized = false
    while (!authorized && Date.now() < deadline) {
      for (const frame of page.frames()) {
        const button = frame.locator('#test-source-authorize-3ds')
        if (await button.count().catch(() => 0)) { await button.click(); authorized = true; break }
      }
      if (!authorized) await sleep(1000)
    }
    assert(authorized, 'Fenêtre 3D Secure affichée et validée')
    await page.waitForURL(/\/reservation\/confirmation/, { timeout: 60_000 })
    await forwardEvent('checkout.session.completed', (s) => s.id === row.stripe_session_id)
    assert((await db.query('select status, amount_total from public.bookings where id = $1', [row.id])).rows[0].status === 'paid', 'Paiement 3D Secure validé : réservation payée (390 €)')
    await page.close()
  }

  console.log('\n5. Client qui revient sur le site sans payer')
  {
    const { url, row } = await startCheckout('feu', 50, 2)
    const page = await context.newPage()
    await page.goto(url)
    await page.waitForURL(/checkout\.stripe\.com/)
    await page.locator('a[href*="/reservation/annulation"], [data-testid="business-link"]').first().click()
    await page.waitForURL(/\/reservation\/annulation\?booking=/, { timeout: 30_000 })
    await sleep(1000)
    const session = await stripe.checkout.sessions.retrieve(row.stripe_session_id)
    assert(session.status === 'expired', 'Session Stripe fermée par le site')
    const expired = await forwardEvent('checkout.session.expired', (s) => s.id === row.stripe_session_id)
    assert(expired.status === 200, 'Vrai événement checkout.session.expired accepté (200)')
    const cancelled = (await db.query('select status from public.bookings where id = $1', [row.id])).rows[0]
    assert(['cancelled', 'expired'].includes(cancelled.status), 'Dates libérées')
    await page.close()
  }
} catch (error) {
  failed = true
  console.error(error)
} finally {
  await browser.close()
  supabase.close()
  app.close()
  await db.end()
}
console.log(failed ? `\nÉchec après ${checks} vérifications.` : `\n${checks} vérifications réussies avec le vrai Stripe (mode test).`)
process.exit(failed ? 1 : 0)
