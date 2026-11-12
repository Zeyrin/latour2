// Test de bout en bout de la réservation payante, sans réseau :
//   - vraie base PostgreSQL (supabase/schema.sql appliqué), derrière une petite passerelle qui imite les appels RPC de Supabase ;
//   - faux Stripe local qui garde l'état des sessions Checkout, sert une page de paiement et envoie des webhooks signés ;
//   - les vraies fonctions api/*.ts et le site construit (dist/), pilotés par Playwright.
//
//   npm run build
//   DATABASE_URL=postgres://postgres@localhost:5432/latour_test npx tsx scripts/booking-e2e.mts
//
// ⚠️ La base indiquée est vidée (tables bookings et availability_blocks) : n'utiliser qu'une base de test locale.

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { readFile } from 'node:fs/promises'
import { existsSync, statSync } from 'node:fs'
import { extname, join, normalize } from 'node:path'
import { randomBytes } from 'node:crypto'
import pg from 'pg'
import Stripe from 'stripe'
import { chromium, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) throw new Error('DATABASE_URL manquante (base PostgreSQL locale de test)')

const APP_PORT = 4181
const SUPABASE_PORT = 4182
const STRIPE_PORT = 4183
const BEDS24_PORT = 4184
const APP = `http://127.0.0.1:${APP_PORT}`
const WEBHOOK_SECRET = 'whsec_test_local'

process.env.SUPABASE_URL = `http://127.0.0.1:${SUPABASE_PORT}`
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test'
process.env.STRIPE_SECRET_KEY = 'sk_test_local'
process.env.STRIPE_WEBHOOK_SECRET = WEBHOOK_SECRET
process.env.STRIPE_API_BASE = `http://127.0.0.1:${STRIPE_PORT}`
process.env.BEDS24_API_BASE = `http://127.0.0.1:${BEDS24_PORT}`
delete process.env.BEDS24_WRITE_TOKEN

const db = new pg.Pool({ connectionString: DATABASE_URL })
await db.query(await readFile('supabase/schema.sql', 'utf8'))

// Fonctions serveur importées après la configuration de l'environnement.
const handlers: Record<string, Record<string, (request: Request) => Response | Promise<Response>>> = {
  checkout: await import('../api/checkout.ts'),
  'stripe-webhook': await import('../api/stripe-webhook.ts'),
  'booking-status': await import('../api/booking-status.ts'),
  availability: await import('../api/availability.ts'),
}
const { parisToday, quote, RATES } = await import('../src/lib/pricing.ts')
const { retryBeds24Pushes } = await import('../api/_lib/bookings.ts')

// ─── Faux Beds24 : POST /bookings ───────────────────────────────────────────
const beds24 = { calls: [] as Record<string, unknown>[], failNext: false, nextId: 9000 }
const beds24Server = createServer(async (request, response) => {
  const body = JSON.parse(await readBody(request) || '[]') as Record<string, unknown>[]
  if (request.headers.token !== 'beds24-write' || request.method !== 'POST' || request.url !== '/bookings') { response.writeHead(401); return response.end('[]') }
  beds24.calls.push(body[0])
  response.writeHead(200, { 'Content-Type': 'application/json' })
  if (beds24.failNext) { beds24.failNext = false; return response.end(JSON.stringify([{ success: false, errors: [{ message: 'Panne simulée' }] }])) }
  response.end(JSON.stringify([{ success: true, ...(body[0].id ? { modified: { id: body[0].id } } : { new: { id: beds24.nextId++ } }) }]))
})

// ─── Utilitaires ────────────────────────────────────────────────────────────

const results: string[] = []
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`ÉCHEC : ${message}`)
  results.push(message)
  console.log(`  ✓ ${message}`)
}

function readBody(request: IncomingMessage) {
  return new Promise<string>((resolve, reject) => {
    let data = ''
    request.on('data', (chunk) => { data += chunk })
    request.on('end', () => resolve(data))
    request.on('error', reject)
  })
}

function addDays(iso: string, days: number) {
  const date = new Date(`${iso}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

const today = parisToday()
async function accessible(page: Page, label: string) {
  const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
  if (scan.violations.length) console.log(label, JSON.stringify(scan.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) }))))
  assert(scan.violations.length === 0, `${label} : aucune erreur d’accessibilité détectée`)
}
/** Texte d'un élément, sans la casse CSS et avec des espaces ordinaires (les montants utilisent des espaces insécables). */
async function txt(locator: { textContent(): Promise<string | null> }) {
  return ((await locator.textContent()) ?? '').replace(/[\u00a0\u202f]/g, ' ').replace(/\s+/g, ' ').trim()
}

// ─── Passerelle « Supabase » : POST /rest/v1/rpc/<fonction>, GET /rest/v1/availability ─────

const signatures = new Map<string, { void: boolean }>()
async function functionInfo(name: string) {
  if (!signatures.has(name)) {
    const { rows } = await db.query(`select prorettype = 'void'::regtype as is_void from pg_proc where proname = $1 and pronamespace = 'public'::regnamespace`, [name])
    if (!rows.length) throw new Error(`fonction inconnue ${name}`)
    signatures.set(name, { void: rows[0].is_void })
  }
  return signatures.get(name)!
}

let supabaseCalls = 0
const supabase = createServer(async (request, response) => {
  supabaseCalls++
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
    const name = match[1]
    const args = JSON.parse(await readBody(request) || '{}') as Record<string, unknown>
    const keys = Object.keys(args)
    if (keys.some((key) => !/^p_[a-z_0-9]+$/.test(key))) throw new Error('argument invalide')
    const info = await functionInfo(name)
    const call = `public.${name}(${keys.map((key, index) => `${key} => $${index + 1}`).join(', ')})`
    const values = keys.map((key) => args[key])
    if (info.void) {
      await db.query(`select ${call}`, values)
      response.writeHead(204)
      return response.end()
    }
    const { rows } = await db.query(`select to_jsonb(${call}) as r`, values)
    response.writeHead(200, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify(rows[0].r))
  } catch (error) {
    response.writeHead(400, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify({ message: (error as Error).message }))
  }
})

// ─── Faux Stripe ────────────────────────────────────────────────────────────

/** Décode le format application/x-www-form-urlencoded de Stripe (clés imbriquées a[b][0][c]). */
function decodeForm(body: string) {
  const root: Record<string, unknown> = {}
  for (const [rawKey, value] of new URLSearchParams(body)) {
    const parts = rawKey.replace(/\]/g, '').split('[')
    let node: Record<string, unknown> = root
    parts.forEach((part, index) => {
      if (index === parts.length - 1) node[part] = value
      else node = (node[part] ??= /^\d+$/.test(parts[index + 1]) ? [] : {}) as Record<string, unknown>
    })
  }
  return root
}

interface FakeSession {
  id: string
  object: 'checkout.session'
  url: string
  status: 'open' | 'complete' | 'expired'
  payment_status: 'unpaid' | 'paid'
  amount_total: number
  currency: string
  customer_email: string
  client_reference_id: string | null
  metadata: Record<string, string>
  payment_intent: string | null
  success_url: string
  cancel_url: string
  expires_at: number
  locale: string
  line_items: { name: string; amount: number }[]
}

const sessions = new Map<string, FakeSession>()
const idempotency = new Map<string, string>()
const stripeControl = { failNextCreate: false, webhookOnPay: true, created: 0 }
const sentEvents: string[] = []
const signer = new Stripe('sk_test_local')

async function sendEvent(type: string, object: unknown) {
  const payload = JSON.stringify({ id: `evt_${randomBytes(8).toString('hex')}`, object: 'event', type, api_version: '2025-10-29.clover', created: Math.floor(Date.now() / 1000), data: { object } })
  const header = await signer.webhooks.generateTestHeaderStringAsync({ payload, secret: WEBHOOK_SECRET })
  const response = await fetch(`${APP}/api/stripe-webhook`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Stripe-Signature': header }, body: payload })
  sentEvents.push(`${type}:${response.status}`)
  return response
}

async function paySession(session: FakeSession) {
  session.status = 'complete'
  session.payment_status = 'paid'
  session.payment_intent = `pi_${randomBytes(8).toString('hex')}`
  if (stripeControl.webhookOnPay) await sendEvent('checkout.session.completed', session)
}

function json(response: ServerResponse, status: number, body: unknown) {
  response.writeHead(status, { 'Content-Type': 'application/json' })
  response.end(JSON.stringify(body))
}

const stripeServer = createServer(async (request, response) => {
  const url = new URL(request.url!, 'http://x')
  const body = request.method === 'POST' ? await readBody(request) : ''
  // Page de paiement hébergée (imite checkout.stripe.com).
  const page = /^\/pay\/(cs_test_[a-z0-9]+)$/.exec(url.pathname)
  if (page) {
    const session = sessions.get(page[1])
    if (!session) { response.writeHead(404); return response.end('Session inconnue') }
    if (request.method === 'POST') {
      if (session.status !== 'open' || Date.now() / 1000 > session.expires_at) { response.writeHead(410); return response.end('Session expirée') }
      await paySession(session)
      response.writeHead(303, { Location: session.success_url.replace('{CHECKOUT_SESSION_ID}', session.id) })
      return response.end()
    }
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    return response.end(`<!doctype html><html lang="fr"><title>Faux Stripe Checkout</title><main>
      <h1>Paiement</h1><p id="amount">${(session.amount_total / 100).toFixed(2)} ${session.currency}</p>
      <ul>${session.line_items.map((item) => `<li>${item.name} : ${item.amount}</li>`).join('')}</ul>
      <form method="post"><input aria-label="Numéro de carte" value="4242 4242 4242 4242"><button>Payer</button></form>
      <a href="${session.cancel_url}">Retour</a></main></html>`)
  }

  if (request.headers.authorization !== 'Bearer sk_test_local') return json(response, 401, { error: { message: 'Invalid API key' } })

  if (request.method === 'POST' && url.pathname === '/v1/checkout/sessions') {
    const key = request.headers['idempotency-key'] as string | undefined
    if (key && idempotency.has(key)) return json(response, 200, sessions.get(idempotency.get(key)!))
    if (stripeControl.failNextCreate) { stripeControl.failNextCreate = false; return json(response, 400, { error: { type: 'invalid_request_error', message: 'Panne simulée' } }) }
    const params = decodeForm(body) as Record<string, any>
    // Contrôles que ferait le vrai Stripe.
    const expiresAt = Number(params.expires_at)
    const now = Math.floor(Date.now() / 1000)
    if (!(expiresAt >= now + 30 * 60 && expiresAt <= now + 24 * 3600)) return json(response, 400, { error: { message: 'expires_at doit être entre 30 min et 24 h' } })
    if (params.mode !== 'payment' || !params.success_url?.includes('{CHECKOUT_SESSION_ID}') || !params.cancel_url) return json(response, 400, { error: { message: 'paramètres invalides' } })
    const items = (params.line_items as any[]).map((item) => ({ name: item.price_data.product_data.name as string, amount: Number(item.price_data.unit_amount) * Number(item.quantity) }))
    if (items.some((item) => !Number.isInteger(item.amount) || item.amount <= 0)) return json(response, 400, { error: { message: 'montant invalide' } })
    const id = `cs_test_${randomBytes(12).toString('hex')}`
    const session: FakeSession = {
      id, object: 'checkout.session', url: `http://127.0.0.1:${STRIPE_PORT}/pay/${id}`, status: 'open', payment_status: 'unpaid',
      amount_total: items.reduce((sum, item) => sum + item.amount, 0), currency: params.line_items[0].price_data.currency,
      customer_email: params.customer_email, client_reference_id: params.client_reference_id ?? null, metadata: params.metadata ?? {},
      payment_intent: null, success_url: params.success_url, cancel_url: params.cancel_url, expires_at: expiresAt, locale: params.locale, line_items: items,
    }
    sessions.set(id, session)
    if (key) idempotency.set(key, id)
    stripeControl.created++
    return json(response, 200, session)
  }
  const retrieve = /^\/v1\/checkout\/sessions\/(cs_[A-Za-z0-9_]+)(\/expire)?$/.exec(url.pathname)
  if (retrieve) {
    const session = sessions.get(retrieve[1])
    if (!session) return json(response, 404, { error: { type: 'invalid_request_error', message: 'No such checkout.session' } })
    if (retrieve[2] && request.method === 'POST') {
      if (session.status !== 'open') return json(response, 400, { error: { message: 'Session non ouverte' } })
      session.status = 'expired'
      // Le vrai Stripe envoie aussi checkout.session.expired.
      setTimeout(() => void sendEvent('checkout.session.expired', session), 50)
    }
    return json(response, 200, session)
  }
  json(response, 404, { error: { message: 'Route du faux Stripe inconnue' } })
})

// ─── Site + fonctions api/ ──────────────────────────────────────────────────

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
  new Promise<void>((resolve) => stripeServer.listen(STRIPE_PORT, '127.0.0.1', resolve)),
  new Promise<void>((resolve) => app.listen(APP_PORT, '127.0.0.1', resolve)),
  new Promise<void>((resolve) => beds24Server.listen(BEDS24_PORT, '127.0.0.1', resolve)),
])

// ─── Scénarios ──────────────────────────────────────────────────────────────

async function reset() {
  await db.query('delete from public.bookings; delete from public.availability_blocks;')
}
async function booking(id: string) {
  return (await db.query('select * from public.bookings where id = $1', [id])).rows[0]
}
async function bookings() {
  return (await db.query('select * from public.bookings order by created_at')).rows
}
function checkout(body: Record<string, unknown>, headers: Record<string, string> = {}) {
  return fetch(`${APP}/api/checkout`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) })
}
const guest = { name: 'Camille Dupont', email: 'camille@example.fr', phone: '0600000000', lang: 'fr' }
const stay = (suite: string, start: number, nights: number, guests = 2) => ({ ...guest, suite, arrival: addDays(today, start), departure: addDays(today, start + nights), guests })
const sessionOf = (checkoutUrl: string) => sessions.get(checkoutUrl.split('/pay/')[1])!
async function blockedFor(suite: string) {
  const blocks = await (await fetch(`${APP}/api/availability`)).json() as { resource: string; start_date: string; end_date: string }[]
  return blocks.filter((block) => block.resource === suite)
}

const browser = await chromium.launch()
const pageErrors: string[] = []
let failed = false
try {
  console.log('\n1. Configuration')
  await reset()
  assert((await (await fetch(`${APP}/api/checkout`)).json()).enabled === true, 'Paiement en ligne annoncé comme actif quand Stripe et Supabase sont configurés')

  console.log('\n2. Parcours complet dans le navigateur (paiement accepté, webhook avant le retour)')
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await context.newPage()
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await page.goto(`${APP}/`, { waitUntil: 'networkidle' })
  await page.locator('.header-cta').click()
  await page.locator('input[name="universe"][value="suites"]').check()
  await page.locator('label.suite-choice', { hasText: 'La Suite Eau' }).click()
  assert(await txt(page.locator('#suite-hint-eau')) === 'dès 150 € la nuit', 'Prix « dès … la nuit » affiché sur chaque suite')
  await page.waitForFunction(() => document.querySelectorAll('.calendar-day:not([aria-disabled])').length > 10)
  const free = page.locator('.calendar-day:not([aria-disabled])')
  const arrivalDate = await free.nth(3).getAttribute('data-date') as string
  await free.nth(3).click()
  await page.locator(`.calendar-day[data-date="${addDays(arrivalDate, 2)}"]`).click()
  const expected = quote('eau', arrivalDate, addDays(arrivalDate, 2), 2, today)
  assert(!('error' in expected), 'Séjour de test valide')
  assert((await txt(page.locator('.price-summary'))).includes('300'), 'Récapitulatif du prix affiché (2 nuits × 150 €)')
  assert((await txt(page.locator('.form-submit'))).includes('Réserver et payer 300'), 'Bouton « Réserver et payer » avec le total')
  await page.screenshot({ path: 'artifacts/booking-pay-form.png' })
  await accessible(page, 'Formulaire de réservation payante')
  await page.locator('input[name="guests"]').fill('3')
  assert(await page.locator('#guests-error').isVisible(), 'Capacité de la suite signalée (3 personnes en Suite Eau)')
  await page.locator('input[name="guests"]').fill('2')
  await page.locator('input[name="name"]').fill('Camille Dupont')
  await page.locator('input[name="email"]').fill('camille@example.fr')
  await page.locator('input[name="consent"]').check()
  await page.locator('.form-submit').click()
  await page.waitForURL(/127\.0\.0\.1:4183\/pay\//)
  assert(await txt(page.locator('#amount')) === '300.00 eur', 'Page de paiement Stripe au bon montant, calculé par le serveur')
  let [row] = await bookings()
  assert(row.status === 'pending' && row.suite === 'eau' && row.amount_total === 30000 && row.stripe_session_id, 'Réservation « pending » créée avec la session Stripe')
  assert(new Date(row.hold_until).getTime() - Date.now() > 30 * 60_000, 'Dates bloquées plus longtemps que la session Stripe (30 min)')
  assert((await blockedFor('eau')).some((block) => block.start_date === arrivalDate), 'Dates retirées du calendrier pendant le paiement')
  await page.getByRole('button', { name: 'Payer' }).click()
  await page.waitForURL(/\/reservation\/confirmation\?session_id=cs_test_/)
  await page.getByRole('heading', { name: /Merci/ }).waitFor()
  assert((await txt(page.locator('.booking-confirmation'))).includes('300'), 'Page de confirmation : réservation payée et montant')
  await page.screenshot({ path: 'artifacts/booking-confirmed.png' })
  await accessible(page, 'Page de confirmation')
  row = await booking(row.id)
  assert(row.status === 'paid' && row.paid_at && row.stripe_payment_intent, 'Réservation passée à « paid » par le webhook')
  assert(sentEvents.includes('checkout.session.completed:200'), 'Webhook signé accepté (200)')
  assert((await blockedFor('eau')).some((block) => block.start_date === arrivalDate && block.end_date === addDays(arrivalDate, 2)), 'Dates payées indisponibles dans le calendrier')
  await page.goto(`${APP}/`, { waitUntil: 'networkidle' })
  await page.locator('.header-cta').click()
  await page.locator('input[name="universe"][value="suites"]').check()
  await page.locator('label.suite-choice', { hasText: 'La Suite Eau' }).click()
  await page.waitForFunction(() => document.querySelectorAll('.calendar-day:not([aria-disabled])').length > 10)
  // Les disponibilités arrivent après l'affichage du calendrier : on attend qu'elles soient appliquées.
  const shownBooked = await page.waitForFunction((day) => document.querySelector(`.calendar-day[data-date="${day}"]`)?.getAttribute('aria-disabled') === 'true', arrivalDate, { timeout: 5000 }).then(() => true, () => false)
  assert(shownBooked, 'Le calendrier du site affiche la nuit payée comme indisponible')

  console.log('\n3. Rejeu du webhook (Stripe peut l’envoyer plusieurs fois)')
  const paidSession = sessions.get(row.stripe_session_id)!
  assert((await sendEvent('checkout.session.completed', paidSession)).status === 200, 'Webhook rejoué accepté')
  assert((await booking(row.id)).status === 'paid' && (await bookings()).length === 1, 'Rejeu sans effet (idempotent)')

  console.log('\n4. Mêmes dates, même suite')
  const again = await checkout({ ...guest, suite: 'eau', arrival: arrivalDate, departure: addDays(arrivalDate, 2), guests: 2 })
  assert(again.status === 409 && (await again.json()).error === 'unavailable', 'Dates déjà payées refusées (409)')
  const overlap = await checkout({ ...guest, suite: 'eau', arrival: addDays(arrivalDate, 1), departure: addDays(arrivalDate, 3), guests: 2 })
  assert(overlap.status === 409, 'Chevauchement partiel refusé')
  const backToBack = await checkout({ ...guest, email: 'autre@example.fr', suite: 'eau', arrival: addDays(arrivalDate, 2), departure: addDays(arrivalDate, 4), guests: 2 })
  assert(backToBack.status === 200, 'Arrivée le jour du départ précédent acceptée')
  const otherSuite = await checkout({ ...guest, email: 'trois@example.fr', suite: 'feu', arrival: arrivalDate, departure: addDays(arrivalDate, 2), guests: 2 })
  assert(otherSuite.status === 200, 'Autre suite aux mêmes dates acceptée')

  console.log('\n5. Retour par la page de confirmation avant le webhook')
  await reset()
  stripeControl.webhookOnPay = false
  {
    const created = await (await checkout(stay('terre', 20, 3, 3))).json() as { url: string }
    const session = sessionOf(created.url)
    await paySession(session)
    const status = await (await fetch(`${APP}/api/booking-status?session_id=${session.id}`)).json()
    assert(status.status === 'paid' && status.amount_total === 3 * RATES.terre.night && !('email' in status) && !('name' in status), 'La page de confirmation vérifie Stripe et confirme sans attendre le webhook (sans exposer les coordonnées)')
    await sendEvent('checkout.session.completed', session)
    assert((await bookings()).filter((b) => b.status === 'paid').length === 1, 'Webhook arrivé ensuite : aucun doublon')
  }
  stripeControl.webhookOnPay = true

  console.log('\n6. Client qui quitte la page de paiement')
  await reset()
  {
    await page.goto(`${APP}/`, { waitUntil: 'networkidle' })
    await page.locator('.header-cta').click()
    await page.locator('input[name="universe"][value="suites"]').check()
    await page.locator('label.suite-choice', { hasText: 'La Suite Feu' }).click()
    await page.waitForFunction(() => document.querySelectorAll('.calendar-day:not([aria-disabled])').length > 10)
    const days = page.locator('.calendar-day:not([aria-disabled])')
    const start = await days.nth(5).getAttribute('data-date') as string
    await days.nth(5).click()
    await page.locator(`.calendar-day[data-date="${addDays(start, 1)}"]`).click()
    await page.locator('input[name="name"]').fill('Alex Martin')
    await page.locator('input[name="email"]').fill('alex@example.fr')
    await page.locator('input[name="consent"]').check()
    await page.locator('.form-submit').click()
    await page.waitForURL(/\/pay\//)
    const session = sessionOf(page.url())
    await page.getByRole('link', { name: 'Retour' }).click()
    await page.waitForURL(/\/reservation\/annulation\?booking=/)
    await page.getByRole('heading', { name: /Rien n’a/ }).waitFor()
    await accessible(page, 'Page d’annulation')
    await new Promise((resolve) => setTimeout(resolve, 500))
    const [cancelled] = await bookings()
    assert(cancelled.status === 'cancelled' || cancelled.status === 'expired', 'Réservation annulée au retour sur le site')
    assert(session.status === 'expired', 'Session Stripe fermée : elle ne peut plus être payée')
    assert(!(await blockedFor('feu')).some((block) => block.start_date === start), 'Dates de nouveau libres')
    const pay = await fetch(session.url, { method: 'POST', redirect: 'manual' })
    assert(pay.status === 410, 'Paiement impossible après annulation')
    await page.getByRole('link', { name: 'Choisir à nouveau mes dates' }).click()
    await page.locator('input[name="universe"][value="suites"]').waitFor()
    assert(await page.locator('input[name="universe"][value="suites"]').isChecked(), 'Lien « Choisir à nouveau mes dates » rouvre la réservation des suites')
  }

  console.log('\n7. Paiement abandonné : expiration')
  await reset()
  {
    const created = await (await checkout(stay('metal', 10, 2, 4))).json() as { url: string }
    const session = sessionOf(created.url)
    session.status = 'expired'
    assert((await sendEvent('checkout.session.expired', session)).status === 200, 'Webhook d’expiration accepté')
    assert((await bookings())[0].status === 'expired', 'Réservation expirée, dates libérées')
    assert((await checkout(stay('metal', 10, 2, 4))).status === 200, 'Les mêmes dates sont de nouveau réservables')
  }

  console.log('\n8. Délai dépassé sans webhook')
  await reset()
  {
    await checkout(stay('bois', 12, 2))
    await db.query(`update public.bookings set hold_until = now() - interval '1 minute'`)
    assert((await blockedFor('bois')).length === 0, 'Blocage échu ignoré par le calendrier')
    const retry = await checkout({ ...stay('bois', 12, 2), email: 'b@example.fr' })
    assert(retry.status === 200, 'Nouvelle réservation possible sur un blocage échu')
    assert((await bookings())[0].status === 'expired', 'Ancien blocage marqué « expired »')
  }

  console.log('\n9. Paiements simultanés sur les mêmes dates')
  await reset()
  {
    const attempts = await Promise.all(Array.from({ length: 8 }, (_, index) => checkout({ ...stay('terre', 30, 2), email: `client${index}@example.fr` })))
    const statuses = attempts.map((response) => response.status).sort()
    assert(statuses.filter((status) => status === 200).length === 1 && statuses.filter((status) => status === 409).length === 7, `Un seul client sur 8 obtient les dates (${statuses.join(', ')})`)
  }

  console.log('\n10. Paiement reçu alors que les dates ont été reprises')
  await reset()
  {
    const first = await (await checkout(stay('eau', 40, 2))).json() as { url: string }
    const late = sessionOf(first.url)
    await db.query(`update public.bookings set hold_until = now() - interval '1 minute'`)
    await checkout({ ...stay('eau', 40, 2), email: 'rapide@example.fr' })
    await paySession(late)
    const states = (await bookings()).map((b) => b.status).sort()
    assert(states.join() === 'conflict,pending', `Paiement en retard marqué « conflict » à rembourser, l’autre client garde ses dates (${states.join(', ')})`)
    const status = await (await fetch(`${APP}/api/booking-status?session_id=${late.id}`)).json()
    assert(status.status === 'conflict', 'Le client concerné voit le message de conflit')
  }

  console.log('\n11. Dates bloquées par Beds24 / à la main')
  await reset()
  {
    await db.query(`insert into public.availability_blocks (resource, start_date, end_date, source) values ('feu', $1, $2, 'beds24')`, [addDays(today, 15), addDays(today, 18)])
    assert((await checkout(stay('feu', 16, 1))).status === 409, 'Période Beds24 refusée')
    const created = await (await checkout(stay('feu', 18, 2))).json() as { url: string }
    assert(created.url, 'Arrivée le jour de fin du blocage acceptée')
    await db.query(`insert into public.availability_blocks (resource, start_date, end_date, source) values ('feu', $1, $2, 'beds24')`, [addDays(today, 19), addDays(today, 20)])
    await paySession(sessionOf(created.url))
    assert((await bookings())[0].status === 'conflict', 'Réservation Airbnb arrivée pendant le paiement : « conflict » au lieu d’une double réservation')
  }

  console.log('\n12. Montant falsifié')
  await reset()
  {
    const created = await (await checkout({ ...stay('eau', 50, 1), amount: 1, price: 1, total: 1 })).json() as { url: string }
    const session = sessionOf(created.url)
    assert(session.amount_total === RATES.eau.night, 'Le prix envoyé par le navigateur est ignoré')
    session.amount_total = 100
    await paySession(session)
    assert((await bookings())[0].status === 'conflict', 'Montant payé différent du prix : « conflict », pas de confirmation')
  }

  console.log('\n13. Remboursement')
  await reset()
  {
    const created = await (await checkout(stay('bois', 60, 2))).json() as { url: string }
    const session = sessionOf(created.url)
    await paySession(session)
    await sendEvent('charge.refunded', { id: 'ch_1', object: 'charge', payment_intent: session.payment_intent, refunded: false, amount_refunded: 100 })
    assert((await bookings())[0].status === 'paid', 'Remboursement partiel : réservation maintenue')
    await sendEvent('charge.refunded', { id: 'ch_1', object: 'charge', payment_intent: session.payment_intent, refunded: true })
    assert((await bookings())[0].status === 'refunded', 'Remboursement total : réservation « refunded »')
    assert((await blockedFor('bois')).length === 0, 'Dates libérées après remboursement')
  }

  console.log('\n14. Sécurité du webhook')
  {
    const payload = JSON.stringify({ id: 'evt_x', object: 'event', type: 'checkout.session.completed', data: { object: {} } })
    const forged = await fetch(`${APP}/api/stripe-webhook`, { method: 'POST', headers: { 'Stripe-Signature': `t=${Math.floor(Date.now() / 1000)},v1=${'0'.repeat(64)}` }, body: payload })
    assert(forged.status === 400, 'Signature falsifiée refusée (400)')
    const unsigned = await fetch(`${APP}/api/stripe-webhook`, { method: 'POST', body: payload })
    assert(unsigned.status === 400, 'Webhook sans signature refusé')
    const header = await signer.webhooks.generateTestHeaderStringAsync({ payload, secret: WEBHOOK_SECRET, timestamp: Math.floor(Date.now() / 1000) - 3600 })
    assert((await fetch(`${APP}/api/stripe-webhook`, { method: 'POST', headers: { 'Stripe-Signature': header }, body: payload })).status === 400, 'Webhook rejoué une heure plus tard refusé')
    const unknown = await fetch(`${APP}/api/booking-status?session_id=cs_test_inconnue000000`)
    assert(unknown.status === 404, 'Session inconnue : 404')
    assert((await fetch(`${APP}/api/booking-status?session_id=../../etc`)).status === 400, 'Identifiant de session invalide refusé')
    assert((await fetch(`${APP}/api/booking-status`, { method: 'POST', body: JSON.stringify({ booking: "1' or 1=1" }) })).status === 400, 'Identifiant de réservation invalide refusé')
  }

  console.log('\n15. Validation des demandes')
  await reset()
  {
    const cases: [Record<string, unknown>, string][] = [
      [{ ...stay('eau', 5, 2), guests: 3 }, 'guests'],
      [{ ...stay('metal', 5, 2), guests: 5 }, 'guests'],
      [{ ...stay('eau', 0, 1) }, 'too-soon'],
      [{ ...stay('eau', -3, 1) }, 'too-soon'],
      [{ ...stay('eau', 5, 31) }, 'too-long'],
      [{ ...stay('eau', 5, 2), departure: addDays(today, 5) }, 'dates'],
      [{ ...stay('eau', 5, 2), arrival: '2027-02-30' }, 'dates'],
      [{ ...stay('spa', 5, 2) }, 'suite'],
      [{ ...stay('eau', 5, 2), email: 'pas-un-email' }, 'contact'],
      [{ ...stay('eau', 5, 2), name: '  ' }, 'contact'],
    ]
    for (const [body, error] of cases) {
      const response = await checkout(body)
      const result = await response.json()
      assert(response.status === 400 && result.error === error, `Refus « ${error} » (${JSON.stringify({ suite: body.suite, arrival: body.arrival, departure: body.departure, guests: body.guests, email: body.email })})`)
    }
    const robot = await checkout({ ...stay('eau', 5, 2), website: 'http://spam' })
    assert(robot.status === 400, 'Champ piège rempli : refusé')
    assert((await bookings()).length === 0 && stripeControl.created > 0, 'Aucune réservation créée par une demande refusée')
  }

  console.log('\n16. Panne de Stripe')
  await reset()
  {
    stripeControl.failNextCreate = true
    const response = await checkout(stay('terre', 70, 2))
    assert(response.status === 502 && (await response.json()).error === 'payment', 'Erreur Stripe : 502 « payment »')
    assert((await bookings())[0].status === 'cancelled', 'Dates libérées après la panne')
    assert((await checkout(stay('terre', 70, 2))).status === 200, 'Nouvel essai possible')
  }

  console.log('\n17. Anti-abus')
  await reset()
  {
    const statuses: number[] = []
    for (let index = 0; index < 6; index++) statuses.push((await checkout({ ...stay('metal', 80 + index * 3, 2), email: 'spam@example.fr' })).status)
    assert(statuses.slice(0, 5).every((status) => status === 200) && statuses[5] === 429, `Au plus 5 tentatives par e-mail et par heure (${statuses.join(', ')})`)
  }

  console.log('\n18. Version anglaise')
  await reset()
  {
    const created = await (await checkout({ ...stay('feu', 90, 1), lang: 'en' })).json() as { url: string }
    const session = sessionOf(created.url)
    assert(session.locale === 'en' && session.success_url.includes('/en/booking/confirmation') && session.cancel_url.includes('/en/booking/cancelled'), 'Stripe en anglais et retour vers les pages anglaises')
    const enPage = await context.newPage()
    enPage.on('pageerror', (error) => pageErrors.push(error.message))
    await enPage.goto(session.url)
    await enPage.getByRole('button', { name: 'Payer' }).click()
    await enPage.waitForURL(/\/en\/booking\/confirmation/)
    await enPage.getByRole('heading', { name: /Thank you/ }).waitFor()
    assert(true, 'Page de confirmation anglaise')
  }

  console.log('\n19. Paiement en ligne désactivé')
  {
    process.env.ONLINE_BOOKING = 'off'
    assert((await (await fetch(`${APP}/api/checkout`)).json()).enabled === false, 'ONLINE_BOOKING=off : paiement masqué')
    assert((await checkout(stay('eau', 100, 1))).status === 503, 'ONLINE_BOOKING=off : création refusée (503)')
    const offPage = await context.newPage()
    await offPage.goto(`${APP}/`, { waitUntil: 'networkidle' })
    await offPage.locator('.header-cta').click()
    await offPage.locator('input[name="universe"][value="suites"]').check()
    assert((await txt(offPage.locator('.form-submit'))).includes('Préparer ma demande'), 'Sans paiement en ligne, le formulaire de demande d’origine est conservé')
    delete process.env.ONLINE_BOOKING
  }

  console.log('\n20. Relecture : cas limites corrigés')
  await reset()
  {
    const foreign = { id: 'cs_test_autre', object: 'checkout.session', payment_status: 'paid', status: 'complete', client_reference_id: 'spa-123', metadata: {}, amount_total: 5000 }
    assert((await sendEvent('checkout.session.completed', foreign)).status === 200, 'Paiement Stripe étranger au site (référence non UUID) ignoré sans erreur 500')
    assert((await sendEvent('checkout.session.expired', foreign)).status === 200, 'Expiration étrangère au site ignorée sans erreur 500')

    const ip = { 'x-real-ip': '203.0.113.7' }
    const holds = []
    for (let index = 0; index < 4; index++) holds.push((await checkout({ ...stay(['terre', 'eau', 'feu', 'bois'][index], 120, 1), email: `jetable${index}@example.fr` }, ip)).status)
    assert(holds.join() === '200,200,200,429', `Au plus 3 paiements en cours par adresse IP (${holds.join(', ')})`)
    assert((await checkout({ ...stay('metal', 120, 1), email: 'voisin@example.fr' }, { 'x-real-ip': '203.0.113.8' })).status === 200, 'Une autre adresse IP n’est pas bloquée')
  }
  await reset()
  {
    // Conflit vu depuis la page d'annulation (paiement fait dans un autre onglet, dates prises entre-temps).
    const created = await (await checkout(stay('eau', 130, 2))).json() as { url: string }
    const session = sessionOf(created.url)
    await db.query(`insert into public.availability_blocks (resource, start_date, end_date, source) values ('eau', $1, $2, 'manuel')`, [addDays(today, 130), addDays(today, 131)])
    stripeControl.webhookOnPay = false
    await paySession(session)
    stripeControl.webhookOnPay = true
    const conflictPage = await context.newPage()
    await conflictPage.goto(session.cancel_url)
    await conflictPage.getByRole('heading', { name: /Nous allons/ }).waitFor()
    assert(!(await txt(conflictPage.locator('main'))).includes('Rien n’a'), 'Page d’annulation : un paiement en conflit n’affiche pas « rien n’a été débité »')

    const missing = await context.newPage()
    await missing.goto(`${APP}/reservation/confirmation?session_id=cs_test_inconnue000000`)
    await missing.getByRole('heading', { name: /introuvable/ }).waitFor()
    assert(!(await txt(missing.locator('main'))).includes('Réservation confirmée'), 'Session inconnue : la page n’affiche pas « Réservation confirmée »')
  }
  {
    const requestPage = await context.newPage()
    await requestPage.goto(`${APP}/`, { waitUntil: 'networkidle' })
    await requestPage.locator('.header-cta').click()
    await requestPage.locator('input[name="universe"][value="suites"]').check()
    await requestPage.getByRole('button', { name: /Envoyez-nous plutôt une demande/ }).click()
    assert((await txt(requestPage.locator('.form-submit'))).includes('Préparer ma demande'), 'Demande sur mesure toujours possible pour les suites (sans paiement)')
  }

  console.log('\n21. Beds24 (fermeture des dates sur Airbnb, Booking…)')
  await reset()
  process.env.BEDS24_WRITE_TOKEN = 'beds24-write'
  {
    const created = await (await checkout(stay('terre', 140, 2, 3))).json() as { url: string }
    const session = sessionOf(created.url)
    await paySession(session)
    let [row] = await bookings()
    assert(row.status === 'paid' && row.beds24_booking_id === '9000', 'Réservation payée créée dans Beds24')
    const sent = beds24.calls.at(-1)!
    assert(sent.roomId === 130293, 'Bonne chambre Beds24 (Suite Terre = 130293)')
    assert(sent.status === 'confirmed' && sent.numAdult === 3 && sent.apiReference === row.id, 'Statut, personnes et référence transmis à Beds24')

    await sendEvent('charge.refunded', { id: 'ch_2', object: 'charge', payment_intent: session.payment_intent, refunded: true })
    assert(beds24.calls.at(-1)!.id === 9000 && beds24.calls.at(-1)!.status === 'cancelled', 'Remboursement : réservation annulée dans Beds24')

    beds24.failNext = true
    const second = await (await checkout(stay('feu', 140, 2))).json() as { url: string }
    await paySession(sessionOf(second.url))
    row = (await bookings()).find((b) => b.suite === 'feu')
    assert(row.status === 'paid' && !row.beds24_booking_id && row.beds24_error, 'Panne Beds24 : réservation payée gardée, erreur notée')
    await db.query(`update public.bookings set paid_at = now() - interval '5 minutes'`)
    assert(await retryBeds24Pushes() === 1, 'La synchronisation quotidienne retente l’envoi')
    row = (await bookings()).find((b) => b.suite === 'feu')
    assert(row.beds24_booking_id && !row.beds24_error, 'Réservation finalement créée dans Beds24')
    assert(await retryBeds24Pushes() === 0, 'Rien à retenter ensuite')
  }
  delete process.env.BEDS24_WRITE_TOKEN

  assert(pageErrors.length === 0, `Aucune erreur JavaScript dans les pages (${pageErrors.join(' | ')})`)
} catch (error) {
  failed = true
  console.error(`\n${(error as Error).stack}`)
} finally {
  await browser.close()
  await db.end()
  app.close(); supabase.close(); stripeServer.close(); beds24Server.close()
}
console.log(`\n${results.length} vérifications réussies${failed ? ', puis un échec' : ''}. Appels Supabase : ${supabaseCalls}.`)
process.exit(failed ? 1 : 0)
