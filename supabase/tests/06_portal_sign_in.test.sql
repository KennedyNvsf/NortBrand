-- Client sign-in functions (#131): one answer for every non-match, the 3-tries lock and
-- its expiry, code lifetime, rate limits, and completion only by the client's own user.
begin;
create extension if not exists pgtap with schema extensions;

select plan(32);

truncate public.projects cascade;
truncate private.portal_rate_events;

insert into auth.users (instance_id, id, aud, role, email) values
  ('00000000-0000-0000-0000-000000000000', '20000000-0000-4000-a000-000000000001', 'authenticated', 'authenticated', 'lead@test.example'),
  ('00000000-0000-0000-0000-000000000000', '20000000-0000-4000-a000-000000000011', 'authenticated', 'authenticated', 'client1@test.example'),
  ('00000000-0000-0000-0000-000000000000', '20000000-0000-4000-a000-000000000012', 'authenticated', 'authenticated', 'invited@test.example'),
  ('00000000-0000-0000-0000-000000000000', '20000000-0000-4000-a000-000000000013', 'authenticated', 'authenticated', 'removed@test.example'),
  ('00000000-0000-0000-0000-000000000000', '20000000-0000-4000-a000-000000000014', 'authenticated', 'authenticated', 'stranger@test.example');

insert into public.team_members (user_id, name, email, role) values
  ('20000000-0000-4000-a000-000000000001', 'Lead', 'lead@test.example', 'admin');

insert into public.projects (id, public_id, name, client_name, starts_on, launches_on, status, lead_id) values
  ('20000000-0000-4000-b000-000000000001', 'NB-9101', 'Open project', 'Client', '2026-11-01', '2027-01-31', 'active', '20000000-0000-4000-a000-000000000001'),
  ('20000000-0000-4000-b000-000000000002', 'NB-9102', 'Closed project', 'Client', '2026-01-01', '2026-06-30', 'closed', '20000000-0000-4000-a000-000000000001');

insert into public.project_clients (project_id, email, user_id, status, removed_at) values
  ('20000000-0000-4000-b000-000000000001', 'client1@test.example', '20000000-0000-4000-a000-000000000011', 'active', null),
  ('20000000-0000-4000-b000-000000000001', 'invited@test.example', '20000000-0000-4000-a000-000000000012', 'invited', null),
  ('20000000-0000-4000-b000-000000000001', 'removed@test.example', '20000000-0000-4000-a000-000000000013', 'removed', now()),
  ('20000000-0000-4000-b000-000000000001', 'nouser@test.example', null, 'invited', null),
  ('20000000-0000-4000-b000-000000000002', 'client1@test.example', '20000000-0000-4000-a000-000000000011', 'active', null);

-- ---------------------------------------------------------------------------
-- Grants (1–3)
-- ---------------------------------------------------------------------------

select ok(has_function_privilege('anon', 'public.portal_begin_client_sign_in(text, text, text)', 'execute'), 'anon can begin a sign-in');
select ok(not has_function_privilege('anon', 'public.portal_complete_client_sign_in(text)', 'execute'), 'anon cannot complete a sign-in');
select ok(not has_function_privilege('authenticated', 'public.portal_begin_client_sign_in(text, text, text)', 'execute'), 'begin is for the anon server client only');

-- ---------------------------------------------------------------------------
-- Begin: one answer for every non-match (4–11)
-- ---------------------------------------------------------------------------

set local role anon;
select is(public.portal_begin_client_sign_in(' Client1@Test.Example ', 'nb-9101', repeat('1', 64)), 'ok', 'an active client gets a code (email and ID normalised)');
select is(public.portal_begin_client_sign_in('invited@test.example', 'NB-9101', repeat('1', 64)), 'ok', 'an invited client with a user gets a code');
select is(public.portal_begin_client_sign_in('nobody@test.example', 'NB-9101', repeat('1', 64)), 'no_match', 'a wrong email is no_match');
select is(public.portal_begin_client_sign_in('client1@test.example', 'NB-0000', repeat('1', 64)), 'no_match', 'a wrong Project ID is no_match');
select is(public.portal_begin_client_sign_in('client1@test.example', 'NB-9102', repeat('1', 64)), 'no_match', 'a closed project is no_match');
select is(public.portal_begin_client_sign_in('removed@test.example', 'NB-9101', repeat('1', 64)), 'no_match', 'a removed client is no_match');
select is(public.portal_begin_client_sign_in('nouser@test.example', 'NB-9101', repeat('1', 64)), 'no_match', 'a client without an auth user is no_match');
select throws_ok($$select public.portal_begin_client_sign_in('client1@test.example', 'NB-9101', 'not-a-hash')$$, '22023', null, 'a malformed ip_hash is refused');

-- ---------------------------------------------------------------------------
-- Code state and the 3-tries lock (12–18)
-- ---------------------------------------------------------------------------

select is(public.portal_code_state('client1@test.example', 'NB-9101'), 'active', 'a fresh code is active');
select is(public.portal_code_state('nobody@test.example', 'NB-9101'), 'expired', 'an unknown client reads as expired, not as no_match');
select is(public.portal_register_wrong_code('client1@test.example', 'NB-9101'), 2, 'first wrong code leaves 2 tries');
select is(public.portal_register_wrong_code('client1@test.example', 'NB-9101'), 1, 'second wrong code leaves 1 try');
select is(public.portal_register_wrong_code('client1@test.example', 'NB-9101'), 0, 'third wrong code locks sign-in');
select is(public.portal_code_state('client1@test.example', 'NB-9101'), 'locked', 'the code state reads locked');
select is(public.portal_begin_client_sign_in('client1@test.example', 'NB-9101', repeat('4', 64)), 'locked', 'no new code while locked');
reset role;

select is(
  (select count(*)::int from public.access_events
   where project_id = '20000000-0000-4000-b000-000000000001' and email = 'client1@test.example' and kind in ('wrong_code', 'locked')),
  4,
  'three wrong codes and the lock are in the activity log'
);

-- ---------------------------------------------------------------------------
-- Lock expiry, fresh tries and code lifetime (20–22)
-- ---------------------------------------------------------------------------

update private.portal_sign_in_attempts
set attempted_at = now() - interval '16 minutes'
where email = 'client1@test.example';

set local role anon;
select is(public.portal_begin_client_sign_in('client1@test.example', 'NB-9101', repeat('4', 64)), 'ok', 'the lock lifts after 15 minutes');
select is(public.portal_register_wrong_code('client1@test.example', 'NB-9101'), 2, 'a new code starts with fresh tries');
reset role;

update private.portal_sign_in_attempts
set attempted_at = now() - interval '11 minutes'
where email = 'client1@test.example' and outcome = 'code_sent';

set local role anon;
select is(public.portal_code_state('client1@test.example', 'NB-9101'), 'expired', 'a code older than 10 minutes is expired');
reset role;

-- ---------------------------------------------------------------------------
-- Rate limits (23–24)
-- ---------------------------------------------------------------------------

insert into private.portal_rate_events (ip_hash) select repeat('2', 64) from generate_series(1, 10);
set local role anon;
select throws_ok(
  $$select public.portal_begin_client_sign_in('client1@test.example', 'NB-9101', repeat('2', 64))$$,
  'PT429', null, 'the 11th code request from one ip_hash in an hour is refused'
);
reset role;

insert into private.portal_rate_events (ip_hash)
select lpad(to_hex(n), 64, 'a') from generate_series(1, 200) as n;
set local role anon;
select throws_ok(
  $$select public.portal_begin_client_sign_in('client1@test.example', 'NB-9101', repeat('3', 64))$$,
  'PT429', null, 'requests stop at 200 an hour in total'
);
reset role;
truncate private.portal_rate_events;

-- ---------------------------------------------------------------------------
-- Completion, run as the signed-in user (25–30)
-- ---------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub":"20000000-0000-4000-a000-000000000011","role":"authenticated"}', true);
set local role authenticated;
select is((select project_id from public.portal_complete_client_sign_in('nb-9101')), '20000000-0000-4000-b000-000000000001'::uuid, 'the client completes sign-in to their project');
select is((select project_id from public.portal_complete_client_sign_in('NB-9102')), null, 'a closed project cannot be completed');
reset role;

select ok(
  (select last_sign_in_at is not null from public.project_clients where email = 'client1@test.example' and project_id = '20000000-0000-4000-b000-000000000001'),
  'completion stamps the last sign-in'
);

select set_config('request.jwt.claims', '{"sub":"20000000-0000-4000-a000-000000000012","role":"authenticated"}', true);
set local role authenticated;
select is((select project_id from public.portal_complete_client_sign_in('NB-9101')), '20000000-0000-4000-b000-000000000001'::uuid, 'an invited client can complete sign-in');
reset role;
select is((select status from public.project_clients where email = 'invited@test.example'), 'active', 'the first sign-in activates an invited client');

select set_config('request.jwt.claims', '{"sub":"20000000-0000-4000-a000-000000000014","role":"authenticated"}', true);
set local role authenticated;
select is((select project_id from public.portal_complete_client_sign_in('NB-9101')), null, 'a user who is not a client completes nothing');
reset role;

-- ---------------------------------------------------------------------------
-- Logging and privacy (30–31)
-- ---------------------------------------------------------------------------

select is(
  (select count(*)::int from public.access_events where project_id = '20000000-0000-4000-b000-000000000001' and kind = 'sign_in'),
  2,
  'each completed sign-in is logged once'
);

set local role anon;
select throws_ok('select * from private.portal_sign_in_attempts', '42501', null, 'the attempts table is not reachable');
reset role;

select * from finish();
rollback;
