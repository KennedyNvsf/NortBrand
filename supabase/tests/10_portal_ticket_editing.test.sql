-- Ticket editing (#137): versioned saves (a stale save is refused and changes nothing),
-- the checklist saved with its ticket, who saved last, who may save, and hidden tickets
-- never reaching the client.
begin;
create extension if not exists pgtap with schema extensions;

select plan(23);

truncate public.projects cascade;
delete from public.team_members;

insert into auth.users (instance_id, id, aud, role, email) values
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-a000-000000000001', 'authenticated', 'authenticated', 'boss@test.example'),
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-a000-000000000002', 'authenticated', 'authenticated', 'rui@test.example'),
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-a000-000000000003', 'authenticated', 'authenticated', 'away@test.example'),
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-a000-000000000004', 'authenticated', 'authenticated', 'client@client.example');

insert into public.team_members (user_id, name, email, role) values
  ('a0000000-0000-4000-a000-000000000001', 'Boss', 'boss@test.example', 'admin'),
  ('a0000000-0000-4000-a000-000000000002', 'Rui Matos', 'rui@test.example', 'member'),
  ('a0000000-0000-4000-a000-000000000003', 'Away', 'away@test.example', 'member');

insert into public.projects (id, public_id, name, client_name, starts_on, launches_on, lead_id) values
  ('a0000000-0000-4000-b000-000000000001', 'NB-9701', 'Website', 'Client', '2026-11-01', '2027-02-01', 'a0000000-0000-4000-a000-000000000001');
insert into public.project_team (project_id, user_id, role_label) values
  ('a0000000-0000-4000-b000-000000000001', 'a0000000-0000-4000-a000-000000000002', 'Development');
insert into public.project_clients (project_id, email, user_id, status) values
  ('a0000000-0000-4000-b000-000000000001', 'client@client.example', 'a0000000-0000-4000-a000-000000000004', 'active');
insert into public.stages (id, project_id, position, name, starts_on) values
  ('a0000000-0000-4000-c000-000000000001', 'a0000000-0000-4000-b000-000000000001', 1, 'Design', '2026-11-01'),
  ('a0000000-0000-4000-c000-000000000002', 'a0000000-0000-4000-b000-000000000001', 2, 'Development', '2026-12-01');

create temporary table saved (outcome text, ticket_id uuid, ticket_number integer, version timestamptz) on commit drop;
grant all on saved to authenticated;

select ok(not has_function_privilege('anon', 'public.portal_save_ticket(uuid, text, text, text, uuid, boolean, jsonb, uuid, timestamptz, uuid, date)', 'execute'), 'anon cannot save tickets');

-- ---------------------------------------------------------------------------
-- Create (2–6)
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-a000-000000000002","role":"authenticated"}', true);

select lives_ok(
  $$insert into saved select * from public.portal_save_ticket('a0000000-0000-4000-b000-000000000001', ' Home page build ', 'From the approved design.', 'in_progress', 'a0000000-0000-4000-c000-000000000002', true, '[{"label":"Layout and grid","done":true},{"label":"Hero","done":false}]', null, null, 'a0000000-0000-4000-a000-000000000002', '2026-11-20')$$,
  'a teammate on the project creates a ticket');
select is((select outcome from saved), 'saved', 'it is saved');
select is((select title from public.tickets where id = (select ticket_id from saved)), 'Home page build', 'the title is trimmed');
select is((select updated_by from public.tickets where id = (select ticket_id from saved)), 'a0000000-0000-4000-a000-000000000002'::uuid, 'who saved is recorded');
select results_eq(
  $$select label, done from public.ticket_checklist_items where ticket_id = (select ticket_id from saved) order by position$$,
  $$values ('Layout and grid', true), ('Hero', false)$$,
  'with its checklist, in order');

-- ---------------------------------------------------------------------------
-- Versioned saves (7–14)
-- ---------------------------------------------------------------------------

create temporary table stale as select ticket_id, version from saved;
grant all on stale to authenticated;

-- Someone else saves first (the admin moves the due date).
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-a000-000000000001","role":"authenticated"}', true);
select is(
  (select outcome from public.portal_save_ticket('a0000000-0000-4000-b000-000000000001', 'Home page build', 'From the approved design.', 'in_progress', 'a0000000-0000-4000-c000-000000000002', true, '[{"label":"Layout and grid","done":true},{"label":"Hero","done":false}]', (select ticket_id from stale), (select version from stale), 'a0000000-0000-4000-a000-000000000002', '2026-11-22')),
  'saved', 'the first save with the current version goes through');

-- Rui saves with the version he read: refused.
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-a000-000000000002","role":"authenticated"}', true);
select is(
  (select outcome from public.portal_save_ticket('a0000000-0000-4000-b000-000000000001', 'Home page build (v2)', '', 'in_review', 'a0000000-0000-4000-c000-000000000002', true, '[]', (select ticket_id from stale), (select version from stale), null, '2026-11-20')),
  'conflict', 'a save with a stale version is refused');
select is((select title from public.tickets where id = (select ticket_id from stale)), 'Home page build', 'and changes nothing on the ticket');
select is((select due_on from public.tickets where id = (select ticket_id from stale)), '2026-11-22'::date, 'the other person''s change stays');
select is((select count(*)::int from public.ticket_checklist_items where ticket_id = (select ticket_id from stale)), 2, 'nor on its checklist');
select is((select updated_by from public.tickets where id = (select ticket_id from stale)), 'a0000000-0000-4000-a000-000000000001'::uuid, 'and names who saved last');

-- "Keep mine": save again with the current version.
select is(
  (select outcome from public.portal_save_ticket('a0000000-0000-4000-b000-000000000001', 'Home page build (v2)', '', 'in_review', 'a0000000-0000-4000-c000-000000000002', false, '[{"label":"Story section","done":false}]', (select ticket_id from stale), (select updated_at from public.tickets where id = (select ticket_id from stale)), null, '2026-11-20')),
  'saved', 'saving again with the current version goes through');
select results_eq(
  $$select label from public.ticket_checklist_items where ticket_id = (select ticket_id from stale) order by position$$,
  $$values ('Story section')$$,
  'the checklist is replaced as sent');

-- ---------------------------------------------------------------------------
-- Who may save (15–18)
-- ---------------------------------------------------------------------------

select throws_ok(
  $$select * from public.portal_save_ticket('a0000000-0000-4000-b000-000000000001', 'X', '', 'todo', 'a0000000-0000-4000-c000-000000000001', true, '[]', null, null, 'a0000000-0000-4000-a000-000000000003', null)$$,
  '22023', null, 'the owner must work on the project');
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-a000-000000000003","role":"authenticated"}', true);
select throws_ok(
  $$select * from public.portal_save_ticket('a0000000-0000-4000-b000-000000000001', 'X', '', 'todo', 'a0000000-0000-4000-c000-000000000001', true, '[]', null, null, null, null)$$,
  '42501', null, 'a teammate not on the project cannot save');
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-a000-000000000004","role":"authenticated"}', true);
select throws_ok(
  $$select * from public.portal_save_ticket('a0000000-0000-4000-b000-000000000001', 'X', '', 'todo', 'a0000000-0000-4000-c000-000000000001', true, '[]', null, null, null, null)$$,
  '42501', null, 'a client cannot save');
select is(
  (select count(*)::int from public.tickets where id = (select ticket_id from stale)),
  0, 'a ticket hidden from the client never reaches them');

-- ---------------------------------------------------------------------------
-- Visibility follows the toggle (19–23)
-- ---------------------------------------------------------------------------

reset role;
insert into public.tickets (id, project_id, stage_id, title, client_visible) values
  ('a0000000-0000-4000-d000-000000000001', 'a0000000-0000-4000-b000-000000000001', 'a0000000-0000-4000-c000-000000000001', 'Visible', true);
insert into public.ticket_checklist_items (project_id, ticket_id, position, label) values
  ('a0000000-0000-4000-b000-000000000001', 'a0000000-0000-4000-d000-000000000001', 0, 'Visible item');
insert into public.ticket_checklist_items (project_id, ticket_id, position, label) values
  ('a0000000-0000-4000-b000-000000000001', (select ticket_id from stale), 0, 'Hidden item');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-a000-000000000004","role":"authenticated"}', true);
select is((select count(*)::int from public.tickets), 1, 'the client sees only the visible ticket');
select is((select count(*)::int from public.ticket_checklist_items where label = 'Hidden item'), 0, 'and none of a hidden ticket''s checklist');
select is((select count(*)::int from public.ticket_checklist_items where label = 'Visible item'), 1, 'but a visible ticket''s checklist');

select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-a000-000000000002","role":"authenticated"}', true);
select is(
  (select outcome from public.portal_save_ticket('a0000000-0000-4000-b000-000000000001', 'Visible', '', 'todo', 'a0000000-0000-4000-c000-000000000001', false, '[]', 'a0000000-0000-4000-d000-000000000001', (select updated_at from public.tickets where id = 'a0000000-0000-4000-d000-000000000001'), null, null)),
  'saved', 'the team hides a ticket');
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-a000-000000000004","role":"authenticated"}', true);
select is((select count(*)::int from public.tickets), 0, 'and it disappears for the client at once');
reset role;

select * from finish();
rollback;
