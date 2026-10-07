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
