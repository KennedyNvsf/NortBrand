-- Portal file uploads (#140): the team uploads, reads and deletes only inside its own
-- projects' folders; clients can't upload, list or read unshared or other projects'
-- files; a file is registered only for an object that exists, team-only at first.
begin;
create extension if not exists pgtap with schema extensions;

select plan(18);

truncate public.projects cascade;
delete from public.team_members;
-- Storage refuses direct deletes unless asked; the policies still decide who may delete.
set local storage.allow_delete_query = 'true';

insert into auth.users (instance_id, id, aud, role, email) values
  ('00000000-0000-0000-0000-000000000000', 'e0000000-0000-4000-a000-000000000001', 'authenticated', 'authenticated', 'tiago@test.example'),
  ('00000000-0000-0000-0000-000000000000', 'e0000000-0000-4000-a000-000000000002', 'authenticated', 'authenticated', 'away@test.example'),
  ('00000000-0000-0000-0000-000000000000', 'e0000000-0000-4000-a000-000000000003', 'authenticated', 'authenticated', 'joao@client.example');

insert into public.team_members (user_id, name, email, role) values
  ('e0000000-0000-4000-a000-000000000001', 'Tiago Sousa', 'tiago@test.example', 'member'),
  ('e0000000-0000-4000-a000-000000000002', 'Away', 'away@test.example', 'member');

insert into public.projects (id, public_id, name, client_name, starts_on, launches_on, lead_id) values
  ('e0000000-0000-4000-b000-000000000001', 'NB-9911', 'Café website', 'Café', '2026-10-01', '2027-02-12', 'e0000000-0000-4000-a000-000000000001'),
  ('e0000000-0000-4000-b000-000000000002', 'NB-9912', 'Other site', 'Other', '2026-10-01', '2027-02-12', 'e0000000-0000-4000-a000-000000000002');
insert into public.project_team (project_id, user_id, role_label) values
  ('e0000000-0000-4000-b000-000000000001', 'e0000000-0000-4000-a000-000000000001', 'Design'),
  ('e0000000-0000-4000-b000-000000000002', 'e0000000-0000-4000-a000-000000000002', 'Design');
insert into public.project_clients (project_id, email, user_id, status) values
  ('e0000000-0000-4000-b000-000000000001', 'joao@client.example', 'e0000000-0000-4000-a000-000000000003', 'active');

-- An object in the other project, owned by its team.
insert into storage.objects (bucket_id, name) values
  ('portal-files', 'projects/e0000000-0000-4000-b000-000000000002/e0000000-0000-4000-f000-000000000009');

select is(
  (select allowed_mime_types @> array['image/svg+xml'] from storage.buckets where id = 'portal-files'),
  false, 'SVG is not allowed in the bucket');

set local role authenticated;

-- ---------------------------------------------------------------------------
-- The team (2–10)
-- ---------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub":"e0000000-0000-4000-a000-000000000001","role":"authenticated"}', true);
select lives_ok(
  $$insert into storage.objects (bucket_id, name) values ('portal-files', 'projects/e0000000-0000-4000-b000-000000000001/e0000000-0000-4000-f000-000000000001')$$,
  'a teammate uploads into their project''s folder');
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('portal-files', 'projects/e0000000-0000-4000-b000-000000000002/e0000000-0000-4000-f000-000000000002')$$,
  '42501', null, 'but not into another project''s folder');
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('portal-files', 'projects/e0000000-0000-4000-b000-000000000001/../e0000000-0000-4000-b000-000000000002/x')$$,
  '42501', null, 'nor anywhere outside the exact projects/<project>/<file> shape');
select is(
  (select count(*)::int from storage.objects where bucket_id = 'portal-files'),
  1, 'a teammate reads their project''s objects, even before they are registered, and no others');

select lives_ok(
  $$select public.portal_register_file('e0000000-0000-4000-b000-000000000001', 'e0000000-0000-4000-f000-000000000001', ' Home page design ', 4200000, 'application/pdf')$$,
  'the checked upload is registered');
select results_eq(
  $$select name, shared, uploaded_by from public.project_files where id = 'e0000000-0000-4000-f000-000000000001'$$,
  $$values ('Home page design', false, 'e0000000-0000-4000-a000-000000000001'::uuid)$$,
  'team-only at first, by the teammate');
select throws_ok(
  $$select public.portal_register_file('e0000000-0000-4000-b000-000000000001', 'e0000000-0000-4000-f000-000000000003', 'Ghost', 10, 'application/pdf')$$,
  'P0002', null, 'a file without an uploaded object is refused');
select throws_ok(
  $$select public.portal_register_file('e0000000-0000-4000-b000-000000000002', 'e0000000-0000-4000-f000-000000000009', 'Not mine', 10, 'application/pdf')$$,
  'P0002', null, 'a teammate cannot register files on another project');
select throws_ok(
  $$select public.portal_register_file('e0000000-0000-4000-b000-000000000001', 'e0000000-0000-4000-f000-000000000001', 'Logo', 10, 'image/svg+xml')$$,
  '22023', null, 'SVG is refused');

-- ---------------------------------------------------------------------------
-- The client (11–16)
-- ---------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub":"e0000000-0000-4000-a000-000000000003","role":"authenticated"}', true);
select is((select count(*)::int from storage.objects where bucket_id = 'portal-files'), 0, 'a client cannot list a team-only file');
select is((select count(*)::int from public.project_files), 0, 'nor see its row');
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('portal-files', 'projects/e0000000-0000-4000-b000-000000000001/e0000000-0000-4000-f000-000000000004')$$,
  '42501', null, 'a client cannot upload');

select set_config('request.jwt.claims', '{"sub":"e0000000-0000-4000-a000-000000000001","role":"authenticated"}', true);
update public.project_files set shared = true where id = 'e0000000-0000-4000-f000-000000000001';
select set_config('request.jwt.claims', '{"sub":"e0000000-0000-4000-a000-000000000003","role":"authenticated"}', true);
select is(
  (select count(*)::int from storage.objects where bucket_id = 'portal-files'),
  1, 'once shared, the client reads that one object, and never the other project''s');
delete from storage.objects where bucket_id = 'portal-files';
reset role;
select is((select count(*)::int from storage.objects where bucket_id = 'portal-files'), 2, 'a client cannot delete files');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"e0000000-0000-4000-a000-000000000003","role":"authenticated"}', true);
select is(
  (select count(*)::int from public.project_files where shared),
  1, 'and sees the shared row');

-- ---------------------------------------------------------------------------
-- Delete (17–18)
-- ---------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub":"e0000000-0000-4000-a000-000000000002","role":"authenticated"}', true);
delete from storage.objects where name like 'projects/e0000000-0000-4000-b000-000000000001/%';
reset role;
select is(
  (select count(*)::int from storage.objects where name like 'projects/e0000000-0000-4000-b000-000000000001/%'),
  1, 'a teammate not on the project cannot delete its files');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"e0000000-0000-4000-a000-000000000001","role":"authenticated"}', true);
delete from storage.objects where name = 'projects/e0000000-0000-4000-b000-000000000001/e0000000-0000-4000-f000-000000000001';
reset role;
select is(
  (select count(*)::int from storage.objects where name like 'projects/e0000000-0000-4000-b000-000000000001/%'),
  0, 'the project''s teammate can');

select * from finish();
rollback;
