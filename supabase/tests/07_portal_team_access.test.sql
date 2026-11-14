-- Team access (#132): team sign-in, the admin-only invite/remove functions, the
-- allowed-domain rule (also on direct writes) and the first-admin bootstrap.
begin;
create extension if not exists pgtap with schema extensions;

select plan(36);

truncate public.projects cascade;
truncate private.portal_rate_events;
truncate private.portal_team_sign_in_attempts;
delete from public.team_members;

insert into auth.users (instance_id, id, aud, role, email) values
  ('00000000-0000-0000-0000-000000000000', '30000000-0000-4000-a000-000000000001', 'authenticated', 'authenticated', 'boss@test.example'),
  ('00000000-0000-0000-0000-000000000000', '30000000-0000-4000-a000-000000000002', 'authenticated', 'authenticated', 'worker@test.example'),
  ('00000000-0000-0000-0000-000000000000', '30000000-0000-4000-a000-000000000003', 'authenticated', 'authenticated', 'leaver@test.example'),
  ('00000000-0000-0000-0000-000000000000', '30000000-0000-4000-a000-000000000004', 'authenticated', 'authenticated', 'newbie@test.example'),
  ('00000000-0000-0000-0000-000000000000', '30000000-0000-4000-a000-000000000005', 'authenticated', 'authenticated', 'outsider@elsewhere.example');

-- ---------------------------------------------------------------------------
-- Bootstrap (1–4)
-- ---------------------------------------------------------------------------

select ok(not has_function_privilege('authenticated', 'private.portal_bootstrap_first_admin(uuid, text)', 'execute'), 'only the SQL editor can bootstrap');
select lives_ok($$select private.portal_bootstrap_first_admin('30000000-0000-4000-a000-000000000001', 'Boss')$$, 'the first admin is created');
select is((select role from public.team_members where user_id = '30000000-0000-4000-a000-000000000001'), 'admin', 'with the admin role and the auth email');
select throws_ok($$select private.portal_bootstrap_first_admin('30000000-0000-4000-a000-000000000002', 'Worker')$$, 'PT409', null, 'a second bootstrap is refused');

insert into public.team_members (user_id, name, email, role) values
  ('30000000-0000-4000-a000-000000000002', 'Worker', 'worker@test.example', 'member'),
  ('30000000-0000-4000-a000-000000000003', 'Leaver', 'leaver@test.example', 'member');

insert into public.projects (id, public_id, name, client_name, starts_on, launches_on, status, lead_id) values
  ('30000000-0000-4000-b000-000000000001', 'NB-9301', 'Led by boss', 'Client', '2026-11-01', '2027-01-31', 'active', '30000000-0000-4000-a000-000000000001'),
  ('30000000-0000-4000-b000-000000000002', 'NB-9302', 'Led by worker', 'Client', '2026-11-01', '2027-01-31', 'active', '30000000-0000-4000-a000-000000000002');
insert into public.project_team (project_id, user_id, role_label) values
  ('30000000-0000-4000-b000-000000000001', '30000000-0000-4000-a000-000000000003', 'Design');
insert into public.stages (id, project_id, position, name, starts_on) values
  ('30000000-0000-4000-c000-000000000001', '30000000-0000-4000-b000-000000000001', 1, 'Design', '2026-11-01');
insert into public.tickets (id, project_id, stage_id, title, owner_id) values
  ('30000000-0000-4000-d000-000000000001', '30000000-0000-4000-b000-000000000001', '30000000-0000-4000-c000-000000000001', 'Leaver ticket', '30000000-0000-4000-a000-000000000003');
insert into public.updates (id, project_id, author_id, body) values
  ('30000000-0000-4000-e000-000000000001', '30000000-0000-4000-b000-000000000001', '30000000-0000-4000-a000-000000000003', 'Leaver update');

-- ---------------------------------------------------------------------------
-- Grants (5–8)
-- ---------------------------------------------------------------------------

select ok(has_function_privilege('anon', 'public.portal_begin_team_sign_in(text, text)', 'execute'), 'anon can begin a team sign-in');
select ok(not has_function_privilege('anon', 'public.portal_complete_team_sign_in()', 'execute'), 'anon cannot complete one');
select ok(not has_function_privilege('anon', 'public.portal_add_team_member(uuid, text, text)', 'execute'), 'anon cannot add teammates');
select ok(not has_function_privilege('anon', 'public.portal_remove_team_member(uuid)', 'execute'), 'anon cannot remove teammates');

-- ---------------------------------------------------------------------------
-- Team sign-in (9–19)
-- ---------------------------------------------------------------------------

set local role anon;
select is(public.portal_begin_team_sign_in('Worker@Test.example ', repeat('a', 64)), 'ok', 'a teammate gets a code (email normalised)');
select is(public.portal_begin_team_sign_in('newbie@test.example', repeat('a', 64)), 'no_match', 'an auth user who is not a teammate: no_match');
select is(public.portal_begin_team_sign_in('nobody@test.example', repeat('a', 64)), 'no_match', 'an unknown email: the same no_match');
select throws_ok($$select public.portal_begin_team_sign_in('worker@test.example', 'nope')$$, '22023', null, 'a malformed ip_hash is refused');
select is(public.portal_team_code_state('worker@test.example'), 'active', 'the code is live');
select is(public.portal_team_code_state('nobody@test.example'), 'expired', 'a non-teammate reads expired');
select is(public.portal_register_team_wrong_code('worker@test.example'), 2, 'first miss: 2 tries left');
select is(public.portal_register_team_wrong_code('worker@test.example'), 1, 'second miss: 1 try left');
select is(public.portal_register_team_wrong_code('worker@test.example'), 0, 'third miss: paused');
select is(public.portal_team_code_state('worker@test.example'), 'locked', 'the code state reads locked');
select is(public.portal_begin_team_sign_in('worker@test.example', repeat('a', 64)), 'locked', 'and no new code while paused');
reset role;

-- ---------------------------------------------------------------------------
-- Completion (20–21)
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"30000000-0000-4000-a000-000000000002","role":"authenticated"}', true);
select is(public.portal_complete_team_sign_in(), 'member', 'a teammate completes with their role');
select set_config('request.jwt.claims', '{"sub":"30000000-0000-4000-a000-000000000004","role":"authenticated"}', true);
select is(public.portal_complete_team_sign_in(), null, 'a non-teammate completes nothing');
reset role;

-- ---------------------------------------------------------------------------
-- Members can't administer (22–24)
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"30000000-0000-4000-a000-000000000002","role":"authenticated"}', true);
select throws_ok($$select * from public.portal_check_team_invite('newbie@test.example')$$, '42501', null, 'a member cannot check an invite');
select throws_ok($$select public.portal_add_team_member('30000000-0000-4000-a000-000000000004', 'Newbie', 'member')$$, '42501', null, 'a member cannot add a teammate');
select throws_ok($$select public.portal_remove_team_member('30000000-0000-4000-a000-000000000003')$$, '42501', null, 'a member cannot remove a teammate');
reset role;

-- ---------------------------------------------------------------------------
-- Admin: invite (25–29)
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"30000000-0000-4000-a000-000000000001","role":"authenticated"}', true);
select results_eq($$select status, user_id from public.portal_check_team_invite('Newbie@test.example')$$,
  $$values ('ok'::text, '30000000-0000-4000-a000-000000000004'::uuid)$$, 'an invite is ok and returns the existing auth user');
select results_eq($$select status from public.portal_check_team_invite('worker@test.example')$$,
  $$values ('already_member'::text)$$, 'an active teammate is already a member');
select lives_ok($$select public.portal_add_team_member('30000000-0000-4000-a000-000000000004', ' Newbie ', 'member')$$, 'an admin adds a teammate');
select is((select name || '|' || email || '|' || role from public.team_members where user_id = '30000000-0000-4000-a000-000000000004'),
  'Newbie|newbie@test.example|member', 'with a trimmed name and the auth email');
select throws_ok($$select public.portal_add_team_member('30000000-0000-4000-a000-000000000004', 'Newbie', 'owner')$$, '22023', null, 'an unknown role is refused');
reset role;

-- ---------------------------------------------------------------------------
-- The allowed domain (30–32)
-- ---------------------------------------------------------------------------

update public.portal_settings set allowed_team_domain = 'test.example';

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"30000000-0000-4000-a000-000000000001","role":"authenticated"}', true);
select results_eq($$select status from public.portal_check_team_invite('outsider@elsewhere.example')$$,
  $$values ('domain_not_allowed'::text)$$, 'an invite outside the allowed domain is refused');
select throws_ok($$select public.portal_add_team_member('30000000-0000-4000-a000-000000000005', 'Outsider', 'member')$$, 'PT422', null, 'adding outside the domain is refused');
select throws_ok($$insert into public.team_members (user_id, name, email, role) values ('30000000-0000-4000-a000-000000000005', 'Outsider', 'outsider@elsewhere.example', 'member')$$,
  'PT422', null, 'a direct insert outside the domain is refused too');
reset role;

update public.portal_settings set allowed_team_domain = null;

-- ---------------------------------------------------------------------------
-- Admin: remove (33–36)
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"30000000-0000-4000-a000-000000000001","role":"authenticated"}', true);
select throws_ok($$select public.portal_remove_team_member('30000000-0000-4000-a000-000000000001')$$, 'PT403', null, 'an admin cannot remove themselves');
select throws_ok($$select public.portal_remove_team_member('30000000-0000-4000-a000-000000000002')$$, 'PT409', null, 'the lead of an active project cannot be removed');
select lives_ok($$select public.portal_remove_team_member('30000000-0000-4000-a000-000000000003')$$, 'a teammate is removed');
reset role;

select is(
  (select (select active from public.team_members where user_id = '30000000-0000-4000-a000-000000000003')::text
     || '|' || (select owner_id from public.tickets where id = '30000000-0000-4000-d000-000000000001')::text
     || '|' || (select author_id from public.updates where id = '30000000-0000-4000-e000-000000000001')::text
     || '|' || (select count(*) from public.project_team where user_id = '30000000-0000-4000-a000-000000000003')::text),
  'false|30000000-0000-4000-a000-000000000001|30000000-0000-4000-a000-000000000001|0',
  'deactivated; tickets and updates go to the lead; off the project team');

select * from finish();
rollback;
