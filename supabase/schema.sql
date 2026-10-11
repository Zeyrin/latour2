-- À exécuter dans Supabase > SQL Editor
create table public.booking_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 1 and 100),
  email text not null check (char_length(email) between 3 and 200 and email like '%@%'),
  phone text check (char_length(phone) <= 40),
  universe text check (universe in ('suites','spa','evenements')),
  arrival date,
  departure date,
  guests int check (guests between 1 and 500),
  message text check (char_length(message) <= 2000),
  handled boolean not null default false
);

alter table public.booking_requests enable row level security;

-- Le public peut seulement ajouter une demande (ni lire, ni modifier, ni supprimer).
create policy "insert public" on public.booking_requests for insert to anon with check (true);

-- ─── Réservation : choix de la suite et disponibilités ──────────────────────

alter table public.booking_requests
  add column if not exists suite text check (suite in ('eau','feu','bois'));

-- Périodes indisponibles, saisies par le château (Table Editor de Supabase).
-- resource : 'eau', 'feu', 'bois' (suites), 'spa' ou 'evenements'.
-- start_date inclus, end_date exclu : pour une suite, end_date est le jour du départ
-- des occupants, qui peut être le jour d'arrivée de nouveaux hôtes.
-- Exemple : nuits du 10 au 12 mai occupées → start_date 2027-05-10, end_date 2027-05-13.
create table if not exists public.availability_blocks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  resource text not null check (resource in ('eau','feu','bois','spa','evenements')),
  start_date date not null,
  end_date date not null,
  note text,
  check (end_date > start_date)
);

alter table public.availability_blocks enable row level security;
-- Aucune politique pour le public sur la table : la note interne reste privée.

-- Vue publique : uniquement les dates à venir, sans la note.
create or replace view public.availability
with (security_invoker = false) as
  select resource, start_date, end_date
  from public.availability_blocks
  where end_date >= current_date;

grant select on public.availability to anon;
