-- Updates and the daily digest (#139): posting with linked tickets (same project only),
-- editing marks "edited", deleting hides from the client, and the digest needs the cron
-- secret and goes out at most once per client per day.
begin;
create extension if not exists pgtap with schema extensions;

select plan(22);

truncate public.projects cascade;
truncate private.portal_digest_log;
delete from public.team_members;
delete from vault.secrets where name = 'portal_cron_secret';
select vault.create_secret('test-cron-secret-0123456789abcdef-0123456789', 'portal_cron_secret');
update public.portal_settings set daily_digest = true;

insert into auth.users (instance_id, id, aud, role, email) values
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-4000-a000-000000000001', 'authenticated', 'authenticated', 'rui@test.example'),
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-4000-a000-000000000002', 'authenticated', 'authenticated', 'away@test.example'),
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-4000-a000-000000000003', 'authenticated', 'authenticated', 'joao@client.example'),
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-4000-a000-000000000004', 'authenticated', 'authenticated', 'quiet@other.example'),
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-4000-a000-000000000005', 'authenticated', 'authenticated', 'gone@client.example');

insert into public.team_members (user_id, name, email, role) values
  ('c0000000-0000-4000-a000-000000000001', 'Rui Matos', 'rui@test.example', 'member'),
  ('c0000000-0000-4000-a000-000000000002', 'Away', 'away@test.example', 'member');

insert into public.projects (id, public_id, name, client_name, starts_on, launches_on, lead_id) values
  ('c0000000-0000-4000-b000-000000000001', 'NB-9901', 'Café website', 'Café', '2026-10-01', '2027-02-12', 'c0000000-0000-4000-a000-000000000001'),
  ('c0000000-0000-4000-b000-000000000002', 'NB-9902', 'Other site', 'Other', '2026-10-01', '2027-02-12', 'c0000000-0000-4000-a000-000000000001');
insert into public.project_team (project_id, user_id, role_label) values
  ('c0000000-0000-4000-b000-000000000001', 'c0000000-0000-4000-a000-000000000001', 'Project lead'),
  ('c0000000-0000-4000-b000-000000000002', 'c0000000-0000-4000-a000-000000000001', 'Project lead');
insert into public.project_clients (project_id, email, locale, user_id, status, invited_at, removed_at) values
  ('c0000000-0000-4000-b000-000000000001', 'joao@client.example', 'pt', 'c0000000-0000-4000-a000-000000000003', 'active', now() - interval '10 days', null),
  ('c0000000-0000-4000-b000-000000000002', 'quiet@other.example', 'en', 'c0000000-0000-4000-a000-000000000004', 'active', now() - interval '10 days', null),
  ('c0000000-0000-4000-b000-000000000001', 'gone@client.example', 'en', 'c0000000-0000-4000-a000-000000000005', 'removed', now() - interval '10 days', now());
insert into public.stages (id, project_id, position, name, starts_on) values
  ('c0000000-0000-4000-c000-000000000001', 'c0000000-0000-4000-b000-000000000001', 1, 'Development', '2026-11-01'),
  ('c0000000-0000-4000-c000-000000000002', 'c0000000-0000-4000-b000-000000000002', 1, 'Development', '2026-11-01');
insert into public.tickets (id, project_id, stage_id, title) values
  ('c0000000-0000-4000-d000-000000000001', 'c0000000-0000-4000-b000-000000000001', 'c0000000-0000-4000-c000-000000000001', 'Home page build'),
  ('c0000000-0000-4000-d000-000000000002', 'c0000000-0000-4000-b000-000000000002', 'c0000000-0000-4000-c000-000000000002', 'Other ticket');

create temporary table posted (id uuid) on commit drop;
grant all on posted to authenticated;

select ok(has_function_privilege('anon', 'public.portal_claim_digests(text)', 'execute'), 'the cron can call the digest with the public key');
select ok(not has_function_privilege('anon', 'public.portal_post_update(uuid, text, boolean, boolean, uuid[])', 'execute'), 'anon cannot post updates');

-- ---------------------------------------------------------------------------
-- Posting (3–9)
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"c0000000-0000-4000-a000-000000000001","role":"authenticated"}', true);
select lives_ok(
  $$insert into posted select public.portal_post_update('c0000000-0000-4000-b000-000000000001', ' The home page is live on staging. ', false, true, array['c0000000-0000-4000-d000-000000000001']::uuid[])$$,
  'a teammate posts an update with a linked ticket');
select results_eq(
  $$select body, author_id, needs_client, highlight from public.updates where id = (select id from posted)$$,
  $$values ('The home page is live on staging.', 'c0000000-0000-4000-a000-000000000001'::uuid, true, false)$$,
  'trimmed, by the teammate, asking the client');
select is((select count(*)::int from public.update_tickets where update_id = (select id from posted)), 1, 'the ticket is linked');
select throws_ok(
  $$select public.portal_post_update('c0000000-0000-4000-b000-000000000001', 'Wrong link', false, false, array['c0000000-0000-4000-d000-000000000002']::uuid[])$$,
  '23503', null, 'a ticket from another project cannot be linked');
select set_config('request.jwt.claims', '{"sub":"c0000000-0000-4000-a000-000000000002","role":"authenticated"}', true);
select throws_ok(
  $$select public.portal_post_update('c0000000-0000-4000-b000-000000000001', 'Not mine', false, false)$$,
  'P0002', null, 'a teammate not on the project cannot post');
select set_config('request.jwt.claims', '{"sub":"c0000000-0000-4000-a000-000000000003","role":"authenticated"}', true);
select throws_ok(
  $$select public.portal_post_update('c0000000-0000-4000-b000-000000000001', 'From a client', false, false)$$,
  'P0002', null, 'a client cannot post');
select is((select count(*)::int from public.updates), 1, 'the client sees the live post');

-- ---------------------------------------------------------------------------
-- Edit and delete (10–13)
-- ---------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub":"c0000000-0000-4000-a000-000000000001","role":"authenticated"}', true);
select lives_ok(
  $$select public.portal_edit_update((select id from posted), 'The home page is live on staging (edited).', true, false, '{}')$$,
  'a teammate edits the post');
select isnt((select edited_at from public.updates where id = (select id from posted)), null, 'it shows as edited');
select is((select count(*)::int from public.update_tickets where update_id = (select id from posted)), 0, 'its links are replaced as sent');

-- A second post stays live; the first is deleted.
insert into posted select public.portal_post_update('c0000000-0000-4000-b000-000000000001', 'Story section next.', false, false);
select public.portal_delete_update((select id from posted order by id limit 1));
select set_config('request.jwt.claims', '{"sub":"c0000000-0000-4000-a000-000000000003","role":"authenticated"}', true);
select is((select count(*)::int from public.updates), 1, 'a deleted post disappears from the client feed');

-- ---------------------------------------------------------------------------
-- The daily digest (14–22)
-- ---------------------------------------------------------------------------

reset role;
set local role anon;
select throws_ok($$select * from public.portal_claim_digests('wrong-secret')$$, '42501', null, 'the digest refuses a wrong secret');
select throws_ok($$select * from public.portal_claim_digests(null)$$, '42501', null, 'and a missing one');

create temporary table digest as
  select * from public.portal_claim_digests('test-cron-secret-0123456789abcdef-0123456789');
select is((select count(*)::int from digest), 1, 'one client has new updates');
select results_eq(
  $$select client_email, locale, public_id from digest$$,
  $$values ('joao@client.example', 'pt', 'NB-9901')$$,
  'the active client of the project with posts, in their language');
select is((select jsonb_array_length(updates) from digest), 1, 'only live posts are included (the deleted one is not)');
select is((select updates -> 0 ->> 'author' from digest), 'Rui Matos', 'with the author''s name');
select is(
  (select count(*)::int from public.portal_claim_digests('test-cron-secret-0123456789abcdef-0123456789')),
  0, 'a second run the same day sends nothing: at most once per client per day');

reset role;
update public.portal_settings set daily_digest = false;
delete from private.portal_digest_log;
set local role anon;
select is(
  (select count(*)::int from public.portal_claim_digests('test-cron-secret-0123456789abcdef-0123456789')),
  0, 'with the digest switched off in Settings, nothing goes out');
reset role;
select is((select count(*)::int from private.portal_digest_log), 0, 'and nothing is claimed');

select * from finish();
rollback;
