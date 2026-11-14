-- Milestones and file storage (#135): who reads milestones, who writes them, and the
-- portal-files read rule (shared files of your own project only; the team on that project).
begin;
create extension if not exists pgtap with schema extensions;

select plan(16);

truncate public.projects cascade;
delete from public.team_members;

insert into auth.users (instance_id, id, aud, role, email) values
  ('00000000-0000-0000-0000-000000000000', '40000000-0000-4000-a000-000000000001', 'authenticated', 'authenticated', 'lead@files.example'),
  ('00000000-0000-0000-0000-000000000000', '40000000-0000-4000-a000-000000000002', 'authenticated', 'authenticated', 'outsider@files.example'),
  ('00000000-0000-0000-0000-000000000000', '40000000-0000-4000-a000-000000000011', 'authenticated', 'authenticated', 'client@files.example'),
  ('00000000-0000-0000-0000-000000000000', '40000000-0000-4000-a000-000000000012', 'authenticated', 'authenticated', 'other@files.example');

insert into public.team_members (user_id, name, email, role) values
  ('40000000-0000-4000-a000-000000000001', 'Lead', 'lead@files.example', 'admin'),
  ('40000000-0000-4000-a000-000000000002', 'Outsider', 'outsider@files.example', 'member');

insert into public.projects (id, public_id, name, client_name, starts_on, launches_on, lead_id) values
  ('40000000-0000-4000-b000-000000000001', 'NB-9401', 'Mine', 'Client', '2026-10-01', '2027-02-12', '40000000-0000-4000-a000-000000000001'),
  ('40000000-0000-4000-b000-000000000002', 'NB-9402', 'Theirs', 'Other', '2026-10-01', '2027-02-12', '40000000-0000-4000-a000-000000000001');

insert into public.project_clients (project_id, email, user_id, status) values
  ('40000000-0000-4000-b000-000000000001', 'client@files.example', '40000000-0000-4000-a000-000000000011', 'active'),
  ('40000000-0000-4000-b000-000000000002', 'other@files.example', '40000000-0000-4000-a000-000000000012', 'active');

insert into public.project_milestones (project_id, title, due_on) values
  ('40000000-0000-4000-b000-000000000001', 'Kick-off call', '2026-10-01'),
  ('40000000-0000-4000-b000-000000000001', 'Launch', '2027-02-12'),
  ('40000000-0000-4000-b000-000000000002', 'Their launch', '2027-02-12');

insert into public.project_files (id, project_id, storage_path, name, size_bytes, content_type, shared) values
  ('40000000-0000-4000-f000-000000000001', '40000000-0000-4000-b000-000000000001',
   'projects/40000000-0000-4000-b000-000000000001/40000000-0000-4000-f000-000000000001', 'Shared.pdf', 1000, 'application/pdf', true),
  ('40000000-0000-4000-f000-000000000002', '40000000-0000-4000-b000-000000000001',
   'projects/40000000-0000-4000-b000-000000000001/40000000-0000-4000-f000-000000000002', 'Internal.pdf', 1000, 'application/pdf', false),
  ('40000000-0000-4000-f000-000000000003', '40000000-0000-4000-b000-000000000002',
   'projects/40000000-0000-4000-b000-000000000002/40000000-0000-4000-f000-000000000003', 'Theirs.pdf', 1000, 'application/pdf', true);

insert into storage.objects (bucket_id, name) values
  ('portal-files', 'projects/40000000-0000-4000-b000-000000000001/40000000-0000-4000-f000-000000000001'),
  ('portal-files', 'projects/40000000-0000-4000-b000-000000000001/40000000-0000-4000-f000-000000000002'),
  ('portal-files', 'projects/40000000-0000-4000-b000-000000000002/40000000-0000-4000-f000-000000000003');

-- ---------------------------------------------------------------------------
-- The bucket (1)
-- ---------------------------------------------------------------------------

select is((select public from storage.buckets where id = 'portal-files'), false, 'portal-files is a private bucket');

-- ---------------------------------------------------------------------------
-- Milestones (2–6)
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"40000000-0000-4000-a000-000000000011","role":"authenticated"}', true);
select is((select count(*)::int from public.project_milestones), 2, 'a client reads only their own project''s milestones');
select throws_ok(
  $$insert into public.project_milestones (project_id, title, due_on) values ('40000000-0000-4000-b000-000000000001', 'Sneaky', '2026-12-01')$$,
  '42501', null, 'a client cannot add a milestone');

select set_config('request.jwt.claims', '{"sub":"40000000-0000-4000-a000-000000000002","role":"authenticated"}', true);
select is((select count(*)::int from public.project_milestones), 0, 'a member not on the project reads none');
select throws_ok(
  $$insert into public.project_milestones (project_id, title, due_on) values ('40000000-0000-4000-b000-000000000001', 'Nope', '2026-12-01')$$,
  '42501', null, 'a member not on the project cannot add one');

select set_config('request.jwt.claims', '{"sub":"40000000-0000-4000-a000-000000000001","role":"authenticated"}', true);
select lives_ok(
  $$insert into public.project_milestones (project_id, title, due_on) values ('40000000-0000-4000-b000-000000000001', 'Staging walkthrough', '2026-12-16')$$,
  'the team on the project adds a milestone');
reset role;

-- ---------------------------------------------------------------------------
-- File storage (7–16)
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"40000000-0000-4000-a000-000000000011","role":"authenticated"}', true);
select is((select count(*)::int from storage.objects where bucket_id = 'portal-files'
  and name = 'projects/40000000-0000-4000-b000-000000000001/40000000-0000-4000-f000-000000000001'), 1,
  'a client can read a shared file of their project');
select is((select count(*)::int from storage.objects where bucket_id = 'portal-files'
  and name = 'projects/40000000-0000-4000-b000-000000000001/40000000-0000-4000-f000-000000000002'), 0,
  'a client cannot read an unshared file of their project');
select is((select count(*)::int from storage.objects where bucket_id = 'portal-files'
  and name = 'projects/40000000-0000-4000-b000-000000000002/40000000-0000-4000-f000-000000000003'), 0,
  'a client cannot read another project''s shared file');
select is((select count(*)::int from storage.objects where bucket_id = 'portal-files'), 1, 'a client sees exactly one object');

select set_config('request.jwt.claims', '{"sub":"40000000-0000-4000-a000-000000000001","role":"authenticated"}', true);
select is((select count(*)::int from storage.objects where bucket_id = 'portal-files'
  and name like 'projects/40000000-0000-4000-b000-000000000001/%'), 2,
  'an admin reads every file of a project, shared or not');

select set_config('request.jwt.claims', '{"sub":"40000000-0000-4000-a000-000000000002","role":"authenticated"}', true);
select is((select count(*)::int from storage.objects where bucket_id = 'portal-files'), 0,
  'a member not on any project reads no files');

select set_config('request.jwt.claims', '{"sub":"40000000-0000-4000-a000-000000000012","role":"authenticated"}', true);
select is((select count(*)::int from storage.objects where bucket_id = 'portal-files'
  and name like 'projects/40000000-0000-4000-b000-000000000001/%'), 0,
  'another client cannot read this project''s files');
reset role;

set local role anon;
select is((select count(*)::int from storage.objects where bucket_id = 'portal-files'), 0, 'anon reads nothing');
reset role;

-- Sharing is what opens the door: unshare the shared file and the client loses it.
update public.project_files set shared = false where id = '40000000-0000-4000-f000-000000000001';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"40000000-0000-4000-a000-000000000011","role":"authenticated"}', true);
select is((select count(*)::int from storage.objects where bucket_id = 'portal-files'), 0, 'unsharing a file closes it to the client');
reset role;

select ok(not has_table_privilege('anon', 'public.project_milestones', 'select'), 'anon has no access to milestones');

select * from finish();
rollback;
