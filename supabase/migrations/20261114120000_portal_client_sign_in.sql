-- Client sign-in for the portal (ADR-009, #131): email + Project ID, then a 6-digit code.
--
-- Supabase Auth sends and verifies the code. These functions hold the rules Supabase
-- doesn't know about, and each one is safe to call directly with the public key:
--   * portal_begin_client_sign_in   rate limit; checks email + Project ID, answering only
--                                   ok / no_match / locked; records that a code was sent.
--   * portal_code_state             active / expired / locked, checked before a verify.
--   * portal_register_wrong_code    counts wrong codes since the last code; the last
--                                   allowed miss locks sign-in for lockout_minutes.
--   * portal_complete_client_sign_in  run as the newly signed-in user: activates their
--                                   client row and returns the project, or null.
-- Limits come from portal_settings (code_max_tries, lockout_minutes).

-- How long a code lives, in minutes. Matches the Auth setting (otp_expiry = 600 s).
create function private.portal_code_lifetime()
returns interval
language sql
immutable
set search_path = ''
as $$
  select interval '10 minutes';
$$;

-- One row per code request, for the rate limits. Pruned after an hour.
create table private.portal_rate_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  ip_hash text not null check (ip_hash ~ '^[0-9a-f]{64}$')
);

create index portal_rate_events_ip_created_idx on private.portal_rate_events (ip_hash, created_at);
create index portal_rate_events_created_idx on private.portal_rate_events (created_at);

alter table private.portal_rate_events enable row level security;
revoke all on table private.portal_rate_events from public, anon, authenticated;

alter table private.portal_sign_in_attempts
  drop constraint portal_sign_in_attempts_outcome_check,
  add constraint portal_sign_in_attempts_outcome_check
    check (outcome in ('code_sent', 'wrong_code', 'locked', 'signed_in'));

-- 10 code requests per ip_hash per hour, and 200 in total. Serialised like the marketing
-- write limit, so concurrent requests can't both pass the count.
create function private.enforce_portal_sign_in_limit(p_ip_hash text)
returns void
language plpgsql
set search_path = ''
as $$
declare
  per_ip_limit constant int := 10;
  global_limit constant int := 200;
begin
  perform pg_advisory_xact_lock(hashtextextended('nortbrand.portal_sign_in', 0));

  delete from private.portal_rate_events where created_at < now() - interval '1 hour';

  if (select count(*) from private.portal_rate_events) >= global_limit then
    raise exception 'rate_limited' using errcode = 'PT429', detail = 'global';
  end if;

  if (select count(*) from private.portal_rate_events where ip_hash = p_ip_hash) >= per_ip_limit then
    raise exception 'rate_limited' using errcode = 'PT429', detail = 'ip';
  end if;

  insert into private.portal_rate_events (ip_hash) values (p_ip_hash);
end;
$$;

-- The project and client row an email + Project ID point to, if the client may sign in:
-- an open project, and a client who is invited or active and has an auth user.
create function private.portal_find_client(p_email text, p_public_id text)
returns table (project_id uuid, client_id uuid)
language sql
stable
set search_path = ''
as $$
  select p.id, c.id
  from public.projects p
  join public.project_clients c on c.project_id = p.id
  where p.public_id = upper(btrim(p_public_id))
    and p.status = 'active'
    and c.email = lower(btrim(p_email))
    and c.status in ('invited', 'active')
    and c.user_id is not null
  limit 1;
$$;

-- Whether sign-in is paused for this email on this project.
create function private.portal_is_locked(p_project_id uuid, p_email text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1 from private.portal_sign_in_attempts a
    where a.project_id = p_project_id
      and a.email = p_email
      and a.outcome = 'locked'
      and a.attempted_at > now() - make_interval(
        mins => (select lockout_minutes from public.portal_settings where id)
      )
  );
$$;

revoke all on function private.portal_code_lifetime() from public, anon, authenticated;
revoke all on function private.enforce_portal_sign_in_limit(text) from public, anon, authenticated;
revoke all on function private.portal_find_client(text, text) from public, anon, authenticated;
revoke all on function private.portal_is_locked(uuid, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Public functions
-- ---------------------------------------------------------------------------

create function public.portal_begin_client_sign_in(p_email text, p_public_id text, p_ip_hash text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  found_project uuid;
  normalized_email text := lower(btrim(p_email));
begin
  if p_ip_hash is null or p_ip_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid ip_hash' using errcode = '22023';
  end if;

  perform private.enforce_portal_sign_in_limit(p_ip_hash);

  select f.project_id into found_project from private.portal_find_client(p_email, p_public_id) f;
  if found_project is null then
    return 'no_match';
  end if;

  if private.portal_is_locked(found_project, normalized_email) then
    return 'locked';
  end if;

  insert into private.portal_sign_in_attempts (project_id, email, outcome)
  values (found_project, normalized_email, 'code_sent');
  return 'ok';
end;
$$;

create function public.portal_code_state(p_email text, p_public_id text)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  found_project uuid;
  normalized_email text := lower(btrim(p_email));
  last_sent timestamptz;
begin
  select f.project_id into found_project from private.portal_find_client(p_email, p_public_id) f;
  -- No such client: report "expired", the same as a code that never existed.
  if found_project is null then
    return 'expired';
  end if;

  if private.portal_is_locked(found_project, normalized_email) then
    return 'locked';
  end if;

  select max(attempted_at) into last_sent
  from private.portal_sign_in_attempts
  where project_id = found_project and email = normalized_email and outcome = 'code_sent';

  if last_sent is null or last_sent < now() - private.portal_code_lifetime() then
    return 'expired';
  end if;
  return 'active';
end;
$$;

-- Returns the tries left after this miss; 0 means sign-in is now paused.
create function public.portal_register_wrong_code(p_email text, p_public_id text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  found_project uuid;
  normalized_email text := lower(btrim(p_email));
  max_tries int := (select code_max_tries from public.portal_settings where id);
  last_sent timestamptz;
  misses int;
begin
  select f.project_id into found_project from private.portal_find_client(p_email, p_public_id) f;
  if found_project is null then
    return 0;
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('nortbrand.portal_code.' || found_project::text || '.' || normalized_email, 0)
  );

  if private.portal_is_locked(found_project, normalized_email) then
    return 0;
  end if;

  select max(attempted_at) into last_sent
  from private.portal_sign_in_attempts
  where project_id = found_project and email = normalized_email and outcome = 'code_sent';

  select count(*) into misses
  from private.portal_sign_in_attempts
  where project_id = found_project
    and email = normalized_email
    and outcome = 'wrong_code'
    and attempted_at >= coalesce(last_sent, '-infinity');

  insert into private.portal_sign_in_attempts (project_id, email, outcome)
  values (found_project, normalized_email, 'wrong_code');
  insert into public.access_events (project_id, kind, email)
  values (found_project, 'wrong_code', normalized_email);

  if misses + 1 >= max_tries then
    insert into private.portal_sign_in_attempts (project_id, email, outcome)
    values (found_project, normalized_email, 'locked');
    insert into public.access_events (project_id, kind, email)
    values (found_project, 'locked', normalized_email);
    return 0;
  end if;

  return max_tries - (misses + 1);
end;
$$;

-- Run with the new session: only the signed-in user's own client row can be completed.
create function public.portal_complete_client_sign_in(p_public_id text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  found_project uuid;
  client_email text;
begin
  update public.project_clients c
  set status = 'active', last_sign_in_at = now()
  from public.projects p
  where p.id = c.project_id
    and p.public_id = upper(btrim(p_public_id))
    and p.status = 'active'
    and c.user_id = (select auth.uid())
    and c.status in ('invited', 'active')
  returning c.project_id, c.email into found_project, client_email;

  if found_project is null then
    return null;
  end if;

  insert into private.portal_sign_in_attempts (project_id, email, outcome)
  values (found_project, client_email, 'signed_in');
  insert into public.access_events (project_id, kind, email)
  values (found_project, 'sign_in', client_email);
  return found_project;
end;
$$;

revoke all on function public.portal_begin_client_sign_in(text, text, text) from public, anon, authenticated;
revoke all on function public.portal_code_state(text, text) from public, anon, authenticated;
revoke all on function public.portal_register_wrong_code(text, text) from public, anon, authenticated;
revoke all on function public.portal_complete_client_sign_in(text) from public, anon, authenticated;

grant execute on function public.portal_begin_client_sign_in(text, text, text) to anon;
grant execute on function public.portal_code_state(text, text) to anon;
grant execute on function public.portal_register_wrong_code(text, text) to anon;
grant execute on function public.portal_complete_client_sign_in(text) to authenticated;
