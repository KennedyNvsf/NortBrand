-- Client access (#141): adding and removing people (never the last one who can sign
-- in), rotating the Project ID (every client session for that project ends, other
-- projects untouched), clearing a lockout, and who may do each.
begin;
create extension if not exists pgtap with schema extensions;

select plan(22);

truncate public.projects cascade;
delete from public.team_members;

insert into auth.users (instance_id, id, aud, role, email) values
  ('00000000-0000-0000-0000-000000000000', 'f0000000-0000-4000-a000-000000000001', 'authenticated', 'authenticated', 'ana@test.example'),
  ('00000000-0000-0000-0000-000000000000', 'f0000000-0000-4000-a000-000000000002', 'authenticated', 'authenticated', 'tiago@test.example'),
  ('00000000-0000-0000-0000-000000000000', 'f0000000-0000-4000-a000-000000000003', 'authenticated', 'authenticated', 'joao@client.example'),
  ('00000000-0000-0000-0000-000000000000', 'f0000000-0000-4000-a000-000000000004', 'authenticated', 'authenticated', 'leonor@client.example'),
  ('00000000-0000-0000-0000-000000000000', 'f0000000-0000-4000-a000-000000000005', 'authenticated', 'authenticated', 'outsider@test.example');

insert into public.team_members (user_id, name, email, role) values
  ('f0000000-0000-4000-a000-000000000001', 'Ana Costa', 'ana@test.example', 'admin'),
  ('f0000000-0000-4000-a000-000000000002', 'Tiago Sousa', 'tiago@test.example', 'member'),
  ('f0000000-0000-4000-a000-000000000005', 'Outsider', 'outsider@test.example', 'member');

insert into public.projects (id, public_id, name, client_name, starts_on, launches_on, lead_id) values
  ('f0000000-0000-4000-b000-000000000001', 'NB-9921', 'Café website', 'Café', '2026-10-01', '2027-02-12', 'f0000000-0000-4000-a000-000000000001'),
  ('f0000000-0000-4000-b000-000000000002', 'NB-9922', 'Café shop', 'Café', '2026-10-01', '2027-02-12', 'f0000000-0000-4000-a000-000000000001');
insert into public.project_team (project_id, user_id, role_label) values
  ('f0000000-0000-4000-b000-000000000001', 'f0000000-0000-4000-a000-000000000002', 'Design');
insert into public.project_clients (id, project_id, email, user_id, status) values
  ('f0000000-0000-4000-c000-000000000001', 'f0000000-0000-4000-b000-000000000001', 'joao@client.example', 'f0000000-0000-4000-a000-000000000003', 'active'),
  ('f0000000-0000-4000-c000-000000000002', 'f0000000-0000-4000-b000-000000000002', 'joao@client.example', 'f0000000-0000-4000-a000-000000000003', 'active');

-- João's session from an hour ago; a fresh one is added after the rotation.
insert into auth.sessions (id, user_id, created_at, updated_at) values
  ('f0000000-0000-4000-d000-000000000001', 'f0000000-0000-4000-a000-000000000003', now() - interval '1 hour', now() - interval '1 hour');

-- A paused sign-in for Leonor (added below), as the sign-in functions record it.
insert into private.portal_sign_in_attempts (project_id, email, outcome, attempted_at) values
  ('f0000000-0000-4000-b000-000000000001', 'leonor@client.example', 'locked', now() - interval '2 minutes');

set local role authenticated;

-- ---------------------------------------------------------------------------
-- Who may manage access (1–4)
-- ---------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub":"f0000000-0000-4000-a000-000000000002","role":"authenticated"}', true);
select throws_ok(
  $$select public.portal_add_client('f0000000-0000-4000-b000-000000000001', 'leonor@client.example', null, 'pt', 'f0000000-0000-4000-a000-000000000004')$$,
  '42501', null, 'a member can''t add people');
select throws_ok(
  $$select * from public.portal_rotate_project_id('f0000000-0000-4000-b000-000000000001')$$,
  '42501', null, 'nor rotate the Project ID');
select is(
  (select count(*)::int from public.portal_client_lockouts('f0000000-0000-4000-b000-000000000001')),
  1, 'but the project''s team sees who is paused');

select set_config('request.jwt.claims', '{"sub":"f0000000-0000-4000-a000-000000000005","role":"authenticated"}', true);
select throws_ok(
  $$select * from public.portal_client_lockouts('f0000000-0000-4000-b000-000000000001')$$,
  'P0002', null, 'a teammate on other projects does not');

-- ---------------------------------------------------------------------------
-- Add and remove (5–12)
-- ---------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub":"f0000000-0000-4000-a000-000000000001","role":"authenticated"}', true);
select lives_ok(
  $$select public.portal_add_client('f0000000-0000-4000-b000-000000000001', ' Leonor@Client.example ', ' Leonor Faria ', 'pt', 'f0000000-0000-4000-a000-000000000004')$$,
  'an admin adds a person');
select results_eq(
  $$select name, status from public.project_clients where email = 'leonor@client.example'$$,
  $$values ('Leonor Faria', 'invited')$$,
  'invited, with a trimmed name and lowercase email');
select throws_ok(
  $$select public.portal_add_client('f0000000-0000-4000-b000-000000000001', 'leonor@client.example', null, 'pt', 'f0000000-0000-4000-a000-000000000004')$$,
  'PT409', 'already_added', 'the same person can''t be added twice');
select throws_ok(
  $$select public.portal_add_client('f0000000-0000-4000-b000-000000000001', 'joao@client.example', null, 'pt', 'f0000000-0000-4000-a000-000000000004')$$,
  '22023', null, 'the auth user must match the email');

select lives_ok(
  $$select public.portal_remove_client('f0000000-0000-4000-b000-000000000001', (select id from public.project_clients where email = 'leonor@client.example'))$$,
  'removing one of two people works');
select throws_ok(
  $$select public.portal_remove_client('f0000000-0000-4000-b000-000000000001', 'f0000000-0000-4000-c000-000000000001')$$,
  'PT409', 'last_person', 'the last person who can sign in can''t be removed');
select throws_ok(
  $$update public.project_clients set status = 'removed', removed_at = now() where id = 'f0000000-0000-4000-c000-000000000001'$$,
  'PT409', 'last_person', 'not even by a direct update');
select lives_ok(
  $$select public.portal_add_client('f0000000-0000-4000-b000-000000000001', 'leonor@client.example', null, 'en', 'f0000000-0000-4000-a000-000000000004')$$,
  'a removed person can be added back');

-- ---------------------------------------------------------------------------
-- Lockouts (13–15)
-- ---------------------------------------------------------------------------

select is(
  public.portal_clear_lockout('f0000000-0000-4000-b000-000000000001', 'leonor@client.example'),
  true, 'an admin clears a lockout');
select is(
  (select count(*)::int from public.portal_client_lockouts('f0000000-0000-4000-b000-000000000001')),
  0, 'and nobody is paused any more');
select is(
  public.portal_clear_lockout('f0000000-0000-4000-b000-000000000001', 'leonor@client.example'),
  false, 'clearing again finds nothing');

-- ---------------------------------------------------------------------------
-- Rotation ends every client session for the project (16–22)
-- ---------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub":"f0000000-0000-4000-a000-000000000003","role":"authenticated","session_id":"f0000000-0000-4000-d000-000000000001"}', true);
select is(
  (select count(*)::int from public.projects), 2, 'before: João reads both his projects');

select set_config('request.jwt.claims', '{"sub":"f0000000-0000-4000-a000-000000000001","role":"authenticated"}', true);
select results_eq(
  $$select count(*)::int, bool_and(public_id <> 'NB-9921') from public.portal_rotate_project_id('f0000000-0000-4000-b000-000000000001')$$,
  $$values (2, true)$$,
  'an admin rotates: a new ID, and both people to email it to');
select results_eq(
  $$select array_agg(kind order by kind) from public.access_events where project_id = 'f0000000-0000-4000-b000-000000000001'$$,
  $$values (array['client_removed', 'lockout_cleared', 'project_id_rotated'])$$,
  'removal, cleared lockout and rotation are all in the activity log');

select set_config('request.jwt.claims', '{"sub":"f0000000-0000-4000-a000-000000000003","role":"authenticated","session_id":"f0000000-0000-4000-d000-000000000001"}', true);
select is(
  (select count(*)::int from public.projects where id = 'f0000000-0000-4000-b000-000000000001'),
  0, 'after: João''s old session no longer reads the project');
select is(
  (select count(*)::int from public.projects where id = 'f0000000-0000-4000-b000-000000000002'),
  1, 'his other project is not affected');

select set_config('request.jwt.claims', '{"sub":"f0000000-0000-4000-a000-000000000003","role":"authenticated"}', true);
select is(
  (select count(*)::int from public.projects where id = 'f0000000-0000-4000-b000-000000000001'),
  0, 'a token without a session id is refused too');

reset role;
insert into auth.sessions (id, user_id, created_at, updated_at) values
  ('f0000000-0000-4000-d000-000000000002', 'f0000000-0000-4000-a000-000000000003', clock_timestamp(), clock_timestamp());
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"f0000000-0000-4000-a000-000000000003","role":"authenticated","session_id":"f0000000-0000-4000-d000-000000000002"}', true);
select is(
  (select count(*)::int from public.projects where id = 'f0000000-0000-4000-b000-000000000001'),
  1, 'signing in again (a new session) restores access');

select * from finish();
rollback;
