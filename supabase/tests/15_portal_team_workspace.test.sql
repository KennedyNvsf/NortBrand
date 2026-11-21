-- Team workspace (#142): search finds only what the caller can read (never another
-- team's project or a client's view of team-only work), the Team overview is team-only,
-- and roles change only by an admin and never demote the last admin.
begin;
create extension if not exists pgtap with schema extensions;

select plan(14);

truncate public.projects cascade;
delete from public.team_members;

insert into auth.users (instance_id, id, aud, role, email, last_sign_in_at) values
  ('00000000-0000-0000-0000-000000000000', 'a1000000-0000-4000-a000-000000000001', 'authenticated', 'authenticated', 'ana@test.example', now() - interval '5 minutes'),
  ('00000000-0000-0000-0000-000000000000', 'a1000000-0000-4000-a000-000000000002', 'authenticated', 'authenticated', 'tiago@test.example', now() - interval '1 hour'),
  ('00000000-0000-0000-0000-000000000000', 'a1000000-0000-4000-a000-000000000003', 'authenticated', 'authenticated', 'rui@test.example', null),
  ('00000000-0000-0000-0000-000000000000', 'a1000000-0000-4000-a000-000000000004', 'authenticated', 'authenticated', 'joao@client.example', null);

insert into public.team_members (user_id, name, email, role) values
  ('a1000000-0000-4000-a000-000000000001', 'Ana Costa', 'ana@test.example', 'admin'),
  ('a1000000-0000-4000-a000-000000000002', 'Tiago Sousa', 'tiago@test.example', 'member'),
  ('a1000000-0000-4000-a000-000000000003', 'Rui Matos', 'rui@test.example', 'member');

insert into public.projects (id, public_id, name, client_name, starts_on, launches_on, lead_id) values
  ('a1000000-0000-4000-b000-000000000001', 'NB-9931', 'Atlântico Café website', 'Atlântico Café', '2026-10-01', '2027-02-12', 'a1000000-0000-4000-a000-000000000001'),
  ('a1000000-0000-4000-b000-000000000002', 'NB-9932', 'Casa Moura shop', 'Casa Moura', '2026-10-01', '2027-02-12', 'a1000000-0000-4000-a000-000000000001');
insert into public.project_team (project_id, user_id, role_label) values
  ('a1000000-0000-4000-b000-000000000001', 'a1000000-0000-4000-a000-000000000002', 'Design'),
  ('a1000000-0000-4000-b000-000000000002', 'a1000000-0000-4000-a000-000000000003', 'Development');
insert into public.stages (id, project_id, position, name, starts_on) values
  ('a1000000-0000-4000-c000-000000000001', 'a1000000-0000-4000-b000-000000000001', 1, 'Design', '2026-10-01'),
  ('a1000000-0000-4000-c000-000000000002', 'a1000000-0000-4000-b000-000000000002', 1, 'Build', '2026-10-01');
insert into public.tickets (project_id, stage_id, title, owner_id, status, client_visible) values
  ('a1000000-0000-4000-b000-000000000001', 'a1000000-0000-4000-c000-000000000001', 'Menu photos for the menu page', 'a1000000-0000-4000-a000-000000000002', 'blocked', true),
  ('a1000000-0000-4000-b000-000000000001', 'a1000000-0000-4000-c000-000000000001', 'Internal menu estimate', 'a1000000-0000-4000-a000-000000000002', 'todo', false),
  ('a1000000-0000-4000-b000-000000000001', 'a1000000-0000-4000-c000-000000000001', 'Old menu draft', 'a1000000-0000-4000-a000-000000000002', 'done', true),
  ('a1000000-0000-4000-b000-000000000002', 'a1000000-0000-4000-c000-000000000002', 'Menu of products', 'a1000000-0000-4000-a000-000000000003', 'todo', true);
insert into public.project_clients (project_id, email, user_id, status) values
  ('a1000000-0000-4000-b000-000000000001', 'joao@client.example', 'a1000000-0000-4000-a000-000000000004', 'active');

set local role authenticated;

-- ---------------------------------------------------------------------------
-- Search (1–6)
-- ---------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub":"a1000000-0000-4000-a000-000000000002","role":"authenticated"}', true);
select results_eq(
  $$select kind, project_public_id from public.portal_search('menu') order by kind, title$$,
  $$values ('ticket', 'NB-9931'), ('ticket', 'NB-9931'), ('ticket', 'NB-9931')$$,
  'a member finds tickets on their own project only, team-only ones included');
select is(
  (select count(*)::int from public.portal_search('Casa')), 0,
  'and never another team''s project, by name');
select is(
  (select count(*)::int from public.portal_search('NB-9932')), 0,
  'or by Project ID');
select results_eq(
  $$select kind, project_name from public.portal_search('nb-9931') where kind = 'project'$$,
  $$values ('project', 'Atlântico Café website')$$,
  'Project IDs match whatever the case');
select is(
  (select count(*)::int from public.portal_search('%')), 0,
  'a typed % is a literal, not a wildcard (and one character is too short anyway)');

select set_config('request.jwt.claims', '{"sub":"a1000000-0000-4000-a000-000000000004","role":"authenticated"}', true);
select is(
  (select count(*)::int from public.portal_search('menu')), 0,
  'a client gets nothing from the team search');

-- ---------------------------------------------------------------------------
-- Team overview (7–9)
-- ---------------------------------------------------------------------------

select throws_ok(
  $$select * from public.portal_team_overview()$$,
  '42501', null, 'clients can''t read the team overview');

select set_config('request.jwt.claims', '{"sub":"a1000000-0000-4000-a000-000000000003","role":"authenticated"}', true);
select results_eq(
  $$select name, role, project_names, open_tickets from public.portal_team_overview()$$,
  $$values
    ('Ana Costa', 'admin', array['Atlântico Café website', 'Casa Moura shop'], 0),
    ('Rui Matos', 'member', array['Casa Moura shop'], 1),
    ('Tiago Sousa', 'member', array['Atlântico Café website'], 2)$$,
  'any teammate reads the table: admins first, projects, open tickets (done ones excluded)');
select is(
  (select last_active_at is not null from public.portal_team_overview() where name = 'Tiago Sousa'),
  true, 'last active is the last sign-in');

-- ---------------------------------------------------------------------------
-- Roles (10–14)
-- ---------------------------------------------------------------------------

select throws_ok(
  $$select public.portal_set_team_role('a1000000-0000-4000-a000-000000000002', 'admin')$$,
  '42501', null, 'a member can''t change roles');

select set_config('request.jwt.claims', '{"sub":"a1000000-0000-4000-a000-000000000001","role":"authenticated"}', true);
select throws_ok(
  $$select public.portal_set_team_role('a1000000-0000-4000-a000-000000000001', 'member')$$,
  'PT409', 'last_admin', 'the last admin can''t be demoted, not even by themselves');
select lives_ok(
  $$select public.portal_set_team_role('a1000000-0000-4000-a000-000000000002', 'admin')$$,
  'an admin promotes a member');
select lives_ok(
  $$select public.portal_set_team_role('a1000000-0000-4000-a000-000000000001', 'member')$$,
  'with another admin, an admin can step down');
select throws_ok(
  $$select public.portal_set_team_role('a1000000-0000-4000-a000-000000000003', 'owner')$$,
  '42501', null, 'and once a member, they can''t change roles any more');

select * from finish();
rollback;
