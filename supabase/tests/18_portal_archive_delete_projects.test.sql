-- Archive and delete client projects (#165): only admins archive, restore or delete; an
-- archived project is invisible to its clients and read-only for the team; delete
-- needs the Project ID, removes every row, and names only the clients whose only
-- project it was.
begin;
create extension if not exists pgtap with schema extensions;

select plan(22);

truncate public.projects cascade;
delete from public.team_members;

insert into auth.users (instance_id, id, aud, role, email) values
  ('00000000-0000-0000-0000-000000000000', 'a1800000-0000-4000-a000-000000000001', 'authenticated', 'authenticated', 'ana@test.example'),
  ('00000000-0000-0000-0000-000000000000', 'a1800000-0000-4000-a000-000000000002', 'authenticated', 'authenticated', 'tiago@test.example'),
  ('00000000-0000-0000-0000-000000000000', 'a1800000-0000-4000-a000-000000000003', 'authenticated', 'authenticated', 'only@client.example'),
  ('00000000-0000-0000-0000-000000000000', 'a1800000-0000-4000-a000-000000000004', 'authenticated', 'authenticated', 'both@client.example');

insert into public.team_members (user_id, name, email, role) values
  ('a1800000-0000-4000-a000-000000000001', 'Ana Costa', 'ana@test.example', 'admin'),
  ('a1800000-0000-4000-a000-000000000002', 'Tiago Sousa', 'tiago@test.example', 'member');

insert into public.projects (id, public_id, name, client_name, starts_on, launches_on, lead_id) values
  ('a1800000-0000-4000-b000-000000000001', 'NB-9981', 'Atlântico Café website', 'Atlântico Café', '2026-10-01', '2027-02-12', 'a1800000-0000-4000-a000-000000000002'),
  ('a1800000-0000-4000-b000-000000000002', 'NB-9982', 'Casa Moura shop', 'Casa Moura', '2026-10-01', '2027-02-12', 'a1800000-0000-4000-a000-000000000001');
insert into public.project_team (project_id, user_id, role_label) values
  ('a1800000-0000-4000-b000-000000000001', 'a1800000-0000-4000-a000-000000000002', 'Project lead');
insert into public.stages (id, project_id, position, name, starts_on) values
  ('a1800000-0000-4000-c000-000000000001', 'a1800000-0000-4000-b000-000000000001', 1, 'Design', '2026-10-01');
insert into public.tickets (id, project_id, stage_id, title, status, client_visible) values
  ('a1800000-0000-4000-d000-000000000001', 'a1800000-0000-4000-b000-000000000001', 'a1800000-0000-4000-c000-000000000001', 'Menu photos', 'todo', true);
insert into public.updates (project_id, author_id, body) values
  ('a1800000-0000-4000-b000-000000000001', 'a1800000-0000-4000-a000-000000000002', 'Design has started.');
insert into public.project_clients (project_id, email, user_id, status) values
  ('a1800000-0000-4000-b000-000000000001', 'only@client.example', 'a1800000-0000-4000-a000-000000000003', 'active'),
  ('a1800000-0000-4000-b000-000000000001', 'both@client.example', 'a1800000-0000-4000-a000-000000000004', 'active'),
  ('a1800000-0000-4000-b000-000000000002', 'both@client.example', 'a1800000-0000-4000-a000-000000000004', 'active');

select ok(not has_function_privilege('anon', 'public.portal_set_project_status(uuid, text)', 'execute'), 'the public key cannot archive');
select ok(not has_function_privilege('anon', 'public.portal_delete_project(uuid, text)', 'execute'), 'or delete');

set local role authenticated;

-- ---------------------------------------------------------------------------
-- Archive (3–12)
-- ---------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub":"a1800000-0000-4000-a000-000000000002","role":"authenticated"}', true);
select throws_ok(
  $$select public.portal_set_project_status('a1800000-0000-4000-b000-000000000001', 'closed')$$,
  '42501', null, 'a member (even the project lead) cannot archive');
select throws_ok(
  $$update public.projects set status = 'closed' where id = 'a1800000-0000-4000-b000-000000000001'$$,
  '42501', null, 'nor change the status directly');

select set_config('request.jwt.claims', '{"sub":"a1800000-0000-4000-a000-000000000001","role":"authenticated"}', true);
select lives_ok(
  $$select public.portal_set_project_status('a1800000-0000-4000-b000-000000000001', 'closed')$$,
  'an admin archives a project');
select throws_ok(
  $$select public.portal_set_project_status('a1800000-0000-4000-b000-000000000001', 'gone')$$,
  '22023', null, 'only active or closed');

select set_config('request.jwt.claims', '{"sub":"a1800000-0000-4000-a000-000000000003","role":"authenticated"}', true);
select is((select count(*)::int from public.projects where id = 'a1800000-0000-4000-b000-000000000001'), 0,
  'its client no longer sees the archived project');
select is((select count(*)::int from public.tickets), 0, 'or its tickets');

select set_config('request.jwt.claims', '{"sub":"a1800000-0000-4000-a000-000000000002","role":"authenticated"}', true);
select is((select count(*)::int from public.tickets where project_id = 'a1800000-0000-4000-b000-000000000001'), 1,
  'the team still reads it');
update public.tickets set title = 'Changed' where id = 'a1800000-0000-4000-d000-000000000001';
select is((select title from public.tickets where id = 'a1800000-0000-4000-d000-000000000001'), 'Menu photos',
  'but changes nothing while it is archived (RLS skips the row)');
select throws_ok(
  $$insert into public.updates (project_id, author_id, body) values ('a1800000-0000-4000-b000-000000000001', 'a1800000-0000-4000-a000-000000000002', 'New post')$$,
  '42501', null, 'and posts no update');

select set_config('request.jwt.claims', '{"sub":"a1800000-0000-4000-a000-000000000001","role":"authenticated"}', true);
select public.portal_set_project_status('a1800000-0000-4000-b000-000000000001', 'active');
select set_config('request.jwt.claims', '{"sub":"a1800000-0000-4000-a000-000000000003","role":"authenticated"}', true);
select is((select count(*)::int from public.projects where id = 'a1800000-0000-4000-b000-000000000001'), 1,
  'restored, the client sees it again');

-- ---------------------------------------------------------------------------
-- Delete (13–22)
-- ---------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub":"a1800000-0000-4000-a000-000000000002","role":"authenticated"}', true);
select throws_ok(
  $$select * from public.portal_delete_project('a1800000-0000-4000-b000-000000000001', 'NB-9981')$$,
  '42501', null, 'a member cannot delete a project');

select set_config('request.jwt.claims', '{"sub":"a1800000-0000-4000-a000-000000000001","role":"authenticated"}', true);
select throws_ok(
  $$select * from public.portal_delete_project('a1800000-0000-4000-b000-000000000001', 'NB-9982')$$,
  '22023', 'confirm_mismatch', 'the typed Project ID must be this project''s');
select throws_ok(
  $$select * from public.portal_delete_project('a1800000-0000-4000-b000-00000000ffff', 'NB-0000')$$,
  'P0002', 'not_found', 'an unknown project is not found');
select is((select count(*)::int from public.projects where id = 'a1800000-0000-4000-b000-000000000001'), 1,
  'a refused delete deletes nothing');

create temporary table deleted on commit drop as
  select * from public.portal_delete_project('a1800000-0000-4000-b000-000000000001', ' nb-9981 ');
select results_eq(
  $$select user_id from deleted$$,
  $$values ('a1800000-0000-4000-a000-000000000003'::uuid)$$,
  'it names only the client whose only project it was');

reset role;
select is((select count(*)::int from public.projects where id = 'a1800000-0000-4000-b000-000000000001'), 0, 'the project is gone');
select is(
  (select count(*)::int from public.tickets where project_id = 'a1800000-0000-4000-b000-000000000001')
  + (select count(*)::int from public.stages where project_id = 'a1800000-0000-4000-b000-000000000001')
  + (select count(*)::int from public.updates where project_id = 'a1800000-0000-4000-b000-000000000001')
  + (select count(*)::int from public.project_team where project_id = 'a1800000-0000-4000-b000-000000000001'),
  0, 'with its tickets, stages, updates and team');
select is((select count(*)::int from public.project_clients where project_id = 'a1800000-0000-4000-b000-000000000001'), 0,
  'and its client rows');
select is((select count(*)::int from public.project_clients where email = 'both@client.example'), 1,
  'the client on another project keeps that project');
select is((select count(*)::int from public.projects where id = 'a1800000-0000-4000-b000-000000000002'), 1,
  'and other projects are untouched');

select * from finish();
rollback;
