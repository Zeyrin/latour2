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
alter table public.bookings add column if not exists client_ip text;

alter table public.bookings enable row level security;
-- Aucune politique : table privée (coordonnées des clients).

-- Deux réservations actives ne peuvent jamais se chevaucher sur une même suite,
-- même si deux clients paient au même instant.
alter table public.bookings drop constraint if exists bookings_no_overlap;
alter table public.bookings add constraint bookings_no_overlap
  exclude using gist (suite with =, daterange(arrival, departure) with &&)
  where (status in ('pending','paid'));

drop index if exists public.bookings_email_created_idx;
create index if not exists bookings_email_lower_created_idx on public.bookings (lower(email), created_at);
create index if not exists bookings_ip_created_idx on public.bookings (client_ip, created_at);
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

drop function if exists public.create_pending_booking(text, date, date, int, int, text, text, text, text, text, int, int);
-- Crée une réservation en attente de paiement si la suite est libre.
-- Renvoie {"ok":true,"id":…} ou {"ok":false,"error":"unavailable"|"rate_limited"}.
create or replace function public.create_pending_booking(
  p_suite text, p_arrival date, p_departure date, p_nights int, p_guests int,
  p_name text, p_email text, p_phone text, p_message text, p_lang text,
  p_amount_total int, p_hold_minutes int, p_client_ip text default null
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
  -- Par adresse IP : 3 paiements en cours à la fois et 10 tentatives par heure, pour qu'on ne puisse
  -- pas bloquer tout le calendrier avec des adresses e-mail jetables.
  if p_client_ip is not null and (
       (select count(*) from bookings where client_ip = p_client_ip and status = 'pending' and hold_until > now()) >= 3
    or (select count(*) from bookings where client_ip = p_client_ip and created_at > now() - interval '1 hour') >= 10) then
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

  insert into bookings (suite, arrival, departure, nights, guests, name, email, phone, message, lang, amount_total, hold_until, client_ip)
    values (p_suite, p_arrival, p_departure, p_nights, p_guests, p_name, p_email, p_phone, p_message, p_lang,
            p_amount_total, now() + make_interval(mins => p_hold_minutes), p_client_ip)
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

-- Remboursement intégral reçu de Stripe : dates libérées. Renvoie la réservation (ou null).
drop function if exists public.mark_booking_refunded(text);
create or replace function public.mark_booking_refunded(p_payment_intent text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare b bookings;
begin
  update bookings set status = 'refunded'
    where stripe_payment_intent = p_payment_intent and status in ('paid','conflict')
    returning * into b;
  return case when b.id is null then null else to_jsonb(b) end;
end;
$$;

-- Réservations payées pas encore créées dans Beds24 (retentées par api/sync-beds24).
create or replace function public.bookings_missing_in_beds24()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(to_jsonb(b)), '[]'::jsonb) from bookings b
  where status = 'paid' and beds24_booking_id is null and departure > current_date
    and paid_at < now() - interval '2 minutes';
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
revoke all on function public.bookings_missing_in_beds24() from public, anon, authenticated;
grant execute on function public.bookings_missing_in_beds24() to service_role;
grant execute on function public.attach_stripe_session(uuid, text) to service_role;
grant execute on function public.set_beds24_result(uuid, text, text) to service_role;
grant execute on function public.get_booking(uuid) to service_role;
revoke all on function public.create_pending_booking(text, date, date, int, int, text, text, text, text, text, int, int, text) from public, anon, authenticated;
revoke all on function public.mark_booking_paid(uuid, text, text, int) from public, anon, authenticated;
revoke all on function public.release_booking(uuid, text) from public, anon, authenticated;
revoke all on function public.mark_booking_refunded(text) from public, anon, authenticated;
grant execute on function public.create_pending_booking(text, date, date, int, int, text, text, text, text, text, int, int, text) to service_role;
grant execute on function public.mark_booking_paid(uuid, text, text, int) to service_role;
grant execute on function public.release_booking(uuid, text) to service_role;
grant execute on function public.mark_booking_refunded(text) to service_role;

-- ─── Annulation et modification par le client (lien « Gérer ma réservation ») ───
-- Section ré-exécutable sans risque.
-- manage_token : secret aléatoire du lien envoyé au client (e-mail et page de confirmation).
-- payments     : paiements Stripe de la réservation [{pi, amount, refunded, session?}], en centimes.
--                Vide tant que la réservation n'a jamais été modifiée : le paiement initial est alors
--                stripe_payment_intent pour amount_total (voir booking_payments).
-- Pendant 24 h après le paiement, le client peut annuler (remboursement intégral automatique)
-- ou changer de dates, de suite ou de nombre de personnes (différence payée ou remboursée).

alter table public.bookings add column if not exists manage_token text;
update public.bookings
  set manage_token = replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
  where manage_token is null;
alter table public.bookings alter column manage_token
  set default replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
alter table public.bookings alter column manage_token set not null;
create unique index if not exists bookings_manage_token_idx on public.bookings (manage_token);
alter table public.bookings add column if not exists payments jsonb not null default '[]'::jsonb;
alter table public.bookings add column if not exists amount_refunded int not null default 0;
alter table public.bookings add column if not exists change_count int not null default 0;
alter table public.bookings add column if not exists changed_at timestamptz;
alter table public.bookings add column if not exists cancelled_at timestamptz;

-- Paiements Stripe d'une réservation, avec le paiement initial si elle n'a jamais été modifiée.
create or replace function public.booking_payments(b public.bookings)
returns jsonb
language sql
stable
set search_path = public
as $$
  select case
    when jsonb_array_length(b.payments) > 0 then b.payments
    when b.stripe_payment_intent is not null then jsonb_build_array(jsonb_build_object('pi', b.stripe_payment_intent, 'amount', b.amount_total, 'refunded', 0))
    else '[]'::jsonb
  end;
$$;

-- Réservation retrouvée par le secret du lien « Gérer ma réservation » (null si inconnu).
create or replace function public.get_booking_by_token(p_token text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select to_jsonb(b) || jsonb_build_object('payments', booking_payments(b))
  from bookings b
  where char_length(p_token) >= 32 and b.manage_token = p_token;
$$;

-- La réservation p_id peut-elle passer sur cette suite et ces dates ?
-- Ses propres nuits ne comptent pas : ni la réservation elle-même, ni sa copie revenue de Beds24.
create or replace function public.change_available(p_id uuid, p_suite text, p_arrival date, p_departure date)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
      select 1
      from generate_series(p_arrival, p_departure - 1, interval '1 day') as night(d)
      join availability_blocks a on a.resource = p_suite and a.start_date <= night.d::date and a.end_date > night.d::date
      join bookings b on b.id = p_id
      where not (a.source = 'beds24' and b.suite = p_suite and night.d::date >= b.arrival and night.d::date < b.departure))
    and not exists (
      select 1 from bookings o
      where o.id <> p_id and o.suite = p_suite and o.arrival < p_departure and o.departure > p_arrival
        and (o.status = 'paid' or (o.status = 'pending' and o.hold_until > now())));
$$;

-- Annulation par le client, une fois les remboursements Stripe faits : dates libérées.
-- Renvoie {"changed": bool, "booking": {…}} ; changed = false si elle était déjà annulée par le client.
create or replace function public.guest_cancel_booking(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare b bookings; pays jsonb;
begin
  select * into b from bookings where id = p_id for update;
  if not found then return null; end if;
  if b.cancelled_at is not null or b.status not in ('paid','refunded') then
    return jsonb_build_object('changed', false, 'booking', to_jsonb(b));
  end if;
  select coalesce(jsonb_agg(p || jsonb_build_object('refunded', (p->>'amount')::int)), '[]'::jsonb) into pays
    from jsonb_array_elements(booking_payments(b)) p;
  update bookings set status = 'refunded', cancelled_at = now(), payments = pays,
      amount_refunded = (select coalesce(sum((p->>'amount')::int), 0) from jsonb_array_elements(pays) p)
    where id = p_id returning * into b;
  return jsonb_build_object('changed', true, 'booking', to_jsonb(b));
end;
$$;

-- Modification par le client : nouvelle suite, nouvelles dates ou nouveau nombre de personnes.
-- p_expected_amount : montant de la réservation quand le client a demandé la modification (refus si elle a changé entre-temps).
-- p_payment : supplément déjà payé {pi, amount, refunded: 0, session} (null si le nouveau prix n'est pas plus élevé).
-- Renvoie {"ok": true, "changed": bool, "booking": {…}, "refunds": [{pi, amount, key}]} ou {"ok": false, "error": …}.
-- Les remboursements renvoyés (baisse de prix) sont à faire dans Stripe par l'appelant.
create or replace function public.apply_booking_change(
  p_id uuid, p_expected_amount int, p_suite text, p_arrival date, p_departure date,
  p_nights int, p_guests int, p_amount_total int, p_payment jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  b bookings;
  pays jsonb;
  remaining int;
  available int;
  part int;
  i int;
  refunds jsonb := '[]'::jsonb;
begin
  perform pg_advisory_xact_lock(hashtext('booking:' || p_suite));
  select * into b from bookings where id = p_id for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if p_payment is not null and exists (select 1 from jsonb_array_elements(b.payments) p where p->>'session' = p_payment->>'session') then
    return jsonb_build_object('ok', true, 'changed', false, 'booking', to_jsonb(b), 'refunds', refunds);
  end if;
  if b.status <> 'paid' or b.cancelled_at is not null then return jsonb_build_object('ok', false, 'error', 'status'); end if;
  if b.amount_total <> p_expected_amount then return jsonb_build_object('ok', false, 'error', 'stale'); end if;
  if not change_available(p_id, p_suite, p_arrival, p_departure) then return jsonb_build_object('ok', false, 'error', 'unavailable'); end if;

  pays := booking_payments(b);
  if p_payment is not null then pays := pays || jsonb_build_array(p_payment); end if;
  select coalesce(sum((p->>'amount')::int - (p->>'refunded')::int), 0) - p_amount_total into remaining
    from jsonb_array_elements(pays) p;
  if remaining < 0 then return jsonb_build_object('ok', false, 'error', 'amount'); end if;

  -- Baisse de prix : remboursée sur les paiements les plus récents d'abord.
  if remaining > 0 then
    for i in reverse jsonb_array_length(pays) - 1 .. 0 loop
      exit when remaining = 0;
      available := (pays->i->>'amount')::int - (pays->i->>'refunded')::int;
      part := least(available, remaining);
      if part > 0 then
        pays := jsonb_set(pays, array[i::text, 'refunded'], to_jsonb((pays->i->>'refunded')::int + part));
        refunds := refunds || jsonb_build_array(jsonb_build_object('pi', pays->i->>'pi', 'amount', part,
          'key', 'change/' || p_id || '/' || (b.change_count + 1) || '/' || (pays->i->>'pi')));
        remaining := remaining - part;
      end if;
    end loop;
  end if;

  begin
    update bookings set suite = p_suite, arrival = p_arrival, departure = p_departure, nights = p_nights, guests = p_guests,
        amount_total = p_amount_total, payments = pays,
        amount_refunded = amount_refunded + (select coalesce(sum((r->>'amount')::int), 0) from jsonb_array_elements(refunds) r),
        change_count = change_count + 1, changed_at = now()
      where id = p_id returning * into b;
  exception when exclusion_violation then
    return jsonb_build_object('ok', false, 'error', 'unavailable');
  end;
  return jsonb_build_object('ok', true, 'changed', true, 'booking', to_jsonb(b), 'refunds', refunds);
end;
$$;

revoke all on function public.booking_payments(public.bookings) from public, anon, authenticated;
revoke all on function public.get_booking_by_token(text) from public, anon, authenticated;
revoke all on function public.change_available(uuid, text, date, date) from public, anon, authenticated;
revoke all on function public.guest_cancel_booking(uuid) from public, anon, authenticated;
revoke all on function public.apply_booking_change(uuid, int, text, date, date, int, int, int, jsonb) from public, anon, authenticated;
grant execute on function public.booking_payments(public.bookings) to service_role;
grant execute on function public.get_booking_by_token(text) to service_role;
grant execute on function public.change_available(uuid, text, date, date) to service_role;
grant execute on function public.guest_cancel_booking(uuid) to service_role;
grant execute on function public.apply_booking_change(uuid, int, text, date, date, int, int, int, jsonb) to service_role;
