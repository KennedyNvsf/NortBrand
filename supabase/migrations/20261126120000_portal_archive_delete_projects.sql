-- Archive and delete client projects (#165; lead's decisions 2026-11-22).
--
-- * Archive / restore: projects.status 'closed' / 'active', admin only, through
--   portal_set_project_status. An archived project already disappears for its clients
--   (private.is_project_client requires an active project, #141). It is now also
--   read-only for the team: every team write policy checks private.can_edit_project.
--   The status column is no longer updatable directly, so only the function changes it.
-- * Delete: portal_delete_project, admin only, with the Project ID typed back as a
--   guard. The project's rows go by the existing ON DELETE CASCADE foreign keys. It
--   returns the sign-in accounts to delete: clients whose only project this was (lead's
--   decision). The app then removes the project's Storage objects and those auth users
--   (service role, auth administration only, ADR-009).

-- ---------------------------------------------------------------------------
-- Read-only while archived
-- ---------------------------------------------------------------------------

-- The team may change a project's content only while it's active.
create function private.can_edit_project(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.works_on_project(p_project_id)
    and exists (
      select 1 from public.projects p
      where p.id = p_project_id and p.status = 'active'
    );
$$;

-- Like works_on_project: the policies run as the caller, so authenticated may call it.
revoke all on function private.can_edit_project(uuid) from public, anon, authenticated;
grant execute on function private.can_edit_project(uuid) to authenticated;

drop policy projects_team_update on public.projects;
create policy projects_team_update on public.projects
  for update to authenticated
  using (private.can_edit_project(id)) with check (private.can_edit_project(id));

drop policy stages_team_write on public.stages;
create policy stages_team_write on public.stages
  for all to authenticated
  using (private.can_edit_project(project_id)) with check (private.can_edit_project(project_id));

drop policy tickets_team_write on public.tickets;
create policy tickets_team_write on public.tickets
  for all to authenticated
  using (private.can_edit_project(project_id)) with check (private.can_edit_project(project_id));

drop policy ticket_checklist_items_team_write on public.ticket_checklist_items;
create policy ticket_checklist_items_team_write on public.ticket_checklist_items
  for all to authenticated
  using (private.can_edit_project(project_id)) with check (private.can_edit_project(project_id));

drop policy updates_team_insert on public.updates;
create policy updates_team_insert on public.updates
  for insert to authenticated
  with check (private.can_edit_project(project_id) and author_id = (select auth.uid()));

drop policy updates_team_update on public.updates;
create policy updates_team_update on public.updates
  for update to authenticated
  using (private.can_edit_project(project_id)) with check (private.can_edit_project(project_id));

drop policy update_tickets_team_write on public.update_tickets;
create policy update_tickets_team_write on public.update_tickets
  for all to authenticated
  using (private.can_edit_project(project_id)) with check (private.can_edit_project(project_id));

drop policy project_files_team_write on public.project_files;
create policy project_files_team_write on public.project_files
  for all to authenticated
  using (private.can_edit_project(project_id)) with check (private.can_edit_project(project_id));

drop policy project_milestones_team_write on public.project_milestones;
create policy project_milestones_team_write on public.project_milestones
  for all to authenticated
  using (private.can_edit_project(project_id)) with check (private.can_edit_project(project_id));

-- Only portal_set_project_status changes the status (admin only).
revoke update (status) on public.projects from authenticated;

-- ---------------------------------------------------------------------------
-- Archive / restore
-- ---------------------------------------------------------------------------

create function public.portal_set_project_status(p_project_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_team_admin();
  if p_status not in ('active', 'closed') then
    raise exception 'invalid status' using errcode = '22023';
  end if;
  update public.projects set status = p_status where id = p_project_id;
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Delete permanently
-- ---------------------------------------------------------------------------

-- p_confirm: the Project ID as the admin typed it (any case). Returns the auth users
-- to delete afterwards: this project's clients who are on no other project (in any
-- state but removed) and aren't teammates.
create function public.portal_delete_project(p_project_id uuid, p_confirm text)
returns table (user_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  found_public_id text;
  orphans uuid[];
begin
  perform private.require_team_admin();

  select p.public_id into found_public_id
  from public.projects p
  where p.id = p_project_id
  for update;
  if found_public_id is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if upper(btrim(coalesce(p_confirm, ''))) <> found_public_id then
    raise exception 'confirm_mismatch' using errcode = '22023';
  end if;

  select coalesce(array_agg(distinct c.user_id), '{}') into orphans
  from public.project_clients c
  where c.project_id = p_project_id
    and c.user_id is not null
    and not exists (
      select 1 from public.project_clients other
      where other.user_id = c.user_id
        and other.project_id <> p_project_id
        and other.status <> 'removed'
    )
    and not exists (
      select 1 from public.team_members m where m.user_id = c.user_id
    );

  delete from public.projects where id = p_project_id;

  return query select unnest(orphans);
end;
$$;

revoke all on function public.portal_set_project_status(uuid, text) from public, anon;
revoke all on function public.portal_delete_project(uuid, text) from public, anon;
grant execute on function public.portal_set_project_status(uuid, text) to authenticated;
grant execute on function public.portal_delete_project(uuid, text) to authenticated;
