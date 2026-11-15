-- Stage management (#138): completing a stage is one transaction (stage, next stage,
-- open tickets and the milestone update together, or nothing), finished stages are
-- locked until reopened, and health/launch changes post updates as the teammate.
begin;
create extension if not exists pgtap with schema extensions;

select plan(24);

truncate public.projects cascade;
delete from public.team_members;

insert into auth.users (instance_id, id, aud, role, email) values
  ('00000000-0000-0000-0000-000000000000', 'b0000000-0000-4000-a000-000000000001', 'authenticated', 'authenticated', 'lead@test.example'),
  ('00000000-0000-0000-0000-000000000000', 'b0000000-0000-4000-a000-000000000002', 'authenticated', 'authenticated', 'away@test.example'),
  ('00000000-0000-0000-0000-000000000000', 'b0000000-0000-4000-a000-000000000003', 'authenticated', 'authenticated', 'client@client.example');

insert into public.team_members (user_id, name, email, role) values
  ('b0000000-0000-4000-a000-000000000001', 'Lead', 'lead@test.example', 'member'),
  ('b0000000-0000-4000-a000-000000000002', 'Away', 'away@test.example', 'member');

insert into public.projects (id, public_id, name, client_name, starts_on, launches_on, lead_id) values
  ('b0000000-0000-4000-b000-000000000001', 'NB-9801', 'Website', 'Client', '2026-10-01', '2027-02-12', 'b0000000-0000-4000-a000-000000000001');
-- The lead works on the project through project_team, as portal_create_project sets it up.
insert into public.project_team (project_id, user_id, role_label) values
  ('b0000000-0000-4000-b000-000000000001', 'b0000000-0000-4000-a000-000000000001', 'Project lead');
insert into public.project_clients (project_id, email, user_id, status) values
  ('b0000000-0000-4000-b000-000000000001', 'client@client.example', 'b0000000-0000-4000-a000-000000000003', 'active');
insert into public.stages (id, project_id, position, name, starts_on, ends_on, completed_at) values
  ('b0000000-0000-4000-c000-000000000001', 'b0000000-0000-4000-b000-000000000001', 1, 'Design', '2026-10-01', '2026-10-31', now()),
  ('b0000000-0000-4000-c000-000000000002', 'b0000000-0000-4000-b000-000000000001', 2, 'Development', '2026-11-03', '2099-12-15', null),
  ('b0000000-0000-4000-c000-000000000003', 'b0000000-0000-4000-b000-000000000001', 3, 'Review', '2099-12-16', '2100-01-09', null);
insert into public.tickets (id, project_id, stage_id, title, status) values
  ('b0000000-0000-4000-d000-000000000001', 'b0000000-0000-4000-b000-000000000001', 'b0000000-0000-4000-c000-000000000002', 'Open one', 'in_progress'),
  ('b0000000-0000-4000-d000-000000000002', 'b0000000-0000-4000-b000-000000000001', 'b0000000-0000-4000-c000-000000000002', 'Open two', 'blocked'),
  ('b0000000-0000-4000-d000-000000000003', 'b0000000-0000-4000-b000-000000000001', 'b0000000-0000-4000-c000-000000000002', 'Finished', 'done');

select ok(not has_function_privilege('anon', 'public.portal_complete_stage(uuid, boolean, text)', 'execute'), 'anon cannot complete stages');
select ok(not has_function_privilege('anon', 'public.portal_set_project_health(uuid, text, text)', 'execute'), 'anon cannot change health');

set local role authenticated;

-- ---------------------------------------------------------------------------
-- Who may change the plan (3–6)
-- ---------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-a000-000000000002","role":"authenticated"}', true);
select throws_ok($$select * from public.portal_complete_stage('b0000000-0000-4000-c000-000000000002', true, null)$$, 'P0002', null, 'a teammate not on the project cannot complete a stage');
select throws_ok($$select public.portal_set_project_health('b0000000-0000-4000-b000-000000000001', 'at_risk', null)$$, 'P0002', null, 'nor change its health');
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-a000-000000000003","role":"authenticated"}', true);
select throws_ok($$select * from public.portal_complete_stage('b0000000-0000-4000-c000-000000000002', true, null)$$, 'P0002', null, 'a client cannot complete a stage');
select throws_ok($$select public.portal_set_launch_date('b0000000-0000-4000-b000-000000000001', '2027-03-01', null)$$, 'P0002', null, 'nor move the launch');

-- ---------------------------------------------------------------------------
-- Locked stages (7–10)
-- ---------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-a000-000000000001","role":"authenticated"}', true);
select throws_ok($$select public.portal_set_stage_dates('b0000000-0000-4000-c000-000000000001', '2026-10-02', '2026-10-30')$$, 'PT409', null, 'a finished stage''s dates are locked');
select throws_ok($$select * from public.portal_complete_stage('b0000000-0000-4000-c000-000000000003', false, null)$$, 'PT409', null, 'only the current stage can be completed');
select lives_ok($$select public.portal_set_stage_dates('b0000000-0000-4000-c000-000000000003', '2099-12-20', '2100-01-15')$$, 'an open stage''s dates can change');
select is((select ends_on from public.stages where id = 'b0000000-0000-4000-c000-000000000003'), '2100-01-15'::date, 'and they are saved');

-- ---------------------------------------------------------------------------
-- One transaction (11–14): a failing step leaves everything as it was
-- ---------------------------------------------------------------------------

select throws_ok(
  $$select * from public.portal_complete_stage('b0000000-0000-4000-c000-000000000002', true, repeat('x', 4001))$$,
  '23514', null, 'an update that breaks a rule fails the whole completion');
select is((select completed_at from public.stages where id = 'b0000000-0000-4000-c000-000000000002'), null, 'the stage is still open');
select is((select starts_on from public.stages where id = 'b0000000-0000-4000-c000-000000000003'), '2099-12-20'::date, 'the next stage did not move');
select is((select count(*)::int from public.tickets where stage_id = 'b0000000-0000-4000-c000-000000000002'), 3, 'and no ticket moved');

-- ---------------------------------------------------------------------------
-- Complete, moving open tickets (15–20)
-- ---------------------------------------------------------------------------

create temporary table completed (next_stage_id uuid, moved_tickets integer, update_id uuid) on commit drop;
grant all on completed to authenticated;
select lives_ok(
  $$insert into completed select * from public.portal_complete_stage('b0000000-0000-4000-c000-000000000002', true, 'Development is complete. We''re now reviewing everything before launch.')$$,
  'the current stage completes');
select isnt((select completed_at from public.stages where id = 'b0000000-0000-4000-c000-000000000002'), null, 'it is finished');
select is((select starts_on from public.stages where id = 'b0000000-0000-4000-c000-000000000003'), private.lisbon_today(), 'the next stage starts today');
select is((select moved_tickets from completed), 2, 'its two open tickets moved');
select results_eq(
  $$select title, status from public.tickets where stage_id = 'b0000000-0000-4000-c000-000000000003' order by title$$,
  $$values ('Open one', 'in_progress'), ('Open two', 'blocked')$$,
  'keeping their status; the done ticket stays behind');
select results_eq(
  $$select author_id, highlight from public.updates where id = (select update_id from completed)$$,
  $$values ('b0000000-0000-4000-a000-000000000001'::uuid, true)$$,
  'the milestone update is posted by the teammate, highlighted');

-- ---------------------------------------------------------------------------
-- Reopen, health and launch (21–24)
-- ---------------------------------------------------------------------------

select lives_ok($$select public.portal_reopen_stage('b0000000-0000-4000-c000-000000000002')$$, 'a finished stage can be reopened');
create temporary table health_update (id uuid) on commit drop;
grant all on health_update to authenticated;
insert into health_update
  select public.portal_set_project_health('b0000000-0000-4000-b000-000000000001', 'waiting_on_client', 'We need the menu photos to finish the menu page.');
select is(
  (select needs_client from public.updates where id = (select id from health_update)),
  true, 'waiting on the client posts an update that needs them');
select is((select health from public.projects where id = 'b0000000-0000-4000-b000-000000000001'), 'waiting_on_client', 'and sets the health');
select throws_ok($$select public.portal_set_launch_date('b0000000-0000-4000-b000-000000000001', '2026-09-01', 'Earlier!')$$, '23514', null, 'a launch before the start is refused');
reset role;

select * from finish();
rollback;
