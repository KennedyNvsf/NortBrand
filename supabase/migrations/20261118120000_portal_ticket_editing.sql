-- Team board and ticket editor (#137; Figma TM-02 530:36, conflict state TM-09 547:612).
--
-- * tickets.updated_by: who saved last, set by a trigger, so a refused save can say who
--   changed what ("Rui Matos changed the due date to 22 Nov while you were editing").
-- * portal_save_ticket: creates a ticket, or saves one only if it hasn't changed since
--   it was read (optimistic concurrency on tickets.updated_at, the version the editor
--   loaded). A stale save changes nothing and answers 'conflict' with the current
--   version; the app then shows both sides and the person chooses. The ticket and its
--   checklist are saved in one transaction.
--   SECURITY INVOKER: RLS applies as for any write by this teammate (works_on_project).
--   The owner must work on the project; the stage must belong to it (composite FK).

alter table public.tickets
  add column updated_by uuid references public.team_members (user_id) on delete set null;

comment on column public.tickets.updated_by is
  'The teammate who saved last (trigger). Shown when someone else''s save is refused.';

create function private.set_ticket_editor()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  editor uuid := (select auth.uid());
begin
  if editor is not null and exists (select 1 from public.team_members m where m.user_id = editor) then
    new.updated_by := editor;
  end if;
  return new;
end;
$$;

revoke all on function private.set_ticket_editor() from public, anon, authenticated;

create trigger tickets_set_editor
  before insert or update on public.tickets
  for each row execute function private.set_ticket_editor();

-- The version must change on every save, even two in one transaction: now() is the
-- transaction's start time, so tickets use the wall clock instead.
create function private.set_ticket_version()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := clock_timestamp();
  return new;
end;
$$;

revoke all on function private.set_ticket_version() from public, anon, authenticated;

drop trigger tickets_set_updated_at on public.tickets;
create trigger tickets_set_updated_at
  before update on public.tickets
  for each row execute function private.set_ticket_version();

create function public.portal_save_ticket(
  p_project_id uuid,
  p_title text,
  p_description text,
  p_status text,
  p_stage_id uuid,
  p_client_visible boolean,
  p_checklist jsonb,
  -- Null (or left out): a new ticket, no version, no owner, no due date.
  p_ticket_id uuid default null,
  p_version timestamptz default null,
  p_owner_id uuid default null,
  p_due_on date default null
)
returns table (outcome text, ticket_id uuid, ticket_number integer, version timestamptz)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  saved_id uuid;
  saved_number integer;
  saved_version timestamptz;
  item jsonb;
  item_id uuid;
  item_position smallint := 0;
  kept uuid[] := '{}';
begin
  if not private.works_on_project(p_project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if jsonb_typeof(p_checklist) is distinct from 'array' or jsonb_array_length(p_checklist) > 100 then
    raise exception 'checklist must be an array of up to 100 items' using errcode = '22023';
  end if;

  if p_owner_id is not null and not exists (
    select 1 from public.team_members m
    where m.user_id = p_owner_id
      and m.active
      and (
        exists (select 1 from public.project_team t where t.project_id = p_project_id and t.user_id = p_owner_id)
        or exists (select 1 from public.projects p where p.id = p_project_id and p.lead_id = p_owner_id)
      )
  ) then
    raise exception 'owner_not_on_project' using errcode = '22023';
  end if;

  if p_ticket_id is null then
    insert into public.tickets (project_id, stage_id, title, description, status, owner_id, due_on, client_visible)
    values (p_project_id, p_stage_id, btrim(p_title), coalesce(p_description, ''), p_status, p_owner_id, p_due_on, p_client_visible)
    returning id, number, updated_at into saved_id, saved_number, saved_version;
  else
    update public.tickets t
    set stage_id = p_stage_id,
        title = btrim(p_title),
        description = coalesce(p_description, ''),
        status = p_status,
        owner_id = p_owner_id,
        due_on = p_due_on,
        client_visible = p_client_visible
    where t.id = p_ticket_id
      and t.project_id = p_project_id
      and t.updated_at = p_version
    returning t.id, t.number, t.updated_at into saved_id, saved_number, saved_version;

    if saved_id is null then
      select t.number, t.updated_at into saved_number, saved_version
      from public.tickets t
      where t.id = p_ticket_id and t.project_id = p_project_id;

      if saved_version is null then
        return query select 'not_found'::text, p_ticket_id, null::integer, null::timestamptz;
      else
        -- Someone saved since this editor read the ticket: change nothing.
        return query select 'conflict'::text, p_ticket_id, saved_number, saved_version;
      end if;
      return;
    end if;
  end if;

  -- The checklist as sent: known items updated in place, new ones added, the rest removed.
  for item in select value from jsonb_array_elements(p_checklist) loop
    item_id := nullif(item ->> 'id', '')::uuid;
    if item_id is not null and exists (
      select 1 from public.ticket_checklist_items c where c.id = item_id and c.ticket_id = saved_id
    ) then
      update public.ticket_checklist_items c
      set position = item_position, label = btrim(item ->> 'label'), done = coalesce((item ->> 'done')::boolean, false)
      where c.id = item_id;
    else
      insert into public.ticket_checklist_items (project_id, ticket_id, position, label, done)
      values (p_project_id, saved_id, item_position, btrim(item ->> 'label'), coalesce((item ->> 'done')::boolean, false))
      returning id into item_id;
    end if;
    kept := kept || item_id;
    item_position := item_position + 1;
  end loop;

  delete from public.ticket_checklist_items c
  where c.ticket_id = saved_id and not (c.id = any (kept));

  return query select 'saved'::text, saved_id, saved_number, saved_version;
end;
$$;

revoke all on function public.portal_save_ticket(uuid, text, text, text, uuid, boolean, jsonb, uuid, timestamptz, uuid, date)
  from public, anon, authenticated;
grant execute on function public.portal_save_ticket(uuid, text, text, text, uuid, boolean, jsonb, uuid, timestamptz, uuid, date)
  to authenticated;
