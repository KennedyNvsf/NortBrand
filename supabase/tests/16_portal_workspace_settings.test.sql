-- Workspace Settings (#159): only admins save settings, a stale save is refused, the
-- stage template is validated and replaced atomically, and each saved value takes
-- effect: wrong codes allowed, the pause length, the session length handed to sign-in,
-- and the first sign-in notice for the project lead. (The digest switch is test 12.)
begin;
create extension if not exists pgtap with schema extensions;

select plan(23);

truncate public.projects cascade;
delete from public.team_members;
truncate private.portal_sign_in_attempts;

insert into auth.users (instance_id, id, aud, role, email) values
  ('00000000-0000-0000-0000-000000000000', 'a1600000-0000-4000-a000-000000000001', 'authenticated', 'authenticated', 'ana@test.example'),
  ('00000000-0000-0000-0000-000000000000', 'a1600000-0000-4000-a000-000000000002', 'authenticated', 'authenticated', 'tiago@test.example'),
  ('00000000-0000-0000-0000-000000000000', 'a1600000-0000-4000-a000-000000000003', 'authenticated', 'authenticated', 'joao@client.example'),
  ('00000000-0000-0000-0000-000000000000', 'a1600000-0000-4000-a000-000000000004', 'authenticated', 'authenticated', 'rita@client.example');

insert into public.team_members (user_id, name, email, role) values
  ('a1600000-0000-4000-a000-000000000001', 'Ana Costa', 'ana@test.example', 'admin'),
  ('a1600000-0000-4000-a000-000000000002', 'Tiago Sousa', 'tiago@test.example', 'member');

insert into public.projects (id, public_id, name, client_name, starts_on, launches_on, lead_id) values
  ('a1600000-0000-4000-b000-000000000001', 'NB-9961', 'Atlântico Café website', 'Atlântico Café', '2026-10-01', '2027-02-12', 'a1600000-0000-4000-a000-000000000002');
insert into public.project_clients (project_id, email, user_id, status, last_sign_in_at) values
  ('a1600000-0000-4000-b000-000000000001', 'joao@client.example', 'a1600000-0000-4000-a000-000000000003', 'invited', null),
  ('a1600000-0000-4000-b000-000000000001', 'rita@client.example', 'a1600000-0000-4000-a000-000000000004', 'active', now() - interval '2 days');

update public.portal_settings
set code_max_tries = 3, lockout_minutes = 15, session_days = 30,
    daily_digest = true, notify_first_client_sign_in = true, allowed_team_domain = null;

-- The stages a valid save sends (the defaults, with Development renamed).
create temporary table good_stages as select $json$[
  {"name": "Discovery", "kind": "work", "weeks": 2},
  {"name": "Design", "kind": "work", "weeks": 3},
  {"name": "Build", "kind": "work", "weeks": 6},
  {"name": "Review", "kind": "work", "weeks": 3},
  {"name": "Launch", "kind": "launch", "weeks": null},
  {"name": "Care", "kind": "after", "weeks": null}
]$json$::jsonb as stages;
grant select on good_stages to authenticated;

-- ---------------------------------------------------------------------------
-- Who can read and save (1–5)
-- ---------------------------------------------------------------------------

select ok(not has_function_privilege('anon', 'public.portal_save_settings(timestamptz, integer, integer, integer, boolean, boolean, text, jsonb)', 'execute'),
  'the public key cannot save settings');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a1600000-0000-4000-a000-000000000002","role":"authenticated"}', true);
select is((select count(*)::int from public.portal_stage_template), 6, 'a member reads the stage template');
select throws_ok(
  $$select public.portal_save_settings((select updated_at from public.portal_settings), 5, 30, 14, false, false, null, (select stages from good_stages))$$,
  '42501', null, 'a member cannot save settings');

select set_config('request.jwt.claims', '{"sub":"a1600000-0000-4000-a000-000000000003","role":"authenticated"}', true);
select is((select count(*)::int from public.portal_stage_template), 0, 'a client reads no stage template');
select throws_ok(
  $$insert into public.portal_stage_template (position, name, kind, weeks) values (7, 'Extra', 'work', 1)$$,
  '42501', null, 'nobody writes the template directly');

-- ---------------------------------------------------------------------------
-- Saving (6–14)
-- ---------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub":"a1600000-0000-4000-a000-000000000001","role":"authenticated"}', true);
select throws_ok(
  $$select public.portal_save_settings('2000-01-01', 2, 5, 7, false, true, null, (select stages from good_stages))$$,
  'PT409', 'stale_settings', 'a save on top of a newer one is refused');
select throws_ok(
  $$select public.portal_save_settings((select updated_at from public.portal_settings), 2, 5, 7, false, true, null,
    '[{"name":"Design","kind":"work","weeks":2},{"name":"Care","kind":"after","weeks":null},{"name":"Launch","kind":"launch","weeks":null}]')$$,
  '22023', null, 'care before launch is refused');
select throws_ok(
  $$select public.portal_save_settings((select updated_at from public.portal_settings), 2, 5, 7, false, true, null,
    '[{"name":"Design","kind":"work","weeks":2},{"name":"design","kind":"work","weeks":1},{"name":"Launch","kind":"launch","weeks":null},{"name":"Care","kind":"after","weeks":null}]')$$,
  '22023', null, 'two stages with the same name are refused');
select throws_ok(
  $$select public.portal_save_settings((select updated_at from public.portal_settings), 2, 5, 7, false, true, null,
    '[{"name":"Design","kind":"work","weeks":0},{"name":"Launch","kind":"launch","weeks":null},{"name":"Care","kind":"after","weeks":null}]')$$,
  '22023', null, 'a working stage needs at least a week');
select throws_ok(
  $$select public.portal_save_settings((select updated_at from public.portal_settings), 11, 5, 7, false, true, null, (select stages from good_stages))$$,
  '23514', null, 'out-of-range values are refused by the column checks');
select is((select name from public.portal_stage_template where position = 3), 'Development',
  'a refused save changes nothing');

select lives_ok(
  $$select public.portal_save_settings((select updated_at from public.portal_settings), 2, 5, 7, false, true, ' Studio.PT ', (select stages from good_stages))$$,
  'an admin saves every setting and the template at once');
select results_eq(
  $$select code_max_tries::int, lockout_minutes::int, session_days::int, daily_digest, allowed_team_domain from public.portal_settings$$,
  $$values (2, 5, 7, false, 'studio.pt')$$,
  'the settings are stored, the team domain trimmed and lower-cased');
select results_eq(
  $$select position::int, name, kind, weeks::int from public.portal_stage_template order by position$$,
  $$values (1, 'Discovery', 'work', 2), (2, 'Design', 'work', 3), (3, 'Build', 'work', 6), (4, 'Review', 'work', 3),
           (5, 'Launch', 'launch', null::int), (6, 'Care', 'after', null::int)$$,
  'the template is replaced in order');

-- ---------------------------------------------------------------------------
-- Saved values take effect (15–23)
-- ---------------------------------------------------------------------------

reset role;
insert into private.portal_sign_in_attempts (project_id, email, outcome)
values ('a1600000-0000-4000-b000-000000000001', 'joao@client.example', 'code_sent');
select is(public.portal_register_wrong_code('joao@client.example', 'NB-9961'), 1,
  'with two wrong codes allowed, the first miss leaves one try');
select is(public.portal_register_wrong_code('joao@client.example', 'NB-9961'), 0,
  'and the second pauses sign-in');

update private.portal_sign_in_attempts set attempted_at = now() - interval '10 minutes' where outcome = 'locked';
select ok(not private.portal_is_locked('a1600000-0000-4000-b000-000000000001', 'joao@client.example'),
  'a 5-minute pause is over after 10 minutes');
update public.portal_settings set lockout_minutes = 15;
select ok(private.portal_is_locked('a1600000-0000-4000-b000-000000000001', 'joao@client.example'),
  'a 15-minute pause is not');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a1600000-0000-4000-a000-000000000003","role":"authenticated"}', true);
select results_eq(
  $$select session_days, notify_email, notify_name, project_public_id, client_email
    from public.portal_complete_client_sign_in('nb-9961')$$,
  $$values (7, 'tiago@test.example', 'Tiago Sousa', 'NB-9961', 'joao@client.example')$$,
  'a client''s first sign-in returns the saved session length and the project lead to tell');
select is(
  (select notify_email from public.portal_complete_client_sign_in('NB-9961')), null,
  'their next sign-in tells nobody');

select set_config('request.jwt.claims', '{"sub":"a1600000-0000-4000-a000-000000000004","role":"authenticated"}', true);
select is(
  (select notify_email from public.portal_complete_client_sign_in('NB-9961')), null,
  'a client who has signed in before tells nobody');

reset role;
update public.portal_settings set notify_first_client_sign_in = false;
update public.project_clients set last_sign_in_at = null where email = 'rita@client.example';
set local role authenticated;
select results_eq(
  $$select project_id, notify_email from public.portal_complete_client_sign_in('NB-9961')$$,
  $$values ('a1600000-0000-4000-b000-000000000001'::uuid, null::text)$$,
  'with the setting off, a first sign-in still completes and tells nobody');

select set_config('request.jwt.claims', '{"sub":"a1600000-0000-4000-a000-000000000002","role":"authenticated"}', true);
select is((select count(*)::int from public.portal_complete_client_sign_in('NB-9961')), 0,
  'a teammate who is not a client completes nothing');

select * from finish();
rollback;
