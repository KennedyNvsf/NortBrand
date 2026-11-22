-- View as client (#160; lead's decision 2026-11-15, Figma TM-07 "View as client").
--
-- The team previews a project's client portal with its own session. RLS shows the team
-- everything, so the client's view is computed here, applying the same rules as the
-- client policies (#130, #135):
--   tickets          client_visible only                    (tickets_select)
--   checklist items  of client-visible tickets only          (ticket_checklist_items_select)
--   updates          live (deleted_at is null), newest 20    (updates_select)
--   update links     live update → client-visible ticket     (update_tickets_select)
--   files            shared only                             (project_files_select)
--   stages, milestones, the project's team                   (as the client reads them)
-- No impersonation: SECURITY INVOKER, so the caller's own RLS still applies on top, and
-- only a teammate who works on the project gets anything. Read-only.
--
-- Also: portal_stage_template (#159) kept Supabase's default table grants; other portal
-- tables grant only what they need. RLS already refused every write, so this only lines
-- the grants up with the rest.

revoke all on table public.portal_stage_template from anon, authenticated;
grant select on table public.portal_stage_template to authenticated;

create function public.portal_client_preview(p_public_id text)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  found public.projects%rowtype;
begin
  select p.* into found
  from public.projects p
  where p.public_id = upper(btrim(coalesce(p_public_id, '')));

  if found.id is null or not private.works_on_project(found.id) then
    return null;
  end if;

  return jsonb_build_object(
    'project', jsonb_build_object(
      'id', found.id,
      'public_id', found.public_id,
      'name', found.name,
      'health', found.health,
      'staging_url', found.staging_url,
      'launches_on', found.launches_on,
      'status', found.status,
      'lead_id', found.lead_id
    ),
    'stages', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id, 'position', s.position, 'name', s.name,
        'starts_on', s.starts_on, 'ends_on', s.ends_on, 'completed_at', s.completed_at
      ) order by s.position)
      from public.stages s
      where s.project_id = found.id
    ), '[]'::jsonb),
    'tickets', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', t.id, 'number', t.number, 'title', t.title, 'description', t.description,
        'status', t.status, 'due_on', t.due_on, 'created_at', t.created_at,
        'waiting_on_client', t.waiting_on_client, 'stage_id', t.stage_id,
        'owner_id', t.owner_id
      ) order by t.number)
      from public.tickets t
      where t.project_id = found.id and t.client_visible
    ), '[]'::jsonb),
    'checklist_items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', i.id, 'ticket_id', i.ticket_id, 'label', i.label, 'done', i.done
      ) order by i.ticket_id, i.position)
      from public.ticket_checklist_items i
      join public.tickets t on t.id = i.ticket_id and t.project_id = i.project_id
      where i.project_id = found.id and t.client_visible
    ), '[]'::jsonb),
    'updates', coalesce((
      select jsonb_agg(row_data order by created_at desc)
      from (
        select
          u.created_at,
          jsonb_build_object(
            'id', u.id, 'body', u.body, 'created_at', u.created_at,
            'edited_at', u.edited_at, 'highlight', u.highlight,
            'needs_client', u.needs_client, 'author_id', u.author_id,
            'ticket_ids', coalesce((
              select jsonb_agg(ut.ticket_id)
              from public.update_tickets ut
              join public.tickets t on t.id = ut.ticket_id and t.project_id = ut.project_id
              where ut.update_id = u.id and t.client_visible
            ), '[]'::jsonb)
          ) as row_data
        from public.updates u
        where u.project_id = found.id and u.deleted_at is null
        order by u.created_at desc
        limit 20
      ) live
    ), '[]'::jsonb),
    'milestones', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', m.id, 'title', m.title, 'body', m.body, 'due_on', m.due_on, 'done_at', m.done_at
      ) order by m.due_on)
      from public.project_milestones m
      where m.project_id = found.id
    ), '[]'::jsonb),
    'files', coalesce((
      select jsonb_agg(row_data order by created_at desc)
      from (
        select
          f.created_at,
          jsonb_build_object(
            'id', f.id, 'name', f.name, 'size_bytes', f.size_bytes,
            'content_type', f.content_type, 'created_at', f.created_at,
            'uploaded_by', f.uploaded_by
          ) as row_data
        from public.project_files f
        where f.project_id = found.id and f.shared
        order by f.created_at desc
        limit 200
      ) shared_files
    ), '[]'::jsonb),
    'file_count', (
      select count(*) from public.project_files f
      where f.project_id = found.id and f.shared
    ),
    -- A client sees the teammates on their project's team (team_members_select).
    'team', coalesce((
      select jsonb_agg(jsonb_build_object(
        'user_id', pt.user_id, 'role_label', pt.role_label,
        'name', tm.name, 'email', tm.email
      ) order by pt.position)
      from public.project_team pt
      join public.team_members tm on tm.user_id = pt.user_id
      where pt.project_id = found.id
    ), '[]'::jsonb),
    -- The language the preview opens in: most of the project's clients'.
    'client_locale', (
      select c.locale from public.project_clients c
      where c.project_id = found.id and c.status <> 'removed'
      group by c.locale
      order by count(*) desc, c.locale desc
      limit 1
    )
  );
end;
$$;

revoke all on function public.portal_client_preview(text) from public, anon;
grant execute on function public.portal_client_preview(text) to authenticated;
