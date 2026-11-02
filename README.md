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
| `api/sync-beds24.ts` | synchronise Beds24 → `availability_blocks` (tâche planifiée Vercel quotidienne, ou webhook `?key=CRON_SECRET`) |
| `supabase/schema.sql` | schéma, RLS et fonction `replace_beds24_blocks` (ré-exécutable dans le SQL Editor) |

Le navigateur ne détient aucune clé Supabase : toutes les lectures/écritures passent par `api/*` avec la clé `service_role`.

## Variables d'environnement (Vercel)

Voir `.env.example` : `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `BEDS24_TOKEN`, `CRON_SECRET`.
`VITE_RYBBIT_SITE_ID` (statistiques, valeur publique) a une valeur par défaut dans `.env.production`.
