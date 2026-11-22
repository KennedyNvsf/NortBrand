-- Workspace Settings (#159; Figma TM-13 546:583, TM-09 "Settings · members" 547:612).
--
-- * The stage template moves from the app (templates.ts) into portal_stage_template, so
--   admins can rename stages and change their durations. Durations are weeks, used as
--   relative weights: new projects spread them between their start and launch dates.
--   Launch (the launch day) and Care (ongoing) keep no duration (lead's decision,
--   2026-11-22).
-- * portal_save_settings saves every setting and the template in one transaction, admin
--   only (checked here; the server action checks first), and refuses a stale save.
-- * portal_complete_client_sign_in also returns the session length to sign the client's
--   session marker with, and, on a client's first sign-in to a project while
--   notify_first_client_sign_in is on, the project lead to email (lead's decision,
--   2026-11-22). The server action sends that email; nothing reaches the browser.

-- ---------------------------------------------------------------------------
-- Stage template
-- ---------------------------------------------------------------------------

create table public.portal_stage_template (
  position smallint primary key check (position between 1 and 12),
  name text not null check (char_length(btrim(name)) between 1 and 60),
  kind text not null check (kind in ('work', 'launch', 'after')),
  weeks smallint check (weeks between 1 and 52),
  check ((kind = 'work') = (weeks is not null))
);

comment on table public.portal_stage_template is
  'The stages every new project starts from (#159). Edited in Settings through portal_save_settings only.';

insert into public.portal_stage_template (position, name, kind, weeks) values
  (1, 'Discovery', 'work', 2),
  (2, 'Design', 'work', 3),
  (3, 'Development', 'work', 6),
  (4, 'Review', 'work', 3),
  (5, 'Launch', 'launch', null),
  (6, 'Care', 'after', null);

alter table public.portal_stage_template enable row level security;

-- Teammates read it (the new-project dialog previews it); nobody writes it directly.
create policy portal_stage_template_select on public.portal_stage_template
  for select to authenticated using ((select private.is_team_member()));

grant select on table public.portal_stage_template to authenticated;

-- ---------------------------------------------------------------------------
-- Save settings
-- ---------------------------------------------------------------------------

-- p_stages: [{"name": text, "kind": "work"|"launch"|"after", "weeks": int|null}, ...]
-- in order: one or more working stages, then exactly one launch, then exactly one after.
-- p_expected_updated_at: portal_settings.updated_at as the admin loaded it; a save made
-- on top of someone else's newer save is refused (PT409 stale_settings).
create function public.portal_save_settings(
  p_expected_updated_at timestamptz,
  p_code_max_tries integer,
  p_lockout_minutes integer,
  p_session_days integer,
  p_daily_digest boolean,
  p_notify_first_client_sign_in boolean,
  p_allowed_team_domain text,
  p_stages jsonb
)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_updated timestamptz;
  stage jsonb;
  stage_count int;
  stage_name text;
  stage_kind text;
  stage_weeks int;
  i int := 0;
  phase int := 0; -- 0: working stages, 1: after launch, 2: after care
  names text[] := '{}';
  saved timestamptz := now();
  domain text := nullif(lower(btrim(coalesce(p_allowed_team_domain, ''))), '');
begin
  perform private.require_team_admin();

  select s.updated_at into current_updated
  from public.portal_settings s
  where s.id
  for update;

  if p_expected_updated_at is null or current_updated <> p_expected_updated_at then
    raise exception 'stale_settings' using errcode = 'PT409';
  end if;

  if jsonb_typeof(p_stages) is distinct from 'array' then
    raise exception 'stages must be an array' using errcode = '22023';
  end if;
  stage_count := jsonb_array_length(p_stages);
  if stage_count not between 3 and 12 then
    raise exception 'between 3 and 12 stages' using errcode = '22023';
  end if;

  for stage in select value from jsonb_array_elements(p_stages) loop
    i := i + 1;
    if jsonb_typeof(stage) is distinct from 'object' then
      raise exception 'stage % is not an object', i using errcode = '22023';
    end if;
    stage_name := btrim(coalesce(stage ->> 'name', ''));
    stage_kind := stage ->> 'kind';
    stage_weeks := case
      when jsonb_typeof(stage -> 'weeks') = 'number' then (stage ->> 'weeks')::numeric::int
    end;

    if char_length(stage_name) not between 1 and 60 then
      raise exception 'stage % name', i using errcode = '22023';
    end if;
    if lower(stage_name) = any (names) then
      raise exception 'duplicate stage name' using errcode = '22023';
    end if;
    names := names || lower(stage_name);

    if stage_kind = 'work' then
      if phase <> 0 or stage_weeks is null or stage_weeks not between 1 and 52 then
        raise exception 'stage % weeks or order', i using errcode = '22023';
      end if;
    elsif stage_kind = 'launch' then
      if phase <> 0 or i = 1 then
        raise exception 'launch must follow the working stages' using errcode = '22023';
      end if;
      phase := 1;
    elsif stage_kind = 'after' then
      if phase <> 1 then
        raise exception 'care must follow launch' using errcode = '22023';
      end if;
      phase := 2;
    else
      raise exception 'stage % kind', i using errcode = '22023';
    end if;
  end loop;

  -- Nothing can follow care (every branch above refuses it), so phase 2 means the
  -- template ends with launch, then care.
  if phase <> 2 then
    raise exception 'the template ends with launch then care' using errcode = '22023';
  end if;

  -- The columns' check constraints reject out-of-range values (23514).
  update public.portal_settings
  set code_max_tries = p_code_max_tries,
      lockout_minutes = p_lockout_minutes,
      session_days = p_session_days,
      daily_digest = p_daily_digest,
      notify_first_client_sign_in = p_notify_first_client_sign_in,
      allowed_team_domain = domain,
      updated_at = saved
  where id;

  delete from public.portal_stage_template where true;
  insert into public.portal_stage_template (position, name, kind, weeks)
  select
    e.ordinality::smallint,
    btrim(e.value ->> 'name'),
    e.value ->> 'kind',
    case when e.value ->> 'kind' = 'work' then (e.value ->> 'weeks')::numeric::smallint end
  from jsonb_array_elements(p_stages) with ordinality as e (value, ordinality);

  return saved;
end;
$$;

-- The updated_at trigger sets now() too, which is the same value for the whole
-- transaction, so the returned timestamp is the stored one.
revoke all on function public.portal_save_settings(timestamptz, integer, integer, integer, boolean, boolean, text, jsonb)
  from public, anon;
grant execute on function public.portal_save_settings(timestamptz, integer, integer, integer, boolean, boolean, text, jsonb)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Client sign-in: session length and the first sign-in notice
-- ---------------------------------------------------------------------------

drop function public.portal_complete_client_sign_in(text);

-- Run with the new session: only the signed-in user's own client row can be completed.
-- notify_* are set only on the client's first sign-in to this project, while the setting
-- is on and the project's lead is an active teammate.
create function public.portal_complete_client_sign_in(p_public_id text)
returns table (
  project_id uuid,
  session_days integer,
  notify_email text,
  notify_name text,
  project_name text,
  project_public_id text,
  client_email text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  found_project uuid;
  found_email text;
  was_first boolean;
begin
  -- The row as it was before this sign-in tells whether it's the first one.
  select c.project_id, c.email, c.last_sign_in_at is null
  into found_project, found_email, was_first
  from public.project_clients c
  join public.projects p on p.id = c.project_id
  where p.public_id = upper(btrim(p_public_id))
    and p.status = 'active'
    and c.user_id = (select auth.uid())
    and c.status in ('invited', 'active')
  for update of c;

  if found_project is null then
    return;
  end if;

  update public.project_clients c
  set status = 'active', last_sign_in_at = now()
  where c.project_id = found_project and c.user_id = (select auth.uid());

  insert into private.portal_sign_in_attempts (project_id, email, outcome)
  values (found_project, found_email, 'signed_in');
  insert into public.access_events (project_id, kind, email)
  values (found_project, 'sign_in', found_email);

  return query
    select
      found_project,
      s.session_days::integer,
      case when was_first and s.notify_first_client_sign_in and m.active then m.email end,
      case when was_first and s.notify_first_client_sign_in and m.active then m.name end,
      p.name,
      p.public_id,
      found_email
    from public.projects p
    join public.team_members m on m.user_id = p.lead_id
    cross join public.portal_settings s
    where p.id = found_project and s.id;
end;
$$;

revoke all on function public.portal_complete_client_sign_in(text) from public, anon, authenticated;
grant execute on function public.portal_complete_client_sign_in(text) to authenticated;
