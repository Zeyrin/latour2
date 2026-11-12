// Client Stripe côté serveur. STRIPE_SECRET_KEY : clé secrète (sk_test_… en test, sk_live_… en production).
// STRIPE_API_BASE (tests uniquement) : adresse d'un faux Stripe local, par ex. http://127.0.0.1:12111.

import Stripe from 'stripe'

let client: Stripe | null = null

export function stripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY)
}

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY manquante')
  if (!client) {
    const base = process.env.STRIPE_API_BASE ? new URL(process.env.STRIPE_API_BASE) : null
    client = new Stripe(key, {
      maxNetworkRetries: 2,
      timeout: 15_000,
      ...(base ? { host: base.hostname, port: base.port, protocol: base.protocol.replace(':', '') as 'http' | 'https' } : {}),
    })
  }
  return client
}
