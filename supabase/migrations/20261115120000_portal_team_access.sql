-- Team access for the portal (ADR-009, #132): team sign-in with an email code, invites,
-- removal and the first admin.
--
-- Team access is invite-only by any email (lead's decision, 2026-11-13). The optional
-- portal_settings.allowed_team_domain restricts it; a trigger enforces it on every write
-- to team_members, so no path (function or direct RLS write) can skip it.
--
-- Sign-in mirrors client sign-in (#131) without a Project ID, and shares its code-request
-- rate limit (private.enforce_portal_sign_in_limit):
--   * portal_begin_team_sign_in        ok / no_match / locked; records that a code was sent.
--   * portal_team_code_state           active / expired / locked.
--   * portal_register_team_wrong_code  tries left; the last allowed miss pauses sign-in.
--   * portal_complete_team_sign_in     run as the signed-in user: their role, or null.
-- Team administration, admins only (checked here, and again in every server action):
--   * portal_check_team_invite         ok / domain_not_allowed / already_member, plus the
--                                      existing auth user, if any, for that email.
--   * portal_add_team_member           adds (or brings back) a teammate.
--   * portal_remove_team_member        deactivates; their tickets and updates go to each
--                                      project's lead. Refused for yourself (PT403) and
--                                      for the lead of an active project (PT409).
-- private.portal_bootstrap_first_admin creates the first admin; it has no grants, so it
-- runs only from the SQL editor (docs/guides/portal.md).

-- ---------------------------------------------------------------------------
-- Sign-in attempts (team): like private.portal_sign_in_attempts, without a project
-- ---------------------------------------------------------------------------

create table private.portal_team_sign_in_attempts (
  id bigint generated always as identity primary key,
  email text not null check (email = lower(email) and char_length(email) <= 254),
  attempted_at timestamptz not null default now(),
  outcome text not null check (outcome in ('code_sent', 'wrong_code', 'locked', 'signed_in'))
);

create index portal_team_sign_in_attempts_lookup_idx
  on private.portal_team_sign_in_attempts (email, attempted_at desc);

alter table private.portal_team_sign_in_attempts enable row level security;
revoke all on table private.portal_team_sign_in_attempts from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- The allowed-domain rule
-- ---------------------------------------------------------------------------

-- Whether an email may belong to an active teammate: always, unless an allowed domain is set.
create function private.team_email_allowed(p_email text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(
    (select s.allowed_team_domain is null or split_part(p_email, '@', 2) = s.allowed_team_domain
     from public.portal_settings s where s.id),
    true
  );
$$;

-- Every team_members write: the email is the auth user's, and an active teammate's email
-- is inside the allowed domain. SECURITY DEFINER to read auth.users.
create function private.check_team_member_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from auth.users u where u.id = new.user_id and lower(u.email) = new.email
  ) then
    raise exception 'email_mismatch' using errcode = '23514';
  end if;
  if new.active and not private.team_email_allowed(new.email) then
    raise exception 'domain_not_allowed' using errcode = 'PT422';
  end if;
  return new;
end;
$$;

create trigger team_members_check_email
  before insert or update of user_id, email, active on public.team_members
  for each row execute function private.check_team_member_email();

-- ---------------------------------------------------------------------------
-- Private helpers
-- ---------------------------------------------------------------------------

create function private.portal_find_team_member(p_email text)
returns uuid
language sql
stable
set search_path = ''
as $$
  select m.user_id from public.team_members m
  where m.email = lower(btrim(p_email)) and m.active
  limit 1;
$$;

create function private.portal_team_is_locked(p_email text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1 from private.portal_team_sign_in_attempts a
    where a.email = p_email
      and a.outcome = 'locked'
      and a.attempted_at > now() - make_interval(
        mins => (select lockout_minutes from public.portal_settings where id)
      )
  );
$$;

create function private.require_team_admin()
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  if not private.is_team_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;
end;
$$;

revoke all on function private.team_email_allowed(text) from public, anon, authenticated;
revoke all on function private.check_team_member_email() from public, anon, authenticated;
revoke all on function private.portal_find_team_member(text) from public, anon, authenticated;
revoke all on function private.portal_team_is_locked(text) from public, anon, authenticated;
revoke all on function private.require_team_admin() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Team sign-in
-- ---------------------------------------------------------------------------

create function public.portal_begin_team_sign_in(p_email text, p_ip_hash text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_email text := lower(btrim(p_email));
begin
  if p_ip_hash is null or p_ip_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid ip_hash' using errcode = '22023';
  end if;

  perform private.enforce_portal_sign_in_limit(p_ip_hash);

  if private.portal_find_team_member(normalized_email) is null then
    return 'no_match';
  end if;
  if private.portal_team_is_locked(normalized_email) then
    return 'locked';
  end if;

  insert into private.portal_team_sign_in_attempts (email, outcome)
  values (normalized_email, 'code_sent');
  return 'ok';
end;
$$;

create function public.portal_team_code_state(p_email text)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  normalized_email text := lower(btrim(p_email));
  last_sent timestamptz;
begin
  -- Not a teammate: "expired", the same as a code that never existed.
  if private.portal_find_team_member(normalized_email) is null then
    return 'expired';
  end if;
  if private.portal_team_is_locked(normalized_email) then
    return 'locked';
  end if;

  select max(attempted_at) into last_sent
  from private.portal_team_sign_in_attempts
  where email = normalized_email and outcome = 'code_sent';

  if last_sent is null or last_sent < now() - private.portal_code_lifetime() then
    return 'expired';
  end if;
  return 'active';
end;
$$;

-- Returns the tries left after this miss; 0 means sign-in is now paused.
create function public.portal_register_team_wrong_code(p_email text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_email text := lower(btrim(p_email));
  max_tries int := (select code_max_tries from public.portal_settings where id);
  last_sent timestamptz;
  misses int;
begin
  if private.portal_find_team_member(normalized_email) is null then
    return 0;
  end if;

  perform pg_advisory_xact_lock(hashtextextended('nortbrand.portal_team_code.' || normalized_email, 0));

  if private.portal_team_is_locked(normalized_email) then
    return 0;
  end if;

  select max(attempted_at) into last_sent
  from private.portal_team_sign_in_attempts
  where email = normalized_email and outcome = 'code_sent';

  select count(*) into misses
  from private.portal_team_sign_in_attempts
  where email = normalized_email
    and outcome = 'wrong_code'
    and attempted_at >= coalesce(last_sent, '-infinity');

  insert into private.portal_team_sign_in_attempts (email, outcome)
  values (normalized_email, 'wrong_code');

  if misses + 1 >= max_tries then
    insert into private.portal_team_sign_in_attempts (email, outcome)
    values (normalized_email, 'locked');
    return 0;
  end if;
  return max_tries - (misses + 1);
end;
$$;

-- Run with the new session: the signed-in user's role if they are an active teammate.
create function public.portal_complete_team_sign_in()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  member_role text;
  member_email text;
begin
  select m.role, m.email into member_role, member_email
  from public.team_members m
  where m.user_id = (select auth.uid()) and m.active;

  if member_role is null then
    return null;
  end if;

  insert into private.portal_team_sign_in_attempts (email, outcome)
  values (member_email, 'signed_in');
  return member_role;
end;
$$;

-- ---------------------------------------------------------------------------
-- Team administration (admins only)
-- ---------------------------------------------------------------------------

create function public.portal_check_team_invite(p_email text)
returns table (status text, user_id uuid)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  normalized_email text := lower(btrim(p_email));
begin
  perform private.require_team_admin();

  if normalized_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
     or char_length(normalized_email) > 254 then
    raise exception 'invalid email' using errcode = '22023';
  end if;

  if not private.team_email_allowed(normalized_email) then
    return query select 'domain_not_allowed'::text, null::uuid;
    return;
  end if;

  if exists (select 1 from public.team_members m where m.email = normalized_email and m.active) then
    return query select 'already_member'::text, null::uuid;
    return;
  end if;

  return query
    select 'ok'::text, (select u.id from auth.users u where lower(u.email) = normalized_email limit 1);
end;
$$;

create function public.portal_add_team_member(p_user_id uuid, p_name text, p_role text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  user_email text;
begin
  perform private.require_team_admin();

  if p_role not in ('admin', 'member') then
    raise exception 'invalid role' using errcode = '22023';
  end if;

  select lower(u.email) into user_email from auth.users u where u.id = p_user_id;
  if user_email is null then
    raise exception 'no such user' using errcode = 'P0002';
  end if;

  -- The trigger checks the email and the allowed domain.
  insert into public.team_members (user_id, name, email, role, active)
  values (p_user_id, btrim(p_name), user_email, p_role, true)
  on conflict on constraint team_members_pkey do update
    set name = excluded.name, email = excluded.email, role = excluded.role, active = true;
end;
$$;

create function public.portal_remove_team_member(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_team_admin();

  if p_user_id = (select auth.uid()) then
    raise exception 'cannot_remove_self' using errcode = 'PT403';
  end if;

  if not exists (select 1 from public.team_members m where m.user_id = p_user_id and m.active) then
    raise exception 'not_found' using errcode = 'P0002';
  end if;

  -- An active project needs a lead: hand it to someone else first.
  if exists (select 1 from public.projects p where p.lead_id = p_user_id and p.status = 'active') then
    raise exception 'project_lead' using errcode = 'PT409';
  end if;

  update public.tickets t set owner_id = p.lead_id
  from public.projects p
  where p.id = t.project_id and t.owner_id = p_user_id;

  update public.updates u set author_id = p.lead_id
  from public.projects p
  where p.id = u.project_id and u.author_id = p_user_id;

  delete from public.project_team where user_id = p_user_id;

  update public.team_members set active = false where user_id = p_user_id;
end;
$$;

-- No grants: run once from the SQL editor (as postgres) after creating the auth user.
create function private.portal_bootstrap_first_admin(p_user_id uuid, p_name text)
returns void
language plpgsql
set search_path = ''
as $$
declare
  user_email text;
begin
  if exists (select 1 from public.team_members m where m.role = 'admin' and m.active) then
    raise exception 'an admin already exists: invite teammates from the portal' using errcode = 'PT409';
  end if;

  select lower(u.email) into user_email from auth.users u where u.id = p_user_id;
  if user_email is null then
    raise exception 'no such user' using errcode = 'P0002';
  end if;

  insert into public.team_members (user_id, name, email, role, active)
  values (p_user_id, btrim(p_name), user_email, 'admin', true)
  on conflict on constraint team_members_pkey do update
    set name = excluded.name, role = 'admin', active = true;
end;
$$;

revoke all on function private.portal_bootstrap_first_admin(uuid, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

revoke all on function public.portal_begin_team_sign_in(text, text) from public, anon, authenticated;
revoke all on function public.portal_team_code_state(text) from public, anon, authenticated;
revoke all on function public.portal_register_team_wrong_code(text) from public, anon, authenticated;
revoke all on function public.portal_complete_team_sign_in() from public, anon, authenticated;
revoke all on function public.portal_check_team_invite(text) from public, anon, authenticated;
revoke all on function public.portal_add_team_member(uuid, text, text) from public, anon, authenticated;
revoke all on function public.portal_remove_team_member(uuid) from public, anon, authenticated;

grant execute on function public.portal_begin_team_sign_in(text, text) to anon;
grant execute on function public.portal_team_code_state(text) to anon;
grant execute on function public.portal_register_team_wrong_code(text) to anon;
grant execute on function public.portal_complete_team_sign_in() to authenticated;
grant execute on function public.portal_check_team_invite(text) to authenticated;
grant execute on function public.portal_add_team_member(uuid, text, text) to authenticated;
grant execute on function public.portal_remove_team_member(uuid) to authenticated;
