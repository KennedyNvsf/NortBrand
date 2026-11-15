-- Stage management and the project plan (#138; Figma TM-05 534:251, TM-05b 534:663).
--
-- All SECURITY INVOKER: RLS decides who may change a project (works_on_project), and an
-- update is posted as the signed-in teammate (updates_team_insert checks author_id).
--
-- * portal_set_stage_dates: finished stages are locked (PT409); reopen to change them.
-- * portal_reopen_stage: a finished stage becomes open again.
-- * portal_complete_stage: ONE transaction. Only the current stage (the first open one)
--   can be completed (PT409 otherwise). It ends today if planned later; the next stage
--   starts today if planned later; open tickets either stay (and still count) or move to
--   the next stage keeping their status; an optional milestone update is posted. If any
--   step fails, nothing changes.
-- * portal_set_project_health / portal_set_launch_date: change the project and, when a
--   body is given, post an update in the same transaction (the app then emails the
--   client). Today is Lisbon's date (single office, Europe/Lisbon).

create function private.lisbon_today()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'Europe/Lisbon')::date;
$$;

grant execute on function private.lisbon_today() to authenticated;

create function private.post_project_update(
  p_project_id uuid,
  p_body text,
  p_highlight boolean,
  p_needs_client boolean
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  posted uuid;
begin
  if p_body is null or btrim(p_body) = '' then
    return null;
  end if;
  insert into public.updates (project_id, author_id, body, highlight, needs_client)
  values (p_project_id, (select auth.uid()), btrim(p_body), p_highlight, p_needs_client)
  returning id into posted;
  return posted;
end;
$$;

grant execute on function private.post_project_update(uuid, text, boolean, boolean) to authenticated;

create function public.portal_set_stage_dates(p_stage_id uuid, p_starts_on date, p_ends_on date default null)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  stage record;
begin
  select s.id, s.project_id, s.completed_at into stage
  from public.stages s where s.id = p_stage_id;
  if stage.id is null or not private.works_on_project(stage.project_id) then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if stage.completed_at is not null then
    raise exception 'stage_locked' using errcode = 'PT409';
  end if;
  update public.stages set starts_on = p_starts_on, ends_on = p_ends_on where id = p_stage_id;
end;
$$;

create function public.portal_reopen_stage(p_stage_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  stage record;
begin
  select s.id, s.project_id into stage from public.stages s where s.id = p_stage_id;
  if stage.id is null or not private.works_on_project(stage.project_id) then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  update public.stages set completed_at = null where id = p_stage_id;
end;
$$;

create function public.portal_complete_stage(
  p_stage_id uuid,
  p_move_open boolean,
  p_update_body text default null
)
returns table (next_stage_id uuid, moved_tickets integer, update_id uuid)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  stage record;
  following record;
  today date := private.lisbon_today();
  moved integer := 0;
  posted uuid;
begin
  select s.id, s.project_id, s.position, s.starts_on, s.ends_on, s.completed_at into stage
  from public.stages s where s.id = p_stage_id
  for update;
  if stage.id is null or not private.works_on_project(stage.project_id) then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if stage.completed_at is not null or exists (
    select 1 from public.stages s
    where s.project_id = stage.project_id and s.position < stage.position and s.completed_at is null
  ) then
    raise exception 'not_current' using errcode = 'PT409';
  end if;

  update public.stages
  set completed_at = now(),
      ends_on = case when ends_on is null or ends_on > today then greatest(starts_on, today) else ends_on end
  where id = stage.id;

  select s.id, s.starts_on, s.ends_on into following
  from public.stages s
  where s.project_id = stage.project_id and s.position > stage.position
  order by s.position
  limit 1;

  if following.id is not null and following.starts_on > today then
    update public.stages set starts_on = today where id = following.id;
  end if;

  if p_move_open and following.id is not null then
    update public.tickets
    set stage_id = following.id
    where project_id = stage.project_id and stage_id = stage.id and status <> 'done';
    get diagnostics moved = row_count;
  end if;

  posted := private.post_project_update(stage.project_id, p_update_body, true, false);
  return query select following.id, moved, posted;
end;
$$;

create function public.portal_set_project_health(
  p_project_id uuid,
  p_health text,
  p_update_body text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not private.works_on_project(p_project_id) then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  update public.projects set health = p_health where id = p_project_id;
  return private.post_project_update(p_project_id, p_update_body, false, p_health = 'waiting_on_client');
end;
$$;

create function public.portal_set_launch_date(
  p_project_id uuid,
  p_launches_on date,
  p_update_body text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not private.works_on_project(p_project_id) then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  -- The table's check refuses a launch before the start (23514).
  update public.projects set launches_on = p_launches_on where id = p_project_id;
  return private.post_project_update(p_project_id, p_update_body, false, false);
end;
$$;

revoke all on function public.portal_set_stage_dates(uuid, date, date) from public, anon, authenticated;
revoke all on function public.portal_reopen_stage(uuid) from public, anon, authenticated;
revoke all on function public.portal_complete_stage(uuid, boolean, text) from public, anon, authenticated;
revoke all on function public.portal_set_project_health(uuid, text, text) from public, anon, authenticated;
revoke all on function public.portal_set_launch_date(uuid, date, text) from public, anon, authenticated;
revoke all on function private.post_project_update(uuid, text, boolean, boolean) from public, anon;
revoke all on function private.lisbon_today() from public, anon;

grant execute on function public.portal_set_stage_dates(uuid, date, date) to authenticated;
grant execute on function public.portal_reopen_stage(uuid) to authenticated;
grant execute on function public.portal_complete_stage(uuid, boolean, text) to authenticated;
grant execute on function public.portal_set_project_health(uuid, text, text) to authenticated;
grant execute on function public.portal_set_launch_date(uuid, date, text) to authenticated;
