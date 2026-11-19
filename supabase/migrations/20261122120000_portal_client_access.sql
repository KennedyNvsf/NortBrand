-- Client access (#141; Figma TM-06 543:369, guarded states TM-09 547:612).
--
-- - Rotating the Project ID signs every client of that project out at once: the project
--   records when, and private.is_project_client accepts only sessions created after it.
--   RLS therefore refuses old sessions on every query; a refreshed token keeps its
--   session, so it stays refused. Other projects the same person belongs to are not
--   affected.
-- - The last person who can sign in (invited or active) can't be removed: a trigger,
--   so a direct update by an admin is refused too.
-- - Admin functions to add, remove, rotate and clear a lockout, each logged in
--   access_events; the team reads current lockouts.

-- ---------------------------------------------------------------------------
-- Session cut-off
-- ---------------------------------------------------------------------------

alter table public.projects add column clients_signed_out_at timestamptz;

comment on column public.projects.clients_signed_out_at is
  'Client sessions created before this are refused (set when the Project ID is rotated).';

-- An active client of an open project, signed in after the project's cut-off. The
-- session is the one the JWT names (session_id); no session id means no access once a
-- cut-off exists.
create or replace function private.is_project_client(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.project_clients c
    join public.projects p on p.id = c.project_id
    where c.project_id = p_project_id
      and c.user_id = (select auth.uid())
      and c.status = 'active'
      and p.status = 'active'
      and (
        p.clients_signed_out_at is null
        or exists (
          select 1
          from auth.sessions s
          where s.id = nullif((select auth.jwt()) ->> 'session_id', '')::uuid
            and s.user_id = c.user_id
            and s.created_at >= p.clients_signed_out_at
        )
      )
  );
$$;

-- ---------------------------------------------------------------------------
-- The last person who can sign in stays
-- ---------------------------------------------------------------------------

create function private.keep_one_client()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  target public.project_clients := case when tg_op = 'DELETE' then old else new end;
begin
  if tg_op = 'UPDATE' and (old.status = 'removed' or new.status <> 'removed') then
    return new;
  end if;
  -- Deleting the whole project (cascade) is fine: the project row is already gone.
  if tg_op = 'DELETE' and not exists (select 1 from public.projects where id = old.project_id) then
    return old;
  end if;
  if old.status <> 'removed' and not exists (
    select 1 from public.project_clients c
    where c.project_id = old.project_id
      and c.id <> old.id
      and c.status in ('invited', 'active')
  ) then
    raise exception 'last_person' using errcode = 'PT409';
  end if;
  return target;
end;
$$;

create trigger project_clients_keep_one
  before update of status or delete on public.project_clients
  for each row execute function private.keep_one_client();

revoke all on function private.keep_one_client() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Admin actions (TM-06)
-- ---------------------------------------------------------------------------

-- Add a person, or bring back a removed one. The auth user is created by the app first
-- (auth administration, ADR-009) and must match the email.
create function public.portal_add_client(
  p_project_id uuid,
  p_email text,
  p_name text,
  p_locale text,
  p_user_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_email text := lower(btrim(p_email));
  clean_name text := nullif(btrim(coalesce(p_name, '')), '');
  existing public.project_clients;
  client_id uuid;
begin
  perform private.require_team_admin();

  if not exists (select 1 from public.projects p where p.id = p_project_id) then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if not exists (
    select 1 from auth.users u where u.id = p_user_id and lower(u.email) = normalized_email
  ) then
    raise exception 'client user does not match the email' using errcode = '22023';
  end if;
  if exists (select 1 from public.team_members m where m.email = normalized_email and m.active) then
    raise exception 'client_is_teammate' using errcode = 'PT409';
  end if;

  select * into existing from public.project_clients c
  where c.project_id = p_project_id and c.email = normalized_email
  for update;

  if found and existing.status <> 'removed' then
    raise exception 'already_added' using errcode = 'PT409';
  end if;

  if found then
    update public.project_clients
    set status = 'invited', removed_at = null, invited_at = now(), last_sign_in_at = null,
        name = coalesce(clean_name, name), locale = coalesce(p_locale, locale), user_id = p_user_id
    where id = existing.id
    returning id into client_id;
  else
    insert into public.project_clients (project_id, email, name, locale, user_id)
    values (p_project_id, normalized_email, clean_name, coalesce(p_locale, 'pt'), p_user_id)
    returning id into client_id;
  end if;
  return client_id;
end;
$$;

-- Remove a person (the trigger refuses the last one) and log it.
create function public.portal_remove_client(p_project_id uuid, p_client_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  removed_email text;
begin
  perform private.require_team_admin();

  update public.project_clients
  set status = 'removed', removed_at = now()
  where id = p_client_id and project_id = p_project_id and status <> 'removed'
  returning email into removed_email;

  if removed_email is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;

  insert into public.access_events (project_id, kind, email, actor_id)
  values (p_project_id, 'client_removed', removed_email, (select auth.uid()));
end;
$$;

-- A new Project ID; every client session for the project ends now. Returns the new ID
-- and the people to email it to.
create function public.portal_rotate_project_id(p_project_id uuid)
returns table (public_id text, email text, name text, locale text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_public_id text;
begin
  perform private.require_team_admin();

  perform 1 from public.projects p where p.id = p_project_id for update;
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;

  new_public_id := private.generate_project_public_id();
  update public.projects p
  set public_id = new_public_id, clients_signed_out_at = now()
  where p.id = p_project_id;

  insert into public.access_events (project_id, kind, actor_id)
  values (p_project_id, 'project_id_rotated', (select auth.uid()));

  return query
    select new_public_id, c.email, c.name, c.locale
    from public.project_clients c
    where c.project_id = p_project_id and c.status in ('invited', 'active')
    order by c.invited_at;
end;
$$;

-- Lift a sign-in pause early. Returns whether there was one.
create function public.portal_clear_lockout(p_project_id uuid, p_email text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_email text := lower(btrim(p_email));
  cleared int;
begin
  perform private.require_team_admin();

  delete from private.portal_sign_in_attempts a
  where a.project_id = p_project_id
    and a.email = normalized_email
    and a.outcome = 'locked';
  get diagnostics cleared = row_count;

  if cleared > 0 then
    insert into public.access_events (project_id, kind, email, actor_id)
    values (p_project_id, 'lockout_cleared', normalized_email, (select auth.uid()));
  end if;
  return cleared > 0;
end;
$$;

-- Who is paused right now, for the people list (the project's team).
create function public.portal_client_lockouts(p_project_id uuid)
returns table (email text, locked_at timestamptz, unlocks_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  pause interval := make_interval(mins => (select lockout_minutes from public.portal_settings where id));
begin
  if not private.works_on_project(p_project_id) then
    raise exception 'not_found' using errcode = 'P0002';
  end if;

  return query
    select a.email, max(a.attempted_at), max(a.attempted_at) + pause
    from private.portal_sign_in_attempts a
    where a.project_id = p_project_id
      and a.outcome = 'locked'
      and a.attempted_at > now() - pause
    group by a.email;
end;
$$;

revoke all on function public.portal_add_client(uuid, text, text, text, uuid) from public, anon;
revoke all on function public.portal_remove_client(uuid, uuid) from public, anon;
revoke all on function public.portal_rotate_project_id(uuid) from public, anon;
revoke all on function public.portal_clear_lockout(uuid, text) from public, anon;
revoke all on function public.portal_client_lockouts(uuid) from public, anon;

grant execute on function public.portal_add_client(uuid, text, text, text, uuid) to authenticated;
grant execute on function public.portal_remove_client(uuid, uuid) to authenticated;
grant execute on function public.portal_rotate_project_id(uuid) to authenticated;
grant execute on function public.portal_clear_lockout(uuid, text) to authenticated;
grant execute on function public.portal_client_lockouts(uuid) to authenticated;
