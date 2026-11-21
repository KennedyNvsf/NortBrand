-- Team workspace (#142; Figma TM-11 My tickets, TM-12 Team, top-bar search).
--
-- - portal_team_overview: the Team table (role, projects, open tickets, last active) for
--   any active teammate. Last active is the auth user's last sign-in, which only a
--   SECURITY DEFINER function can read.
-- - portal_set_team_role: admins change roles; the last active admin can't be demoted.
-- - portal_search: SECURITY INVOKER, so RLS decides: a teammate finds only projects
--   (by name or Project ID) and tickets they can already read.

-- ---------------------------------------------------------------------------
-- Team overview
-- ---------------------------------------------------------------------------

create function public.portal_team_overview()
returns table (
  user_id uuid,
  name text,
  email text,
  role text,
  project_names text[],
  open_tickets integer,
  last_active_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_team_member() then
    raise exception 'not_team' using errcode = '42501';
  end if;

  return query
    select
      m.user_id,
      m.name,
      m.email,
      m.role,
      coalesce(
        array(
          select p.name
          from public.projects p
          where p.status = 'active'
            and (
              m.role = 'admin'
              or exists (
                select 1 from public.project_team pt
                where pt.project_id = p.id and pt.user_id = m.user_id
              )
            )
          order by p.name
        ),
        '{}'
      ),
      (
        select count(*)::int
        from public.tickets t
        join public.projects p on p.id = t.project_id
        where t.owner_id = m.user_id and t.status <> 'done' and p.status = 'active'
      ),
      (select u.last_sign_in_at from auth.users u where u.id = m.user_id)
    from public.team_members m
    where m.active
    order by (m.role = 'admin') desc, m.name;
end;
$$;

-- ---------------------------------------------------------------------------
-- Role change
-- ---------------------------------------------------------------------------

create function public.portal_set_team_role(p_user_id uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  member_role text;
begin
  perform private.require_team_admin();

  if p_role not in ('admin', 'member') then
    raise exception 'invalid role' using errcode = '22023';
  end if;

  -- One role change at a time, so two admins can't demote each other at once.
  perform pg_advisory_xact_lock(hashtextextended('nortbrand.portal_team_roles', 0));

  select m.role into member_role
  from public.team_members m
  where m.user_id = p_user_id and m.active;
  if member_role is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;

  if member_role = 'admin' and p_role = 'member' and not exists (
    select 1 from public.team_members m
    where m.active and m.role = 'admin' and m.user_id <> p_user_id
  ) then
    raise exception 'last_admin' using errcode = 'PT409';
  end if;

  update public.team_members set role = p_role where user_id = p_user_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Search
-- ---------------------------------------------------------------------------

-- Up to 8 projects and 12 tickets matching the words typed, newest first. Runs as the
-- caller, so projects and tickets come only through their RLS policies.
create function public.portal_search(p_query text)
returns table (
  kind text,
  project_public_id text,
  project_name text,
  ticket_number integer,
  title text
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  needle text := btrim(coalesce(p_query, ''));
  pattern text;
begin
  -- The team's search: clients have no search bar and get nothing.
  if not private.is_team_member() then
    return;
  end if;
  if char_length(needle) < 2 or char_length(needle) > 80 then
    return;
  end if;
  -- Typed % and _ are literal, not wildcards.
  pattern := '%' || replace(replace(replace(needle, '\', '\\'), '%', '\%'), '_', '\_') || '%';

  return query
    (
      select 'project'::text, p.public_id, p.name, null::int, p.client_name
      from public.projects p
      where p.name ilike pattern or p.public_id ilike pattern or p.client_name ilike pattern
      order by (p.status = 'active') desc, p.created_at desc
      limit 8
    )
    union all
    (
      select 'ticket'::text, p.public_id, p.name, t.number, t.title
      from public.tickets t
      join public.projects p on p.id = t.project_id
      where t.title ilike pattern
      order by (t.status = 'done'), t.updated_at desc
      limit 12
    );
end;
$$;

revoke all on function public.portal_team_overview() from public, anon;
revoke all on function public.portal_set_team_role(uuid, text) from public, anon;
revoke all on function public.portal_search(text) from public, anon;

grant execute on function public.portal_team_overview() to authenticated;
grant execute on function public.portal_set_team_role(uuid, text) to authenticated;
grant execute on function public.portal_search(text) to authenticated;
