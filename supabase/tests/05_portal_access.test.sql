-- Portal access (ADR-009, #130): the project is the tenant. Each role sees and changes
-- only what the policies allow, and composite foreign keys keep child rows in their
-- project. Users are simulated by setting the JWT claims Supabase's auth.uid() reads.
begin;
create extension if not exists pgtap with schema extensions;

select plan(59);

-- Start from no portal projects (seed included); the rollback restores them.
truncate public.projects cascade;

-- ---------------------------------------------------------------------------
-- Fixtures, written as the owner
-- ---------------------------------------------------------------------------

insert into auth.users (instance_id, id, aud, role, email) values
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-4000-a000-000000000001', 'authenticated', 'authenticated', 'admin@test.example'),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-4000-a000-000000000002', 'authenticated', 'authenticated', 'member@test.example'),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-4000-a000-000000000003', 'authenticated', 'authenticated', 'former@test.example'),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-4000-a000-000000000011', 'authenticated', 'authenticated', 'client1@test.example'),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-4000-a000-000000000012', 'authenticated', 'authenticated', 'client2@test.example'),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-4000-a000-000000000013', 'authenticated', 'authenticated', 'removed@test.example'),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-4000-a000-000000000014', 'authenticated', 'authenticated', 'stranger@test.example');

insert into public.team_members (user_id, name, email, role, active) values
  ('10000000-0000-4000-a000-000000000001', 'Admin', 'admin@test.example', 'admin', true),
  ('10000000-0000-4000-a000-000000000002', 'Member', 'member@test.example', 'member', true),
  ('10000000-0000-4000-a000-000000000003', 'Former', 'former@test.example', 'member', false);

insert into public.projects (id, public_id, name, client_name, starts_on, launches_on, status, lead_id) values
  ('10000000-0000-4000-b000-000000000001', 'NB-9001', 'Project one', 'Client one', '2026-11-01', '2027-01-31', 'active', '10000000-0000-4000-a000-000000000001'),
  ('10000000-0000-4000-b000-000000000002', 'NB-9002', 'Project two', 'Client two', '2026-11-01', '2027-01-31', 'active', '10000000-0000-4000-a000-000000000001'),
  ('10000000-0000-4000-b000-000000000003', 'NB-9003', 'Closed project', 'Client one', '2026-01-01', '2026-06-30', 'closed', '10000000-0000-4000-a000-000000000001');

insert into public.project_team (project_id, user_id, role_label) values
  ('10000000-0000-4000-b000-000000000001', '10000000-0000-4000-a000-000000000001', 'Project lead');

insert into public.project_clients (project_id, email, user_id, status, removed_at) values
  ('10000000-0000-4000-b000-000000000001', 'client1@test.example', '10000000-0000-4000-a000-000000000011', 'active', null),
  ('10000000-0000-4000-b000-000000000001', 'removed@test.example', '10000000-0000-4000-a000-000000000013', 'removed', now()),
  ('10000000-0000-4000-b000-000000000002', 'client2@test.example', '10000000-0000-4000-a000-000000000012', 'active', null),
  ('10000000-0000-4000-b000-000000000003', 'client1@test.example', '10000000-0000-4000-a000-000000000011', 'active', null);

insert into public.stages (id, project_id, position, name, starts_on) values
  ('10000000-0000-4000-c000-000000000001', '10000000-0000-4000-b000-000000000001', 1, 'Development', '2026-11-01'),
  ('10000000-0000-4000-c000-000000000002', '10000000-0000-4000-b000-000000000002', 1, 'Development', '2026-11-01'),
  ('10000000-0000-4000-c000-000000000003', '10000000-0000-4000-b000-000000000003', 1, 'Development', '2026-01-01');

insert into public.tickets (id, project_id, stage_id, title, client_visible) values
  ('10000000-0000-4000-d000-000000000001', '10000000-0000-4000-b000-000000000001', '10000000-0000-4000-c000-000000000001', 'Visible ticket', true),
  ('10000000-0000-4000-d000-000000000002', '10000000-0000-4000-b000-000000000001', '10000000-0000-4000-c000-000000000001', 'Team-only ticket', false),
  ('10000000-0000-4000-d000-000000000003', '10000000-0000-4000-b000-000000000002', '10000000-0000-4000-c000-000000000002', 'Other project ticket', true);

insert into public.ticket_checklist_items (project_id, ticket_id, position, label) values
  ('10000000-0000-4000-b000-000000000001', '10000000-0000-4000-d000-000000000001', 0, 'Visible item'),
  ('10000000-0000-4000-b000-000000000001', '10000000-0000-4000-d000-000000000002', 0, 'Hidden item');

insert into public.updates (id, project_id, author_id, body, deleted_at) values
  ('10000000-0000-4000-e000-000000000001', '10000000-0000-4000-b000-000000000001', '10000000-0000-4000-a000-000000000001', 'Live update', null),
  ('10000000-0000-4000-e000-000000000002', '10000000-0000-4000-b000-000000000001', '10000000-0000-4000-a000-000000000001', 'Deleted update', now()),
  ('10000000-0000-4000-e000-000000000003', '10000000-0000-4000-b000-000000000002', '10000000-0000-4000-a000-000000000001', 'Other project update', null);

insert into public.update_tickets (project_id, update_id, ticket_id) values
  ('10000000-0000-4000-b000-000000000001', '10000000-0000-4000-e000-000000000001', '10000000-0000-4000-d000-000000000001'),
  ('10000000-0000-4000-b000-000000000001', '10000000-0000-4000-e000-000000000001', '10000000-0000-4000-d000-000000000002');

insert into public.project_files (id, project_id, storage_path, name, size_bytes, content_type, shared) values
  ('10000000-0000-4000-f000-000000000001', '10000000-0000-4000-b000-000000000001',
   'projects/10000000-0000-4000-b000-000000000001/10000000-0000-4000-f000-000000000001', 'Shared.pdf', 100, 'application/pdf', true),
  ('10000000-0000-4000-f000-000000000002', '10000000-0000-4000-b000-000000000001',
   'projects/10000000-0000-4000-b000-000000000001/10000000-0000-4000-f000-000000000002', 'Team only.pdf', 100, 'application/pdf', false),
  ('10000000-0000-4000-f000-000000000003', '10000000-0000-4000-b000-000000000002',
   'projects/10000000-0000-4000-b000-000000000002/10000000-0000-4000-f000-000000000003', 'Other.pdf', 100, 'application/pdf', true);

insert into public.access_events (project_id, kind, email) values
  ('10000000-0000-4000-b000-000000000001', 'sign_in', 'client1@test.example');

-- ---------------------------------------------------------------------------
-- Structure (1–18)
-- ---------------------------------------------------------------------------

select ok(relrowsecurity, format('RLS is enabled on %s', oid::regclass))
from pg_class
where oid in (
  'public.team_members'::regclass,
  'public.portal_settings'::regclass,
  'public.projects'::regclass,
  'public.project_team'::regclass,
  'public.project_clients'::regclass,
  'public.stages'::regclass,
  'public.tickets'::regclass,
  'public.ticket_checklist_items'::regclass,
  'public.updates'::regclass,
  'public.update_tickets'::regclass,
  'public.project_files'::regclass,
  'public.access_events'::regclass,
  'private.portal_sign_in_attempts'::regclass
);

set local role anon;
select throws_ok('select * from public.projects', '42501', null, 'anon cannot select projects');
select throws_ok('select * from public.tickets', '42501', null, 'anon cannot select tickets');
reset role;

select ok(
  not has_function_privilege('anon', 'private.is_team_member()', 'execute'),
  'anon cannot execute the access helpers'
);
select ok(
  exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'updates'),
  'updates is published to Realtime'
);
select is(
  (select count(*)::int from pg_publication_tables
   where pubname = 'supabase_realtime' and schemaname = 'public'
     and tablename in ('team_members', 'portal_settings', 'projects', 'project_team', 'project_clients',
                       'stages', 'tickets', 'ticket_checklist_items', 'updates', 'update_tickets',
                       'project_files', 'access_events')),
  1,
  'no other portal table is published to Realtime'
);

-- ---------------------------------------------------------------------------
-- An active client of project one (19–33)
-- ---------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-a000-000000000011","role":"authenticated"}', true);
set local role authenticated;

select is((select count(*)::int from public.projects), 1, 'client sees only their open project (not the other project, not their closed one)');
select is((select count(*)::int from public.tickets), 1, 'client sees only the client-visible ticket of their project');
select is((select count(*)::int from public.tickets where project_id = '10000000-0000-4000-b000-000000000002'), 0, 'client sees no ticket of another project');
select is((select count(*)::int from public.ticket_checklist_items), 1, 'client sees checklist items of visible tickets only');
select is((select count(*)::int from public.updates), 1, 'client sees live updates of their project only');
select is((select count(*)::int from public.update_tickets), 1, 'client sees only links between live updates and visible tickets');
select is((select count(*)::int from public.project_files), 1, 'client sees shared files of their project only');
select is((select count(*)::int from public.stages), 1, 'client sees the stages of their open project only');
select is((select count(*)::int from public.project_clients), 0, 'client cannot list client access');
select is((select count(*)::int from public.access_events), 0, 'client cannot read the activity log');
select is((select count(*)::int from public.team_members), 1, 'client sees only the people on their project');
select is((select count(*)::int from public.portal_settings), 0, 'client cannot read settings');
select throws_ok(
  $$insert into public.tickets (project_id, stage_id, title) values ('10000000-0000-4000-b000-000000000001', '10000000-0000-4000-c000-000000000001', 'Sneaky')$$,
  '42501', null, 'client cannot create tickets'
);
-- Updates without a policy match no rows; checked as the owner below.
update public.projects set name = 'Renamed' where id = '10000000-0000-4000-b000-000000000001';
update public.tickets set status = 'done' where id = '10000000-0000-4000-d000-000000000001';
reset role;
select is((select name from public.projects where id = '10000000-0000-4000-b000-000000000001'), 'Project one', 'client cannot change their project');
select is((select status from public.tickets where id = '10000000-0000-4000-d000-000000000001'), 'todo', 'client cannot change a ticket');

-- ---------------------------------------------------------------------------
-- A removed client, and a signed-in stranger (34–37)
-- ---------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-a000-000000000013","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.projects), 0, 'a removed client sees no project');
reset role;

select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-a000-000000000014","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.projects), 0, 'a stranger sees no project');
select is((select count(*)::int from public.tickets), 0, 'a stranger sees no ticket');
select is((select count(*)::int from public.team_members), 0, 'a stranger sees no teammate');
reset role;

-- ---------------------------------------------------------------------------
-- A team member (38–48)
-- ---------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-a000-000000000002","role":"authenticated"}', true);
set local role authenticated;

select is((select count(*)::int from public.projects), 3, 'a member sees every project');
select is((select count(*)::int from public.tickets), 3, 'a member sees team-only tickets too');
select is((select count(*)::int from public.project_clients), 4, 'a member can read client access');
select lives_ok(
  $$insert into public.tickets (project_id, stage_id, title) values ('10000000-0000-4000-b000-000000000001', '10000000-0000-4000-c000-000000000001', 'New ticket')$$,
  'a member can create a ticket'
);
select is(
  (select number from public.tickets where title = 'New ticket'),
  3,
  'ticket numbers continue per project'
);
select throws_ok(
  $$insert into public.projects (name, client_name, starts_on, launches_on, lead_id) values ('X', 'Y', '2026-11-01', '2026-12-01', '10000000-0000-4000-a000-000000000002')$$,
  '42501', null, 'a member cannot create a project'
);
select throws_ok(
  $$update public.projects set public_id = 'NB-1234' where id = '10000000-0000-4000-b000-000000000001'$$,
  '42501', null, 'nobody changes a Project ID directly'
);
select throws_ok(
  $$insert into public.project_clients (project_id, email) values ('10000000-0000-4000-b000-000000000001', 'new@test.example')$$,
  '42501', null, 'a member cannot grant client access'
);
update public.portal_settings set daily_digest = false;
reset role;
select ok((select daily_digest from public.portal_settings), 'a member cannot change settings');
set local role authenticated;
select throws_ok(
  $$insert into public.updates (project_id, author_id, body) values ('10000000-0000-4000-b000-000000000001', '10000000-0000-4000-a000-000000000001', 'As someone else')$$,
  '42501', null, 'a member cannot post as someone else'
);
select lives_ok(
  $$insert into public.updates (project_id, author_id, body) values ('10000000-0000-4000-b000-000000000001', '10000000-0000-4000-a000-000000000002', 'As myself')$$,
  'a member can post an update as themselves'
);
reset role;

-- ---------------------------------------------------------------------------
-- A deactivated teammate (49)
-- ---------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-a000-000000000003","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.projects), 0, 'a removed teammate sees no project');
reset role;

-- ---------------------------------------------------------------------------
-- An admin (50–53)
-- ---------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-a000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select lives_ok(
  $$insert into public.projects (name, client_name, starts_on, launches_on, lead_id) values ('Admin project', 'Client', '2026-11-01', '2026-12-01', '10000000-0000-4000-a000-000000000001')$$,
  'an admin can create a project'
);
select ok(
  (select public_id ~ '^NB-[0-9]{4}$' from public.projects where name = 'Admin project'),
  'a new project gets a generated NB-0000 Project ID'
);
select lives_ok(
  $$insert into public.project_clients (project_id, email) values ('10000000-0000-4000-b000-000000000001', 'new@test.example')$$,
  'an admin can grant client access'
);
update public.portal_settings set daily_digest = false;
reset role;
select ok(not (select daily_digest from public.portal_settings), 'an admin can change settings');

-- ---------------------------------------------------------------------------
-- Integrity: nothing joins rows from two projects (54–59)
-- ---------------------------------------------------------------------------

select throws_ok(
  $$insert into public.tickets (project_id, stage_id, title) values ('10000000-0000-4000-b000-000000000002', '10000000-0000-4000-c000-000000000001', 'Cross')$$,
  '23503', null, 'a ticket cannot use another project''s stage'
);
select throws_ok(
  $$insert into public.ticket_checklist_items (project_id, ticket_id, position, label) values ('10000000-0000-4000-b000-000000000002', '10000000-0000-4000-d000-000000000001', 1, 'Cross')$$,
  '23503', null, 'a checklist item cannot belong to another project''s ticket'
);
select throws_ok(
  $$insert into public.update_tickets (project_id, update_id, ticket_id) values ('10000000-0000-4000-b000-000000000002', '10000000-0000-4000-e000-000000000003', '10000000-0000-4000-d000-000000000001')$$,
  '23503', null, 'an update cannot link a ticket from another project'
);
select throws_ok(
  $$insert into public.project_files (project_id, storage_path, name, size_bytes, content_type) values ('10000000-0000-4000-b000-000000000002', 'projects/10000000-0000-4000-b000-000000000001/x', 'x.pdf', 1, 'application/pdf')$$,
  '23514', null, 'a file path must sit in its own project folder'
);
select throws_ok(
  $$insert into public.projects (public_id, name, client_name, starts_on, launches_on, lead_id) values ('NB-9004', 'Backwards', 'C', '2026-12-01', '2026-11-01', '10000000-0000-4000-a000-000000000001')$$,
  '23514', null, 'launch cannot be before the start'
);
select throws_ok(
  $$insert into public.projects (public_id, name, client_name, starts_on, launches_on, lead_id) values ('PROJ-1', 'Bad id', 'C', '2026-11-01', '2026-12-01', '10000000-0000-4000-a000-000000000001')$$,
  '23514', null, 'a Project ID must look like NB-0000'
);

select * from finish();
rollback;
