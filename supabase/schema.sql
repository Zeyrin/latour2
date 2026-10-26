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
grant insert on public.booking_requests to anon;

-- ─── Réservation : choix de la suite et disponibilités ──────────────────────
-- Section ré-exécutable sans risque (elle met aussi à jour une version précédente).

alter table public.booking_requests add column if not exists suite text;
alter table public.booking_requests drop constraint if exists booking_requests_suite_check;
alter table public.booking_requests add constraint booking_requests_suite_check
  check (suite in ('terre','eau','metal','feu','bois'));

-- Périodes indisponibles.
-- resource : 'terre', 'eau', 'metal', 'feu', 'bois' (suites), 'spa' ou 'evenements'.
-- start_date inclus, end_date exclu : pour une suite, end_date est le jour du départ
-- des occupants, qui peut être le jour d'arrivée de nouveaux hôtes.
-- Exemple : nuits du 10 au 12 mai occupées → start_date 2027-05-10, end_date 2027-05-13.
-- source : 'manuel' (saisi dans le Table Editor) ou 'beds24' (écrit par api/sync-beds24,
-- ne pas modifier à la main : ces lignes sont remplacées à chaque synchronisation).
create table if not exists public.availability_blocks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  resource text not null,
  start_date date not null,
  end_date date not null,
  note text,
  check (end_date > start_date)
);
alter table public.availability_blocks add column if not exists source text not null default 'manuel';
alter table public.availability_blocks drop constraint if exists availability_blocks_resource_check;
alter table public.availability_blocks add constraint availability_blocks_resource_check
  check (resource in ('terre','eau','metal','feu','bois','spa','evenements'));
alter table public.availability_blocks drop constraint if exists availability_blocks_source_check;
alter table public.availability_blocks add constraint availability_blocks_source_check
  check (source in ('manuel','beds24'));

alter table public.availability_blocks enable row level security;
-- Aucune politique pour le public sur la table : la note interne reste privée.

-- Vue publique : uniquement les dates à venir, sans la note.
create or replace view public.availability
with (security_invoker = false) as
  select resource, start_date, end_date
  from public.availability_blocks
  where end_date >= current_date;

grant select on public.availability to anon;

-- Remplacement atomique des périodes issues de Beds24 (appelé par api/sync-beds24).
create or replace function public.replace_beds24_blocks(blocks jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare inserted integer;
begin
  delete from availability_blocks where source = 'beds24';
  insert into availability_blocks (resource, start_date, end_date, source)
    select b->>'resource', (b->>'start_date')::date, (b->>'end_date')::date, 'beds24'
    from jsonb_array_elements(blocks) as b;
  get diagnostics inserted = row_count;
  return inserted;
end;
$$;

revoke all on function public.replace_beds24_blocks(jsonb) from public, anon, authenticated;
grant execute on function public.replace_beds24_blocks(jsonb) to service_role;
