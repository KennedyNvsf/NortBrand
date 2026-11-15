-- Portal file uploads (#140; Figma TM-08 544:789). The bucket and the client read rule
-- exist since #135; this adds the team's side.
--
-- Uploads go straight from the browser to Storage (Vercel functions take at most 4.5 MB),
-- through a signed upload URL the server creates after an access check. Then the server
-- reads the object's first bytes and true size, refuses anything that isn't really a
-- PDF, PNG, JPEG, WebP, GIF or ZIP or is over 50 MB (and deletes it), and only then
-- registers the file. New files are team-only until shared.
--
-- Storage rules by path: objects live at projects/<project id>/<file id>, and the team
-- working on that project may read, upload and delete there (the read is what lets the
-- server check an upload before it has a project_files row). Clients still read only
-- through portal_files_read: shared files of their own projects. SVG is dropped from the
-- bucket: it can't be checked by its first bytes, and it can carry script.

create function private.portal_file_project(p_path text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select case
    when p_path ~ '^projects/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then split_part(p_path, '/', 2)::uuid
  end;
$$;

grant execute on function private.portal_file_project(text) to authenticated;

do $storage$
begin
  if to_regclass('storage.buckets') is null then
    raise notice 'storage schema not present: upload rules skipped';
    return;
  end if;

  update storage.buckets
  set allowed_mime_types = array[
    'application/pdf',
    'application/zip',
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif'
  ]
  where id = 'portal-files';

  execute $policy$
    create policy portal_files_team_read on storage.objects
      for select to authenticated
      using (
        bucket_id = 'portal-files'
        and private.works_on_project(private.portal_file_project(name))
      )
  $policy$;

  execute $policy$
    create policy portal_files_team_insert on storage.objects
      for insert to authenticated
      with check (
        bucket_id = 'portal-files'
        and private.works_on_project(private.portal_file_project(name))
      )
  $policy$;

  execute $policy$
    create policy portal_files_team_delete on storage.objects
      for delete to authenticated
      using (
        bucket_id = 'portal-files'
        and private.works_on_project(private.portal_file_project(name))
      )
  $policy$;
end
$storage$;

-- Registers an uploaded, already-checked object as a team-only file. SECURITY INVOKER:
-- RLS decides (project_files_team_write), the uploader is the signed-in teammate, and the
-- object must exist at exactly projects/<project>/<file id>.
create function public.portal_register_file(
  p_project_id uuid,
  p_file_id uuid,
  p_name text,
  p_size_bytes bigint,
  p_content_type text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  path text := 'projects/' || p_project_id::text || '/' || p_file_id::text;
begin
  if not private.works_on_project(p_project_id) then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if p_content_type = 'image/svg+xml' then
    raise exception 'type not allowed' using errcode = '22023';
  end if;
  if not exists (select 1 from storage.objects o where o.bucket_id = 'portal-files' and o.name = path) then
    raise exception 'upload missing' using errcode = 'P0002';
  end if;

  insert into public.project_files (id, project_id, storage_path, name, size_bytes, content_type, shared, uploaded_by)
  values (p_file_id, p_project_id, path, btrim(p_name), p_size_bytes, p_content_type, false, (select auth.uid()));
end;
$$;

revoke all on function public.portal_register_file(uuid, uuid, text, bigint, text) from public, anon, authenticated;
grant execute on function public.portal_register_file(uuid, uuid, text, bigint, text) to authenticated;
