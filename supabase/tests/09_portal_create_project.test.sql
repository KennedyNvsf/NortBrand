-- New project with client invite (#136): one transaction, admins only, client accounts
-- checked against their emails, teammates refused as clients, Project ID collisions.
begin;
create extension if not exists pgtap with schema extensions;

select plan(24);

truncate public.projects cascade;
delete from public.team_members;

insert into auth.users (instance_id, id, aud, role, email) values
  ('00000000-0000-0000-0000-000000000000', '90000000-0000-4000-a000-000000000001', 'authenticated', 'authenticated', 'boss@test.example'),
  ('00000000-0000-0000-0000-000000000000', '90000000-0000-4000-a000-000000000002', 'authenticated', 'authenticated', 'worker@test.example'),
  ('00000000-0000-0000-0000-000000000000', '90000000-0000-4000-a000-000000000003', 'authenticated', 'authenticated', 'ines@client.example'),
  ('00000000-0000-0000-0000-000000000000', '90000000-0000-4000-a000-000000000004', 'authenticated', 'authenticated', 'pedro@client.example');

insert into public.team_members (user_id, name, email, role) values
  ('90000000-0000-4000-a000-000000000001', 'Boss', 'boss@test.example', 'admin'),
  ('90000000-0000-4000-a000-000000000002', 'Worker', 'worker@test.example', 'member');

insert into public.projects (public_id, name, client_name, starts_on, launches_on, lead_id) values
  ('NB-9900', 'Existing', 'Client', '2026-11-01', '2027-01-31', '90000000-0000-4000-a000-000000000001');

create temporary table created (project_id uuid, public_id text) on commit drop;
grant all on created to authenticated;

-- ---------------------------------------------------------------------------
-- Grants (1–4)
-- ---------------------------------------------------------------------------

select ok(not has_function_privilege('anon', 'public.portal_create_project(text, text, uuid, date, date, text, jsonb, jsonb)', 'execute'), 'anon cannot create projects');
select ok(not has_function_privilege('anon', 'public.portal_find_client_users(text[])', 'execute'), 'anon cannot look up accounts');
select ok(not has_function_privilege('anon', 'public.portal_next_project_id()', 'execute'), 'anon cannot preview Project IDs');
select ok(not has_function_privilege('anon', 'public.portal_log_invite_sent(uuid, text)', 'execute'), 'anon cannot log invites');

-- ---------------------------------------------------------------------------
-- Members are refused (5–7)
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"90000000-0000-4000-a000-000000000002","role":"authenticated"}', true);
select throws_ok($$select public.portal_next_project_id()$$, '42501', null, 'a member cannot preview a Project ID');
select throws_ok($$select * from public.portal_find_client_users(array['ines@client.example'])$$, '42501', null, 'a member cannot look up accounts');
select throws_ok(
  $$select * from public.portal_create_project('P', 'C', '90000000-0000-4000-a000-000000000002', '2026-11-17', '2027-04-14', null,
    '[{"name":"Discovery","starts_on":"2026-11-17","ends_on":"2026-11-28"}]',
    '[{"email":"ines@client.example","locale":"pt","user_id":"90000000-0000-4000-a000-000000000003"}]')$$,
  '42501', null, 'a member cannot create a project');

-- ---------------------------------------------------------------------------
-- Admin helpers (8–10)
-- ---------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub":"90000000-0000-4000-a000-000000000001","role":"authenticated"}', true);
select matches(public.portal_next_project_id(), '^NB-[0-9]{4}$', 'an admin previews a Project ID');
select results_eq(
  $$select email, user_id, is_teammate from public.portal_find_client_users(array['Ines@Client.example ', 'new@client.example', 'worker@test.example']) order by email$$,
  $$values ('ines@client.example', '90000000-0000-4000-a000-000000000003'::uuid, false),
           ('new@client.example', null::uuid, false),
           ('worker@test.example', '90000000-0000-4000-a000-000000000002'::uuid, true)$$,
  'accounts are found by normalised email; teammates are flagged');
select throws_ok($$select * from public.portal_find_client_users(array[]::text[])$$, '22023', null, 'an empty lookup is refused');

-- ---------------------------------------------------------------------------
-- Create (11–19)
-- ---------------------------------------------------------------------------

select lives_ok(
  $$insert into created select * from public.portal_create_project(' Tasca do Largo · Website ', 'Tasca do Largo', '90000000-0000-4000-a000-000000000002',
    '2026-11-17', '2027-04-14', 'NB-4826',
    '[{"name":"Discovery","starts_on":"2026-11-17","ends_on":"2026-11-28"},
      {"name":"Design","starts_on":"2026-12-01","ends_on":"2026-12-19"},
      {"name":"Launch","starts_on":"2027-04-14","ends_on":"2027-04-14"},
      {"name":"Care","starts_on":"2027-04-14","ends_on":null}]',
    '[{"email":"ines@client.example","locale":"pt","user_id":"90000000-0000-4000-a000-000000000003"},
      {"email":"Pedro@Client.example","locale":"en","user_id":"90000000-0000-4000-a000-000000000004"}]')$$,
  'an admin creates a project');
select is((select public_id from created), 'NB-4826', 'with the suggested Project ID');
select is((select name from public.projects where id = (select project_id from created)), 'Tasca do Largo · Website', 'the name is trimmed');
select is((select count(*)::int from public.stages where project_id = (select project_id from created)), 4, 'its stages are created');
select results_eq(
  $$select position::int, name from public.stages where project_id = (select project_id from created) order by position$$,
  $$values (1, 'Discovery'), (2, 'Design'), (3, 'Launch'), (4, 'Care')$$,
  'in order');
select results_eq(
  $$select email, locale, status from public.project_clients where project_id = (select project_id from created) order by email$$,
  $$values ('ines@client.example', 'pt', 'invited'), ('pedro@client.example', 'en', 'invited')$$,
  'the clients are invited, each with their language');
select is(
  (select role_label from public.project_team where project_id = (select project_id from created) and user_id = '90000000-0000-4000-a000-000000000002'),
  'Project lead', 'the lead is on the project team');
select isnt(
  (select public_id from public.portal_create_project('Another', 'C', '90000000-0000-4000-a000-000000000001', '2026-11-17', '2027-04-14', 'NB-9900',
    '[{"name":"Discovery","starts_on":"2026-11-17","ends_on":null}]',
    '[{"email":"ines@client.example","locale":"pt","user_id":"90000000-0000-4000-a000-000000000003"}]')),
  'NB-9900', 'a taken Project ID is replaced by a fresh one');
select lives_ok($$select public.portal_log_invite_sent((select project_id from created), 'ines@client.example')$$, 'an admin logs a sent invite');

-- ---------------------------------------------------------------------------
-- Refusals leave nothing behind (20–24)
-- ---------------------------------------------------------------------------

select throws_ok(
  $$select * from public.portal_create_project('Forged', 'C', '90000000-0000-4000-a000-000000000001', '2026-11-17', '2027-04-14', null,
    '[{"name":"Discovery","starts_on":"2026-11-17","ends_on":null}]',
    '[{"email":"attacker@client.example","locale":"pt","user_id":"90000000-0000-4000-a000-000000000003"}]')$$,
  '22023', null, 'another person''s account cannot be attached to an email');
select throws_ok(
  $$select * from public.portal_create_project('Teammate', 'C', '90000000-0000-4000-a000-000000000001', '2026-11-17', '2027-04-14', null,
    '[{"name":"Discovery","starts_on":"2026-11-17","ends_on":null}]',
    '[{"email":"worker@test.example","locale":"pt","user_id":"90000000-0000-4000-a000-000000000002"}]')$$,
  'PT409', null, 'a teammate cannot be invited as a client');
select throws_ok(
  $$select * from public.portal_create_project('Bad dates', 'C', '90000000-0000-4000-a000-000000000001', '2026-11-17', '2027-04-14', null,
    '[{"name":"Discovery","starts_on":"2026-11-01","ends_on":null}]',
    '[{"email":"ines@client.example","locale":"pt","user_id":"90000000-0000-4000-a000-000000000003"}]')$$,
  '22023', null, 'a stage before the project start is refused');
select throws_ok(
  $$select * from public.portal_create_project('No lead', 'C', '90000000-0000-4000-a000-000000000003', '2026-11-17', '2027-04-14', null,
    '[{"name":"Discovery","starts_on":"2026-11-17","ends_on":null}]',
    '[{"email":"ines@client.example","locale":"pt","user_id":"90000000-0000-4000-a000-000000000003"}]')$$,
  'P0002', null, 'the lead must be an active teammate');
select is(
  (select count(*)::int from public.projects where name in ('Forged', 'Teammate', 'Bad dates', 'No lead')),
  0, 'refused calls create no project');
reset role;

select * from finish();
rollback;
