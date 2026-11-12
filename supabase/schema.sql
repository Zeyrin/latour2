-- À exécuter dans Supabase > SQL Editor (fichier ré-exécutable sans risque)
create table if not exists public.booking_requests (
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

-- Aucune politique pour le public : les demandes passent uniquement par api/booking-request
-- (clé service_role côté serveur). L'ancienne politique d'insertion publique est retirée.
drop policy if exists "insert public" on public.booking_requests;

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

-- Vue des dates à venir, sans la note, lue uniquement par api/availability (service_role).
-- security_invoker : la vue respecte la RLS de la table, donc rien n'est lisible avec la clé anon.
create or replace view public.availability
with (security_invoker = true) as
  select resource, start_date, end_date
  from public.availability_blocks
  where end_date >= current_date;

revoke all on public.availability from anon, authenticated;
grant select on public.availability to service_role;

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

-- ─── Réservation en ligne avec paiement Stripe ──────────────────────────────
-- Section ré-exécutable sans risque.
-- Cycle de vie d'une réservation (colonne status) :
--   pending   dates bloquées pendant le paiement Stripe Checkout (jusqu'à hold_until)
--   paid      payée : dates bloquées définitivement
--   expired   paiement non abouti dans le délai : dates libérées
--   cancelled le client a quitté la page de paiement : dates libérées
--   refunded  remboursée intégralement (depuis Stripe) : dates libérées
--   conflict  payée alors que les dates avaient été reprises entre-temps : à rembourser à la main
-- Écrite uniquement par api/checkout, api/stripe-webhook et api/booking-status (service_role).

create schema if not exists extensions;
create extension if not exists btree_gist with schema extensions;

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  status text not null default 'pending'
    check (status in ('pending','paid','expired','cancelled','refunded','conflict')),
  suite text not null check (suite in ('terre','eau','metal','feu','bois')),
  arrival date not null,
  departure date not null,
  nights int not null check (nights between 1 and 60),
  guests int not null check (guests between 1 and 20),
  name text not null check (char_length(name) between 1 and 100),
  email text not null check (char_length(email) between 3 and 200 and email like '%@%'),
  phone text check (char_length(phone) <= 40),
  message text check (char_length(message) <= 2000),
  lang text not null default 'fr' check (lang in ('fr','en')),
  amount_total int not null check (amount_total > 0),
  currency text not null default 'eur',
  hold_until timestamptz not null,
  stripe_session_id text unique,
  stripe_payment_intent text,
  paid_at timestamptz,
  beds24_booking_id text,
  beds24_error text,
  check (departure > arrival)
);

alter table public.bookings enable row level security;
-- Aucune politique : table privée (coordonnées des clients).

-- Deux réservations actives ne peuvent jamais se chevaucher sur une même suite,
-- même si deux clients paient au même instant.
alter table public.bookings drop constraint if exists bookings_no_overlap;
alter table public.bookings add constraint bookings_no_overlap
  exclude using gist (suite with =, daterange(arrival, departure) with &&)
  where (status in ('pending','paid'));

create index if not exists bookings_email_created_idx on public.bookings (email, created_at);
create index if not exists bookings_payment_intent_idx on public.bookings (stripe_payment_intent);

-- Le calendrier du site tient compte des réservations payées et des paiements en cours.
create or replace view public.availability
with (security_invoker = true) as
  select resource, start_date, end_date
  from public.availability_blocks
  where end_date >= current_date
  union all
  select suite, arrival, departure
  from public.bookings
  where departure >= current_date
    and (status = 'paid' or (status = 'pending' and hold_until > now()));

revoke all on public.availability from anon, authenticated;
grant select on public.availability to service_role;

-- Crée une réservation en attente de paiement si la suite est libre.
-- Renvoie {"ok":true,"id":…} ou {"ok":false,"error":"unavailable"|"rate_limited"}.
create or replace function public.create_pending_booking(
  p_suite text, p_arrival date, p_departure date, p_nights int, p_guests int,
  p_name text, p_email text, p_phone text, p_message text, p_lang text,
  p_amount_total int, p_hold_minutes int
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare new_id uuid;
begin
  -- Une suite à la fois : les vérifications ci-dessous ne peuvent pas se croiser.
  perform pg_advisory_xact_lock(hashtext('booking:' || p_suite));

  -- Anti-abus : au plus 5 tentatives de paiement par adresse e-mail et par heure.
  if (select count(*) from bookings where lower(email) = lower(p_email) and created_at > now() - interval '1 hour') >= 5 then
    return jsonb_build_object('ok', false, 'error', 'rate_limited');
  end if;

  -- Paiements abandonnés dont le délai est passé (si le webhook d'expiration n'est pas arrivé).
  update bookings set status = 'expired'
    where suite = p_suite and status = 'pending' and hold_until <= now();

  -- Périodes bloquées à la main ou par Beds24 (Airbnb, Booking…).
  if exists (select 1 from availability_blocks
             where resource = p_suite and start_date < p_departure and end_date > p_arrival) then
    return jsonb_build_object('ok', false, 'error', 'unavailable');
  end if;

  insert into bookings (suite, arrival, departure, nights, guests, name, email, phone, message, lang, amount_total, hold_until)
    values (p_suite, p_arrival, p_departure, p_nights, p_guests, p_name, p_email, p_phone, p_message, p_lang,
            p_amount_total, now() + make_interval(mins => p_hold_minutes))
    returning id into new_id;
  return jsonb_build_object('ok', true, 'id', new_id);
exception when exclusion_violation then
  return jsonb_build_object('ok', false, 'error', 'unavailable');
end;
$$;

-- Marque une réservation payée (webhook Stripe ou page de confirmation). Idempotent.
-- Renvoie {"status": …, "changed": bool, "booking": {…}} ou {"status": "not_found"}.
create or replace function public.mark_booking_paid(p_id uuid, p_session_id text, p_payment_intent text, p_amount_total int)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare b bookings;
begin
  select * into b from bookings where id = p_id for update;
  if not found or (b.stripe_session_id is not null and b.stripe_session_id <> p_session_id) then
    return jsonb_build_object('status', 'not_found');
  end if;
  update bookings set stripe_session_id = p_session_id where id = p_id and stripe_session_id is null;
  if b.status in ('paid','conflict','refunded') then
    return jsonb_build_object('status', b.status, 'changed', false, 'booking', to_jsonb(b));
  end if;
  if p_amount_total is distinct from b.amount_total then
    update bookings set status = 'conflict', stripe_payment_intent = p_payment_intent, paid_at = now()
      where id = p_id returning * into b;
    return jsonb_build_object('status', b.status, 'changed', true, 'booking', to_jsonb(b), 'reason', 'amount_mismatch');
  end if;
  -- Dates prises entre-temps sur un autre canal (Airbnb, Booking… via Beds24) ou bloquées à la main.
  if exists (select 1 from availability_blocks
             where resource = b.suite and start_date < b.departure and end_date > b.arrival) then
    update bookings set status = 'conflict', stripe_payment_intent = p_payment_intent, paid_at = now()
      where id = p_id returning * into b;
    return jsonb_build_object('status', b.status, 'changed', true, 'booking', to_jsonb(b), 'reason', 'blocked');
  end if;
  begin
    update bookings set status = 'paid', stripe_payment_intent = p_payment_intent, paid_at = now()
      where id = p_id returning * into b;
  exception when exclusion_violation then
    -- La réservation avait expiré et quelqu'un d'autre a pris les dates.
    update bookings set status = 'conflict', stripe_payment_intent = p_payment_intent, paid_at = now()
      where id = p_id returning * into b;
  end;
  return jsonb_build_object('status', b.status, 'changed', true, 'booking', to_jsonb(b));
end;
$$;

-- Passe une réservation en attente à expired / cancelled (dates libérées). Sans effet sur une réservation payée.
create or replace function public.release_booking(p_id uuid, p_status text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare result text;
begin
  if p_status not in ('expired','cancelled') then raise exception 'statut invalide'; end if;
  update bookings set status = p_status where id = p_id and status = 'pending' returning status into result;
  return coalesce(result, (select status from bookings where id = p_id));
end;
$$;

-- Remboursement intégral reçu de Stripe : dates libérées.
create or replace function public.mark_booking_refunded(p_payment_intent text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare result text;
begin
  update bookings set status = 'refunded'
    where stripe_payment_intent = p_payment_intent and status in ('paid','conflict')
    returning status into result;
  return result;
end;
$$;

-- Rattache la session Stripe Checkout créée pour la réservation.
create or replace function public.attach_stripe_session(p_id uuid, p_session_id text)
returns void
language sql
security definer
set search_path = public
as $$
  update bookings set stripe_session_id = p_session_id where id = p_id and stripe_session_id is null;
$$;

-- Résultat de l'envoi de la réservation payée vers Beds24 (pour fermer les dates sur Airbnb, Booking…).
create or replace function public.set_beds24_result(p_id uuid, p_beds24_id text, p_error text)
returns void
language sql
security definer
set search_path = public
as $$
  update bookings set beds24_booking_id = coalesce(p_beds24_id, beds24_booking_id), beds24_error = p_error where id = p_id;
$$;

-- Lecture d'une réservation par son identifiant (page de confirmation, webhook).
create or replace function public.get_booking(p_id uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select to_jsonb(b) from bookings b where id = p_id;
$$;

revoke all on function public.attach_stripe_session(uuid, text) from public, anon, authenticated;
revoke all on function public.set_beds24_result(uuid, text, text) from public, anon, authenticated;
revoke all on function public.get_booking(uuid) from public, anon, authenticated;
grant execute on function public.attach_stripe_session(uuid, text) to service_role;
grant execute on function public.set_beds24_result(uuid, text, text) to service_role;
grant execute on function public.get_booking(uuid) to service_role;
revoke all on function public.create_pending_booking(text, date, date, int, int, text, text, text, text, text, int, int) from public, anon, authenticated;
revoke all on function public.mark_booking_paid(uuid, text, text, int) from public, anon, authenticated;
revoke all on function public.release_booking(uuid, text) from public, anon, authenticated;
revoke all on function public.mark_booking_refunded(text) from public, anon, authenticated;
grant execute on function public.create_pending_booking(text, date, date, int, int, text, text, text, text, text, int, int) to service_role;
grant execute on function public.mark_booking_paid(uuid, text, text, int) to service_role;
grant execute on function public.release_booking(uuid, text) to service_role;
grant execute on function public.mark_booking_refunded(text) to service_role;
