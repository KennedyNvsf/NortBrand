-- Client timeline and files (#135): project milestones, and the private bucket the
-- portal's files live in, with its read rule.
--
-- * public.project_milestones: "the moments where we check in with you" (Figma CP-05).
--   Clients read their projects' milestones; the team on a project writes them (the
--   stages editor, #138, manages them). Same tenant model as the other portal tables.
-- * storage bucket portal-files (private): objects at projects/<project id>/<file id>,
--   matching project_files.storage_path. Read rule: an object is readable exactly when its
--   project_files row is readable, so clients get shared files of their own projects and
--   the team the files of projects they work on (project_files RLS decides). Downloads go
--   through short-lived signed URLs created with the reader's own session. Uploading and
--   the team's write rules come with #140.

create table public.project_milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  body text not null default '' check (char_length(body) <= 300),
  due_on date not null,
  done_at timestamptz,
  created_at timestamptz not null default now(),
  unique (project_id, id)
);

create index project_milestones_project_due_idx on public.project_milestones (project_id, due_on);

alter table public.project_milestones enable row level security;
revoke all on table public.project_milestones from public, anon, authenticated;
grant select, insert, delete on table public.project_milestones to authenticated;
grant update (title, body, due_on, done_at) on public.project_milestones to authenticated;

create policy project_milestones_select on public.project_milestones
  for select to authenticated
  using (private.works_on_project(project_id) or private.is_project_client(project_id));
create policy project_milestones_team_write on public.project_milestones
  for all to authenticated
  using (private.works_on_project(project_id))
  with check (private.works_on_project(project_id));

-- ---------------------------------------------------------------------------
-- Storage
-- ---------------------------------------------------------------------------

-- Storage exists on every hosted project and on `supabase start`; a database-only stack
-- (`supabase db start`) has no storage schema, so the bucket and its rule are skipped there.
do $storage$
begin
  if to_regclass('storage.buckets') is null then
    raise notice 'storage schema not present: portal-files bucket skipped';
    return;
  end if;

  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values (
    'portal-files',
    'portal-files',
    false,
    52428800,
    array[
      'application/pdf',
      'application/zip',
      'image/png',
      'image/jpeg',
      'image/webp',
      'image/gif',
      'image/svg+xml'
    ]
  )
  on conflict (id) do nothing;

  -- Readable exactly when the matching project_files row is readable (its RLS applies).
  execute $policy$
    create policy portal_files_read on storage.objects
      for select to authenticated
      using (
        bucket_id = 'portal-files'
        and exists (
          select 1 from public.project_files f
          where f.storage_path = storage.objects.name
        )
      )
  $policy$;
end
$storage$;
