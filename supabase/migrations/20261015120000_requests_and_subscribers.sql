-- Consultation requests and newsletter subscribers (ADR-002, #36).
--
-- Anonymous visitors write personal data, so:
--   * RLS is on and there are no policies: the public API can read, change or delete nothing.
--   * Direct table privileges are revoked from anon and authenticated.
--   * Every public write goes through a SECURITY DEFINER function granted to anon only.
--
-- The anon key is public, so anyone can call these functions directly, without the
-- server action in front of them. The functions are therefore safe on their own: CHECK
-- constraints validate every value, confirm and unsubscribe verify a signed token here in
-- SQL, and a global ceiling backs up the per-ip_hash rate limit (a direct caller can
-- invent ip_hash values).

-- Helpers live outside the exposed `public` schema, so PostgREST never serves them.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.consultation_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null
    check (char_length(btrim(name)) >= 1 and char_length(name) <= 120),
  email text not null
    check (
      email = lower(email)
      and char_length(email) <= 254
      and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
    ),
  phone text
    check (phone ~ '^\+?[0-9 ().-]{6,31}$'),
  service text not null
    check (
      service in (
        'web-design',
        'web-development',
        'content-writing',
        'social-media-management',
        'website-maintenance'
      )
    ),
  message text not null
    check (char_length(btrim(message)) >= 10 and char_length(message) <= 5000),
  locale text not null check (locale in ('en', 'pt')),
  consent_at timestamptz not null,
  status text not null default 'new'
    check (status in ('new', 'contacted', 'scheduled', 'closed', 'spam')),
  ip_hash text not null check (ip_hash ~ '^[0-9a-f]{64}$'),
  notified_at timestamptz
);

comment on table public.consultation_requests is
  'Consultation requests from the contact form. Written only by submit_consultation_request().';
comment on column public.consultation_requests.ip_hash is
  'Salted SHA-256 of the visitor IP (IP_HASH_SALT). Never the raw IP.';

create index consultation_requests_created_at_idx
  on public.consultation_requests (created_at desc);

create table public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique
    check (
      email = lower(email)
      and char_length(email) <= 254
      and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
    ),
  locale text not null check (locale in ('en', 'pt')),
  status text not null default 'pending'
    check (status in ('pending', 'subscribed', 'unsubscribed')),
  -- Also the issue time of the current confirmation link (whole seconds, see
  -- subscribe_newsletter), so a new subscription invalidates older links.
  consent_at timestamptz not null,
  confirmed_at timestamptz,
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now(),
  check (status <> 'subscribed' or confirmed_at is not null),
  check (status <> 'unsubscribed' or unsubscribed_at is not null)
);

comment on table public.newsletter_subscribers is
  'Double opt-in newsletter list. Written only by the newsletter functions.';

-- One row per public write attempt, for the rate limits. Rows older than an hour are
-- deleted on every write, so ip_hash values are not kept longer than needed.
create table private.write_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  ip_hash text not null check (ip_hash ~ '^[0-9a-f]{64}$'),
  action text not null check (action in ('consultation', 'newsletter'))
);

create index write_events_ip_hash_created_at_idx
  on private.write_events (ip_hash, created_at);
create index write_events_created_at_idx
  on private.write_events (created_at);

-- ---------------------------------------------------------------------------
-- Access: RLS with no policies, and no direct table privileges for the API roles.
-- ---------------------------------------------------------------------------

alter table public.consultation_requests enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table private.write_events enable row level security;

revoke all on table public.consultation_requests from anon, authenticated;
revoke all on table public.newsletter_subscribers from anon, authenticated;
revoke all on table private.write_events from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Private helpers
-- ---------------------------------------------------------------------------

-- Rate limits: 5 writes per ip_hash per hour, and 100 public writes per hour in total.
-- One transaction-scoped advisory lock serialises all public writes, so two concurrent
-- requests cannot both pass the count. Traffic is low enough for a single lock.
create function private.enforce_write_limit(p_ip_hash text, p_action text)
returns void
language plpgsql
set search_path = ''
as $$
declare
  per_ip_limit constant int := 5;
  global_limit constant int := 100;
begin
  perform pg_advisory_xact_lock(hashtextextended('nortbrand.public_writes', 0));

  delete from private.write_events where created_at < now() - interval '1 hour';

  if (select count(*) from private.write_events) >= global_limit then
    raise exception 'rate_limited' using errcode = 'PT429', detail = 'global';
  end if;

  if (
    select count(*) from private.write_events where ip_hash = p_ip_hash
  ) >= per_ip_limit then
    raise exception 'rate_limited' using errcode = 'PT429', detail = 'ip';
  end if;

  insert into private.write_events (ip_hash, action) values (p_ip_hash, p_action);
end;
$$;

-- The signing secret, from Supabase Vault. It is set by hand per environment (see
-- docs/guides/database.md) and must equal NEWSLETTER_TOKEN_SECRET.
create function private.newsletter_token_secret()
returns text
language plpgsql
stable
set search_path = ''
as $$
declare
  secret text;
begin
  select decrypted_secret into secret
  from vault.decrypted_secrets
  where name = 'newsletter_token_secret';

  if secret is null or char_length(secret) < 32 then
    raise exception 'newsletter_token_secret is missing from Vault or shorter than 32 characters';
  end if;

  return secret;
end;
$$;

-- base64url(HMAC-SHA256(secret, message)), unpadded. The same as Node's
-- createHmac('sha256', secret).update(message).digest('base64url').
create function private.newsletter_token(p_message text)
returns text
language sql
stable
set search_path = ''
as $$
  select translate(
    encode(extensions.hmac(p_message, private.newsletter_token_secret(), 'sha256'), 'base64'),
    '+/=',
    '-_'
  );
$$;

revoke all on all functions in schema private from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Public functions (granted to anon only)
-- ---------------------------------------------------------------------------

create function public.submit_consultation_request(
  p_name text,
  p_email text,
  p_phone text,
  p_service text,
  p_message text,
  p_locale text,
  p_ip_hash text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_id uuid;
begin
  perform private.enforce_write_limit(p_ip_hash, 'consultation');

  insert into public.consultation_requests
    (name, email, phone, service, message, locale, consent_at, ip_hash)
  values
    (p_name, p_email, p_phone, p_service, p_message, p_locale, now(), p_ip_hash)
  returning id into new_id;

  return new_id;
end;
$$;

-- Marks the team alert as sent. Only for fresh, unnotified rows, so a caller cannot
-- rewrite history on old requests.
create function public.mark_consultation_notified(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.consultation_requests
  set notified_at = now()
  where id = p_id
    and notified_at is null
    and created_at > now() - interval '10 minutes';

  return found;
end;
$$;

-- Creates or refreshes a pending subscription and returns the confirmation link's issue
-- time (Unix seconds). An already subscribed email is left unchanged, and the result
-- looks the same, so a caller cannot tell whether an address is on the list.
create function public.subscribe_newsletter(p_email text, p_locale text, p_ip_hash text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  issued_at timestamptz := date_trunc('second', now());
begin
  perform private.enforce_write_limit(p_ip_hash, 'newsletter');

  insert into public.newsletter_subscribers (email, locale, status, consent_at)
  values (p_email, p_locale, 'pending', issued_at)
  on conflict (email) do update
    set status = 'pending',
        locale = excluded.locale,
        consent_at = excluded.consent_at
    where public.newsletter_subscribers.status <> 'subscribed';

  return extract(epoch from issued_at)::bigint;
end;
$$;

-- Confirms a subscription. The token is
-- base64url(HMAC-SHA256(secret, 'confirm|' || email || '|' || issued_at)) and is valid for
-- 7 days. For a pending row, issued_at must be the row's latest issue time. An already
-- subscribed email returns true for any valid token, matching subscribe_newsletter.
create function public.confirm_newsletter(p_email text, p_issued_at bigint, p_token text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  issued_at timestamptz;
  current_status text;
begin
  if p_email is null or p_issued_at is null or p_token is null then
    return false;
  end if;

  if p_token <> private.newsletter_token('confirm|' || p_email || '|' || p_issued_at) then
    return false;
  end if;

  issued_at := to_timestamp(p_issued_at);
  if issued_at > now() or issued_at < now() - interval '7 days' then
    return false;
  end if;

  select status into current_status
  from public.newsletter_subscribers
  where email = p_email
  for update;

  if current_status = 'subscribed' then
    return true;
  end if;

  update public.newsletter_subscribers
  set status = 'subscribed', confirmed_at = now()
  where email = p_email
    and status = 'pending'
    and consent_at = issued_at;

  return found;
end;
$$;

-- Unsubscribes an email. The token is base64url(HMAC-SHA256(secret, 'unsubscribe|' ||
-- email)) and does not expire, so the link in every newsletter keeps working. A valid
-- token returns true whether or not the email is on the list.
create function public.unsubscribe_newsletter(p_email text, p_token text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_email is null or p_token is null then
    return false;
  end if;

  if p_token <> private.newsletter_token('unsubscribe|' || p_email) then
    return false;
  end if;

  update public.newsletter_subscribers
  set status = 'unsubscribed', unsubscribed_at = now()
  where email = p_email
    and status <> 'unsubscribed';

  return true;
end;
$$;

-- Functions are executable by PUBLIC by default, and Supabase also grants new public
-- functions to anon and authenticated. Reset both, then grant anon only.
revoke all on function public.submit_consultation_request(text, text, text, text, text, text, text)
  from public, anon, authenticated;
revoke all on function public.mark_consultation_notified(uuid)
  from public, anon, authenticated;
revoke all on function public.subscribe_newsletter(text, text, text)
  from public, anon, authenticated;
revoke all on function public.confirm_newsletter(text, bigint, text)
  from public, anon, authenticated;
revoke all on function public.unsubscribe_newsletter(text, text)
  from public, anon, authenticated;

grant execute on function public.submit_consultation_request(text, text, text, text, text, text, text)
  to anon;
grant execute on function public.mark_consultation_notified(uuid) to anon;
grant execute on function public.subscribe_newsletter(text, text, text) to anon;
grant execute on function public.confirm_newsletter(text, bigint, text) to anon;
grant execute on function public.unsubscribe_newsletter(text, text) to anon;
