# Château Latour Ségur — site vitrine

Site statique (React + Vite, pré-rendu par `vite-react-ssg`) hébergé sur Vercel, en français (`/`) et en anglais (`/en`).

## Commandes

```bash
npm ci
npm run dev        # développement
npm run lint
npm run build      # tsc + pré-rendu des 6 pages dans dist/
node scripts/verify.mjs   # contrôle de bout en bout (Playwright + axe) sur dist/
```

## Architecture

| Élément | Rôle |
| --- | --- |
| `src/` | pages, composants, contenus FR/EN (`src/lib/content.ts`, `src/lib/ui.ts`) |
| `api/availability.ts` | `GET` — périodes indisponibles lues dans la vue Supabase `availability` |
| `api/booking-request.ts` | `POST` — enregistre une demande du formulaire dans `booking_requests` |
| `api/checkout.ts` | `POST` — session Stripe Embedded Checkout pour une suite (prix lu dans Beds24, paiement autorisé sans débit immédiat) ; `GET` — paiement actif ou non |
| `api/stripe-webhook.ts` | paiement autorisé → réservation Beds24 + table `bookings` ; débit → confirmée ; annulation Stripe → réservation Beds24 annulée |
| `api/capture-bookings.ts` | tâche planifiée quotidienne : débite les réservations non refusées après 24 h |
| `api/sync-beds24.ts` | synchronise Beds24 → `availability_blocks` (tâche planifiée Vercel quotidienne, ou webhook `?key=CRON_SECRET`) |
| `supabase/schema.sql` | schéma, RLS et fonction `replace_beds24_blocks` (ré-exécutable dans le SQL Editor) |

Le navigateur ne détient aucune clé Supabase : toutes les lectures/écritures passent par `api/*` avec la clé `service_role`.

## Variables d'environnement (Vercel)

Voir `.env.example` : `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `BEDS24_TOKEN`, `CRON_SECRET`,
`STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`.
`VITE_RYBBIT_SITE_ID` (statistiques, valeur publique) a une valeur par défaut dans `.env.production`.

## Paiement des suites (Stripe)

1. Clés Stripe dans Vercel (test : `sk_test_…` / `pk_test_…`). Sans elles, le formulaire garde la demande par e-mail.
2. Stripe → Développeurs → Webhooks : URL `https://www.chambredhotesaintemilion.fr/api/stripe-webhook`,
   événements `checkout.session.completed`, `payment_intent.succeeded`, `payment_intent.canceled` ; copier le secret `whsec_…` dans `STRIPE_WEBHOOK_SECRET`.
3. Le token Beds24 doit avoir les droits *bookings* en écriture (création/annulation des réservations).
4. Validation par le château : Stripe → Paiements → paiement « Non capturé » → **Capturer** (valider) ou **Annuler** (refuser, rien n'est débité).
   Sans action, la réservation est débitée automatiquement entre 24 h et 48 h après le paiement.
