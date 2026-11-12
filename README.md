# Château Latour Ségur — site vitrine

Site statique (React + Vite, pré-rendu par `vite-react-ssg`) hébergé sur Vercel, en français (`/`) et en anglais (`/en`).

## Commandes

```bash
npm ci
npm run dev        # développement
npm run lint
npm run build      # tsc + pré-rendu des 6 pages dans dist/
node scripts/verify.mjs   # contrôle de bout en bout (Playwright + axe) sur dist/
DATABASE_URL=postgres://… npm run test:booking   # réservation payante de bout en bout (PostgreSQL local + faux Stripe)
```

## Architecture

| Élément | Rôle |
| --- | --- |
| `src/` | pages, composants, contenus FR/EN (`src/lib/content.ts`, `src/lib/ui.ts`) |
| `api/availability.ts` | `GET` — périodes indisponibles lues dans la vue Supabase `availability` |
| `api/booking-request.ts` | `POST` — enregistre une demande du formulaire dans `booking_requests` |
| `api/checkout.ts` | `GET` : paiement en ligne actif ? `POST` : bloque les dates (`bookings` en `pending`) et crée la session Stripe Checkout |
| `api/stripe-webhook.ts` | confirme les paiements (`paid`), libère les dates des paiements expirés ou remboursés |
| `api/booking-status.ts` | pages de retour de Stripe : état du paiement (`GET`), annulation par le client (`POST`) |
| `src/lib/pricing.ts` | tarifs des suites, capacités, durée minimum, taxe de séjour (partagé site / serveur) |
| `api/sync-beds24.ts` | synchronise Beds24 → `availability_blocks` (tâche planifiée Vercel quotidienne, ou webhook `?key=CRON_SECRET`) |
| `supabase/schema.sql` | schéma, RLS et fonction `replace_beds24_blocks` (ré-exécutable dans le SQL Editor) |

Le navigateur ne détient aucune clé Supabase : toutes les lectures/écritures passent par `api/*` avec la clé `service_role`.

## Variables d'environnement (Vercel)

Voir `.env.example` : `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `BEDS24_TOKEN`, `CRON_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`.

## Réservation en ligne (Stripe)

1. Exécuter `supabase/schema.sql` dans le SQL Editor (crée la table `bookings`).
2. Dans Stripe (mode test d'abord) : Développeurs → Webhooks → ajouter `https://<site>/api/stripe-webhook` avec les événements `checkout.session.completed`, `checkout.session.expired`, `charge.refunded`.
3. Renseigner `STRIPE_SECRET_KEY` et `STRIPE_WEBHOOK_SECRET` dans Vercel, puis redéployer. Sans ces clés, le site garde le formulaire de demande par e-mail.
4. Activer les reçus par e-mail dans Stripe (Paramètres → E-mails clients → Paiements réussis).
5. Facultatif, pour que les réservations payées apparaissent dans Beds24 (et ferment les dates sur Airbnb, Booking…) : dans Beds24, Paramètres → Marketplace → API, créer un code d'invitation avec les droits de lecture et d'écriture des réservations (pas « long life token », qui ne permet que la lecture). L'échanger contre un refresh token : `curl -H "code: <code>" https://api.beds24.com/v2/authentication/setup`, puis mettre le `refreshToken` obtenu dans `BEDS24_REFRESH_TOKEN`. Il expire après 30 jours sans usage ; la tâche quotidienne `api/sync-beds24` s'en sert chaque jour.

Les réservations sont dans la table `bookings` : `paid` (confirmée), `conflict` (payée mais dates prises entre-temps : à rembourser depuis Stripe), `expired` / `cancelled` (abandon), `refunded`. Carte de test : `4242 4242 4242 4242`, date future, CVC quelconque.
`VITE_RYBBIT_SITE_ID` (statistiques, valeur publique) a une valeur par défaut dans `.env.production`.
