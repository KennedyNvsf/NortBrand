-- View as client (#160): portal_client_preview returns, for a teammate on the project,
-- exactly what a client of that project reads through RLS, and nothing team-only.
-- Each set is checked twice against the same expected rows: once from the preview (as a
-- teammate) and once from the tables under a client's session (the client policies).
begin;
create extension if not exists pgtap with schema extensions;

select plan(22);

truncate public.projects cascade;
delete from public.team_members;

insert into auth.users (instance_id, id, aud, role, email) values
  ('00000000-0000-0000-0000-000000000000', 'a1700000-0000-4000-a000-000000000001', 'authenticated', 'authenticated', 'ana@test.example'),
  ('00000000-0000-0000-0000-000000000000', 'a1700000-0000-4000-a000-000000000002', 'authenticated', 'authenticated', 'tiago@test.example'),
  ('00000000-0000-0000-0000-000000000000', 'a1700000-0000-4000-a000-000000000003', 'authenticated', 'authenticated', 'rui@test.example'),
  ('00000000-0000-0000-0000-000000000000', 'a1700000-0000-4000-a000-000000000004', 'authenticated', 'authenticated', 'joao@client.example');

insert into public.team_members (user_id, name, email, role) values
  ('a1700000-0000-4000-a000-000000000001', 'Ana Costa', 'ana@test.example', 'admin'),
  ('a1700000-0000-4000-a000-000000000002', 'Tiago Sousa', 'tiago@test.example', 'member'),
  ('a1700000-0000-4000-a000-000000000003', 'Rui Matos', 'rui@test.example', 'member');

insert into public.projects (id, public_id, name, client_name, starts_on, launches_on, lead_id) values
  ('a1700000-0000-4000-b000-000000000001', 'NB-9971', 'Atlântico Café website', 'Atlântico Café', '2026-10-01', '2027-02-12', 'a1700000-0000-4000-a000-000000000002'),
  ('a1700000-0000-4000-b000-000000000002', 'NB-9972', 'Casa Moura shop', 'Casa Moura', '2026-10-01', '2027-02-12', 'a1700000-0000-4000-a000-000000000001');
insert into public.project_team (project_id, user_id, role_label, position) values
  ('a1700000-0000-4000-b000-000000000001', 'a1700000-0000-4000-a000-000000000002', 'Project lead', 1),
  ('a1700000-0000-4000-b000-000000000002', 'a1700000-0000-4000-a000-000000000003', 'Development', 1);
insert into public.stages (id, project_id, position, name, starts_on) values
  ('a1700000-0000-4000-c000-000000000001', 'a1700000-0000-4000-b000-000000000001', 1, 'Design', '2026-10-01'),
  ('a1700000-0000-4000-c000-000000000002', 'a1700000-0000-4000-b000-000000000001', 2, 'Build', '2026-11-01');
insert into public.tickets (id, project_id, stage_id, title, owner_id, status, client_visible) values
  ('a1700000-0000-4000-d000-000000000001', 'a1700000-0000-4000-b000-000000000001', 'a1700000-0000-4000-c000-000000000001', 'Menu photos', 'a1700000-0000-4000-a000-000000000002', 'blocked', true),
  ('a1700000-0000-4000-d000-000000000002', 'a1700000-0000-4000-b000-000000000001', 'a1700000-0000-4000-c000-000000000002', 'Home page build', 'a1700000-0000-4000-a000-000000000002', 'in_progress', true),
  ('a1700000-0000-4000-d000-000000000003', 'a1700000-0000-4000-b000-000000000001', 'a1700000-0000-4000-c000-000000000002', 'Internal estimate', 'a1700000-0000-4000-a000-000000000002', 'todo', false);
insert into public.ticket_checklist_items (id, project_id, ticket_id, position, label, done) values
  ('a1700000-0000-4000-e000-000000000001', 'a1700000-0000-4000-b000-000000000001', 'a1700000-0000-4000-d000-000000000001', 1, 'Send the photos', false),
  ('a1700000-0000-4000-e000-000000000002', 'a1700000-0000-4000-b000-000000000001', 'a1700000-0000-4000-d000-000000000003', 1, 'Internal margin check', false);
insert into public.updates (id, project_id, author_id, body, created_at, deleted_at) values
  ('a1700000-0000-4000-f000-000000000001', 'a1700000-0000-4000-b000-000000000001', 'a1700000-0000-4000-a000-000000000002', 'Design is done.', now() - interval '2 days', null),
  ('a1700000-0000-4000-f000-000000000002', 'a1700000-0000-4000-b000-000000000001', 'a1700000-0000-4000-a000-000000000002', 'Build has started.', now() - interval '1 day', null),
  ('a1700000-0000-4000-f000-000000000003', 'a1700000-0000-4000-b000-000000000001', 'a1700000-0000-4000-a000-000000000002', 'A post we took back.', now(), now());
insert into public.update_tickets (project_id, update_id, ticket_id) values
  ('a1700000-0000-4000-b000-000000000001', 'a1700000-0000-4000-f000-000000000002', 'a1700000-0000-4000-d000-000000000002'),
  ('a1700000-0000-4000-b000-000000000001', 'a1700000-0000-4000-f000-000000000002', 'a1700000-0000-4000-d000-000000000003');
insert into public.project_files (id, project_id, name, size_bytes, content_type, storage_path, uploaded_by, shared) values
  ('a1700000-0000-4000-9000-000000000001', 'a1700000-0000-4000-b000-000000000001', 'Brand guide.pdf', 1000, 'application/pdf', 'projects/a1700000-0000-4000-b000-000000000001/a1700000-0000-4000-9000-000000000001', 'a1700000-0000-4000-a000-000000000002', true),
  ('a1700000-0000-4000-9000-000000000002', 'a1700000-0000-4000-b000-000000000001', 'Internal quote.pdf', 1000, 'application/pdf', 'projects/a1700000-0000-4000-b000-000000000001/a1700000-0000-4000-9000-000000000002', 'a1700000-0000-4000-a000-000000000002', false);
insert into public.project_milestones (project_id, title, due_on) values
  ('a1700000-0000-4000-b000-000000000001', 'Design sign-off', '2026-11-01');
insert into public.project_clients (project_id, email, user_id, status, locale) values
  ('a1700000-0000-4000-b000-000000000001', 'joao@client.example', 'a1700000-0000-4000-a000-000000000004', 'active', 'pt');

select ok(not has_function_privilege('anon', 'public.portal_client_preview(text)', 'execute'),
  'the public key cannot preview');

set local role authenticated;

-- ---------------------------------------------------------------------------
-- Who gets a preview (2–5)
-- ---------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub":"a1700000-0000-4000-a000-000000000004","role":"authenticated"}', true);
select is(public.portal_client_preview('NB-9971'), null, 'a client gets no preview (it is the team''s tool)');
select set_config('request.jwt.claims', '{"sub":"a1700000-0000-4000-a000-000000000003","role":"authenticated"}', true);
select is(public.portal_client_preview('NB-9971'), null, 'a member not on the project gets nothing');
select set_config('request.jwt.claims', '{"sub":"a1700000-0000-4000-a000-000000000001","role":"authenticated"}', true);
select isnt(public.portal_client_preview('nb-9971'), null, 'an admin previews any project, whatever the case of the ID');
select set_config('request.jwt.claims', '{"sub":"a1700000-0000-4000-a000-000000000002","role":"authenticated"}', true);
select is(public.portal_client_preview('NB-0000'), null, 'an unknown Project ID gives nothing');

-- ---------------------------------------------------------------------------
-- The preview (as the project's lead) (6–15)
-- ---------------------------------------------------------------------------

create temporary table preview on commit drop as
  select public.portal_client_preview('NB-9971') as data;

select results_eq(
  $$select (value ->> 'id')::uuid from preview, jsonb_array_elements(data -> 'tickets') order by 1$$,
  $$values ('a1700000-0000-4000-d000-000000000001'::uuid), ('a1700000-0000-4000-d000-000000000002'::uuid)$$,
  'the preview has the client-visible tickets only');
select results_eq(
  $$select (value ->> 'id')::uuid from preview, jsonb_array_elements(data -> 'checklist_items')$$,
  $$values ('a1700000-0000-4000-e000-000000000001'::uuid)$$,
  'and the checklists of those tickets only');
select results_eq(
  $$select (value ->> 'id')::uuid from preview, jsonb_array_elements(data -> 'updates')$$,
  $$values ('a1700000-0000-4000-f000-000000000002'::uuid), ('a1700000-0000-4000-f000-000000000001'::uuid)$$,
  'live updates only, newest first');
select results_eq(
  $$select (t.value #>> '{}')::uuid from preview, jsonb_array_elements(data -> 'updates') u, jsonb_array_elements(u.value -> 'ticket_ids') t$$,
  $$values ('a1700000-0000-4000-d000-000000000002'::uuid)$$,
  'an update links only to client-visible tickets');
select results_eq(
  $$select (value ->> 'id')::uuid from preview, jsonb_array_elements(data -> 'files')$$,
  $$values ('a1700000-0000-4000-9000-000000000001'::uuid)$$,
  'shared files only');
select is((select (data ->> 'file_count')::int from preview), 1, 'the files count matches');
select is((select jsonb_array_length(data -> 'stages') from preview), 2, 'every stage');
select is((select jsonb_array_length(data -> 'milestones') from preview), 1, 'every milestone');
select results_eq(
  $$select value ->> 'name' from preview, jsonb_array_elements(data -> 'team')$$,
  $$values ('Tiago Sousa')$$,
  'the team the client sees: the project''s team');
select ok(
  (select position('Internal' in data::text) = 0 and position('took back' in data::text) = 0 from preview),
  'no team-only ticket, checklist, file or deleted post appears anywhere');

-- ---------------------------------------------------------------------------
-- What a client of the project reads through RLS (16–21): the same rows
-- ---------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub":"a1700000-0000-4000-a000-000000000004","role":"authenticated"}', true);
select results_eq(
  $$select id from public.tickets where project_id = 'a1700000-0000-4000-b000-000000000001' order by 1$$,
  $$values ('a1700000-0000-4000-d000-000000000001'::uuid), ('a1700000-0000-4000-d000-000000000002'::uuid)$$,
  'a client reads the same tickets');
select results_eq(
  $$select id from public.ticket_checklist_items where project_id = 'a1700000-0000-4000-b000-000000000001'$$,
  $$values ('a1700000-0000-4000-e000-000000000001'::uuid)$$,
  'the same checklist items');
select results_eq(
  $$select id from public.updates where project_id = 'a1700000-0000-4000-b000-000000000001' order by created_at desc$$,
  $$values ('a1700000-0000-4000-f000-000000000002'::uuid), ('a1700000-0000-4000-f000-000000000001'::uuid)$$,
  'the same updates');
select results_eq(
  $$select ticket_id from public.update_tickets where project_id = 'a1700000-0000-4000-b000-000000000001'$$,
  $$values ('a1700000-0000-4000-d000-000000000002'::uuid)$$,
  'the same update links');
select results_eq(
  $$select id from public.project_files where project_id = 'a1700000-0000-4000-b000-000000000001'$$,
  $$values ('a1700000-0000-4000-9000-000000000001'::uuid)$$,
  'the same files');
select results_eq(
  $$select name from public.team_members$$,
  $$values ('Tiago Sousa')$$,
  'the same teammates');

select is((select data ->> 'client_locale' from preview), 'pt', 'the preview opens in the clients'' language');

select * from finish();
rollback;
