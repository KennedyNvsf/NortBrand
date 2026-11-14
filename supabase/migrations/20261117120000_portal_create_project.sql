-- New project with client invite (#136; Figma TM-04 531:513).
--
-- One transactional function creates the project, its lead, its stages and its client
-- rows; nothing is half-created. The app computes the stage dates from a template
-- (src/features/portal/team/projects/templates.ts) and creates the clients' auth users
-- first (auth administration, ADR-009); this function checks both again:
--   * admins only (42501), and the lead must be an active teammate (P0002);
--   * each client's user_id must be the auth user of that same email, so a forged call
--     can't attach someone else's account to a project (22023);
--   * a teammate's email can't be a client (PT409);
--   * stages are 1–20, inside the project's dates, in order.
-- The Project ID shown in the modal is a suggestion: if it was taken meanwhile (or is
-- malformed), a fresh one is generated and returned.

-- ---------------------------------------------------------------------------
-- Helpers (admins only)
-- ---------------------------------------------------------------------------

-- The Project ID previewed in the New project modal ("Generated and unique").
create function public.portal_next_project_id()
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  perform private.require_team_admin();
  return private.generate_project_public_id();
end;
$$;

-- For each email: its auth user, if one exists, and whether it belongs to a teammate.
create function public.portal_find_client_users(p_emails text[])
returns table (email text, user_id uuid, is_teammate boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_team_admin();

  if coalesce(array_length(p_emails, 1), 0) not between 1 and 10 then
    raise exception 'between 1 and 10 emails' using errcode = '22023';
  end if;

  return query
    select
      e.email,
      (select u.id from auth.users u where lower(u.email) = e.email order by u.created_at limit 1),
      exists (select 1 from public.team_members m where m.email = e.email and m.active)
    from (select distinct lower(btrim(x)) as email from unnest(p_emails) as x) e;
end;
$$;

-- ---------------------------------------------------------------------------
-- Create
-- ---------------------------------------------------------------------------

create function public.portal_create_project(
  p_name text,
  p_client_name text,
  p_lead_id uuid,
  p_starts_on date,
  p_launches_on date,
  p_public_id text,
  p_stages jsonb,
  p_clients jsonb
)
returns table (project_id uuid, public_id text)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  new_id uuid;
  new_public_id text := upper(btrim(coalesce(p_public_id, '')));
  stage jsonb;
  client jsonb;
  stage_position smallint := 0;
  previous_start date := p_starts_on;
  stage_start date;
  stage_end date;
  client_email text;
  client_user uuid;
begin
  perform private.require_team_admin();

  if not exists (select 1 from public.team_members m where m.user_id = p_lead_id and m.active) then
    raise exception 'lead_not_found' using errcode = 'P0002';
  end if;

  if jsonb_typeof(p_stages) is distinct from 'array'
     or jsonb_array_length(p_stages) not between 1 and 20 then
    raise exception 'between 1 and 20 stages' using errcode = '22023';
  end if;

  if jsonb_typeof(p_clients) is distinct from 'array'
     or jsonb_array_length(p_clients) not between 1 and 10 then
    raise exception 'between 1 and 10 clients' using errcode = '22023';
  end if;

  if new_public_id !~ '^NB-[0-9]{4}$'
     or exists (select 1 from public.projects p where p.public_id = new_public_id) then
    new_public_id := private.generate_project_public_id();
  end if;

  -- The table's checks cover the name lengths and launch >= start.
  insert into public.projects (public_id, name, client_name, starts_on, launches_on, lead_id)
  values (new_public_id, btrim(p_name), btrim(p_client_name), p_starts_on, p_launches_on, p_lead_id)
  returning id into new_id;

  insert into public.project_team (project_id, user_id, role_label, position)
  values (new_id, p_lead_id, 'Project lead', 0);

  for stage in select value from jsonb_array_elements(p_stages) loop
    stage_position := stage_position + 1;
    stage_start := (stage ->> 'starts_on')::date;
    stage_end := nullif(stage ->> 'ends_on', '')::date;
    if stage_start is null
       or stage_start < previous_start
       or stage_start > p_launches_on then
      raise exception 'stage dates out of order or outside the project' using errcode = '22023';
    end if;
    previous_start := stage_start;
    insert into public.stages (project_id, position, name, starts_on, ends_on)
    values (new_id, stage_position, btrim(stage ->> 'name'), stage_start, stage_end);
  end loop;

  for client in select value from jsonb_array_elements(p_clients) loop
    client_email := lower(btrim(client ->> 'email'));
    client_user := (client ->> 'user_id')::uuid;

    if not exists (
      select 1 from auth.users u where u.id = client_user and lower(u.email) = client_email
    ) then
      raise exception 'client user does not match the email' using errcode = '22023';
    end if;

    if exists (select 1 from public.team_members m where m.email = client_email and m.active) then
      raise exception 'client_is_teammate' using errcode = 'PT409';
    end if;

    insert into public.project_clients (project_id, email, locale, user_id)
    values (new_id, client_email, coalesce(client ->> 'locale', 'pt'), client_user);
  end loop;

  return query select new_id, new_public_id;
end;
$$;

-- After a welcome email goes out: the Client access log (#141) shows it.
create function public.portal_log_invite_sent(p_project_id uuid, p_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_team_admin();

  if not exists (
    select 1 from public.project_clients c
    where c.project_id = p_project_id and c.email = lower(btrim(p_email)) and c.status <> 'removed'
  ) then
    raise exception 'not_found' using errcode = 'P0002';
  end if;

  insert into public.access_events (project_id, kind, email, actor_id)
  values (p_project_id, 'invite_sent', lower(btrim(p_email)), (select auth.uid()));
end;
$$;

revoke all on function public.portal_next_project_id() from public, anon, authenticated;
revoke all on function public.portal_find_client_users(text[]) from public, anon, authenticated;
revoke all on function public.portal_create_project(text, text, uuid, date, date, text, jsonb, jsonb)
  from public, anon, authenticated;
revoke all on function public.portal_log_invite_sent(uuid, text) from public, anon, authenticated;

grant execute on function public.portal_next_project_id() to authenticated;
grant execute on function public.portal_find_client_users(text[]) to authenticated;
grant execute on function public.portal_create_project(text, text, uuid, date, date, text, jsonb, jsonb)
  to authenticated;
grant execute on function public.portal_log_invite_sent(uuid, text) to authenticated;
