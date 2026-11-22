-- Portal security sweep (#143): every portal function and every team-writable table,
-- attempted across projects and across roles. Two attackers:
--   * a member who works on project A only, aiming at project B;
--   * a client of project A, aiming at project B and at every team function.
-- Each attempt must raise. A checksum of all of project B's rows, taken as the owner
-- before and after, proves nothing changed even where a statement could have failed
-- quietly. (Each function's own rules are in tests 05–18; this file is the IDOR sweep.)
begin;
create extension if not exists pgtap with schema extensions;

select plan(52);

truncate public.projects cascade;
delete from public.team_members;

insert into auth.users (instance_id, id, aud, role, email) values
  ('00000000-0000-0000-0000-000000000000', 'a1900000-0000-4000-a000-000000000001', 'authenticated', 'authenticated', 'ana@test.example'),
  ('00000000-0000-0000-0000-000000000000', 'a1900000-0000-4000-a000-000000000002', 'authenticated', 'authenticated', 'mara@test.example'),
  ('00000000-0000-0000-0000-000000000000', 'a1900000-0000-4000-a000-000000000003', 'authenticated', 'authenticated', 'bruno@test.example'),
  ('00000000-0000-0000-0000-000000000000', 'a1900000-0000-4000-a000-000000000004', 'authenticated', 'authenticated', 'clara@clienta.example'),
  ('00000000-0000-0000-0000-000000000000', 'a1900000-0000-4000-a000-000000000005', 'authenticated', 'authenticated', 'beto@clientb.example');

insert into public.team_members (user_id, name, email, role) values
  ('a1900000-0000-4000-a000-000000000001', 'Ana Costa', 'ana@test.example', 'admin'),
  ('a1900000-0000-4000-a000-000000000002', 'Mara Lopes', 'mara@test.example', 'member'),
  ('a1900000-0000-4000-a000-000000000003', 'Bruno Reis', 'bruno@test.example', 'member');

-- A: Mara's project, Clara's portal. B: Bruno's project, Beto's portal.
insert into public.projects (id, public_id, name, client_name, starts_on, launches_on, lead_id) values
  ('a1900000-0000-4000-b000-00000000000a', 'NB-9991', 'Project A', 'Client A', '2026-10-01', '2027-02-12', 'a1900000-0000-4000-a000-000000000002'),
  ('a1900000-0000-4000-b000-00000000000b', 'NB-9992', 'Project B', 'Client B', '2026-10-01', '2027-02-12', 'a1900000-0000-4000-a000-000000000003');
insert into public.project_team (project_id, user_id, role_label) values
  ('a1900000-0000-4000-b000-00000000000a', 'a1900000-0000-4000-a000-000000000002', 'Lead'),
  ('a1900000-0000-4000-b000-00000000000b', 'a1900000-0000-4000-a000-000000000003', 'Lead');
insert into public.stages (id, project_id, position, name, starts_on, ends_on) values
  ('a1900000-0000-4000-c000-00000000000a', 'a1900000-0000-4000-b000-00000000000a', 1, 'Design', '2026-10-01', '2026-11-30'),
  ('a1900000-0000-4000-c000-00000000000b', 'a1900000-0000-4000-b000-00000000000b', 1, 'Design', '2026-10-01', '2026-11-30');
insert into public.tickets (id, project_id, stage_id, title, status, client_visible) values
  ('a1900000-0000-4000-d000-00000000000b', 'a1900000-0000-4000-b000-00000000000b', 'a1900000-0000-4000-c000-00000000000b', 'B ticket', 'todo', true);
insert into public.ticket_checklist_items (id, project_id, ticket_id, position, label) values
  ('a1900000-0000-4000-e000-00000000000b', 'a1900000-0000-4000-b000-00000000000b', 'a1900000-0000-4000-d000-00000000000b', 1, 'B item');
insert into public.updates (id, project_id, author_id, body) values
  ('a1900000-0000-4000-f000-00000000000b', 'a1900000-0000-4000-b000-00000000000b', 'a1900000-0000-4000-a000-000000000003', 'B update');
insert into public.project_files (id, project_id, name, size_bytes, content_type, storage_path, uploaded_by, shared) values
  ('a1900000-0000-4000-9000-00000000000b', 'a1900000-0000-4000-b000-00000000000b', 'B.pdf', 100, 'application/pdf',
   'projects/a1900000-0000-4000-b000-00000000000b/a1900000-0000-4000-9000-00000000000b', 'a1900000-0000-4000-a000-000000000003', false);
insert into public.project_milestones (id, project_id, title, due_on) values
  ('a1900000-0000-4000-8000-00000000000b', 'a1900000-0000-4000-b000-00000000000b', 'B milestone', '2026-12-01');
insert into public.project_clients (id, project_id, email, user_id, status) values
  ('a1900000-0000-4000-7000-00000000000a', 'a1900000-0000-4000-b000-00000000000a', 'clara@clienta.example', 'a1900000-0000-4000-a000-000000000004', 'active'),
  ('a1900000-0000-4000-7000-00000000000b', 'a1900000-0000-4000-b000-00000000000b', 'beto@clientb.example', 'a1900000-0000-4000-a000-000000000005', 'active');

-- Everything of project B, as one checksum.
create function pg_temp.project_b_checksum() returns text language sql as $$
  select md5(concat_ws('|',
    (select row(p.*)::text from public.projects p where p.id = 'a1900000-0000-4000-b000-00000000000b'),
    (select string_agg(row(t.*)::text, ',' order by t.user_id) from public.project_team t where t.project_id = 'a1900000-0000-4000-b000-00000000000b'),
    (select string_agg(row(s.*)::text, ',' order by s.id) from public.stages s where s.project_id = 'a1900000-0000-4000-b000-00000000000b'),
    (select string_agg(row(k.*)::text, ',' order by k.id) from public.tickets k where k.project_id = 'a1900000-0000-4000-b000-00000000000b'),
    (select string_agg(row(i.*)::text, ',' order by i.id) from public.ticket_checklist_items i where i.project_id = 'a1900000-0000-4000-b000-00000000000b'),
    (select string_agg(row(u.*)::text, ',' order by u.id) from public.updates u where u.project_id = 'a1900000-0000-4000-b000-00000000000b'),
    (select string_agg(row(l.*)::text, ',' order by l.update_id) from public.update_tickets l where l.project_id = 'a1900000-0000-4000-b000-00000000000b'),
    (select string_agg(row(f.*)::text, ',' order by f.id) from public.project_files f where f.project_id = 'a1900000-0000-4000-b000-00000000000b'),
    (select string_agg(row(m.*)::text, ',' order by m.id) from public.project_milestones m where m.project_id = 'a1900000-0000-4000-b000-00000000000b'),
    (select string_agg(row(c.*)::text, ',' order by c.id) from public.project_clients c where c.project_id = 'a1900000-0000-4000-b000-00000000000b'),
    (select row(s.*)::text from public.portal_settings s),
    (select string_agg(row(m.*)::text, ',' order by m.user_id) from public.team_members m)
  ));
$$;
create temporary table before_sweep as select pg_temp.project_b_checksum() as checksum;

set local role authenticated;

-- ---------------------------------------------------------------------------
-- A member of project A, aiming at project B (1–25)
-- ---------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub":"a1900000-0000-4000-a000-000000000002","role":"authenticated"}', true);

select is((select count(*)::int from public.projects where id = 'a1900000-0000-4000-b000-00000000000b'), 0, 'member A cannot read project B');
select is((select count(*)::int from public.tickets where project_id = 'a1900000-0000-4000-b000-00000000000b'), 0, 'or its tickets');
select is((select count(*)::int from public.project_files where project_id = 'a1900000-0000-4000-b000-00000000000b'), 0, 'or its files');
select is(public.portal_client_preview('NB-9992'), null, 'or preview it as the client');

select throws_ok($$select public.portal_save_ticket('a1900000-0000-4000-b000-00000000000b', 'Hijack', '', 'todo', 'a1900000-0000-4000-c000-00000000000b', true, '[]', null, null, null, null)$$,
  null, null, 'member A cannot create a ticket in B');
select throws_ok($$select public.portal_save_ticket('a1900000-0000-4000-b000-00000000000b', 'Hijack', '', 'todo', 'a1900000-0000-4000-c000-00000000000b', true, '[]', 'a1900000-0000-4000-d000-00000000000b', now(), null, null)$$,
  null, null, 'or edit B''s ticket');
select throws_ok($$select public.portal_post_update('a1900000-0000-4000-b000-00000000000b', 'Hijack', false, false, '{}')$$,
  null, null, 'or post an update in B');
select throws_ok($$select public.portal_edit_update('a1900000-0000-4000-f000-00000000000b', 'Hijack', false, false, '{}')$$,
  null, null, 'or edit B''s update');
select throws_ok($$select public.portal_delete_update('a1900000-0000-4000-f000-00000000000b')$$,
  null, null, 'or delete it');
select throws_ok($$select public.portal_set_project_health('a1900000-0000-4000-b000-00000000000b', 'at_risk', null)$$,
  null, null, 'or set B''s health');
select throws_ok($$select public.portal_set_launch_date('a1900000-0000-4000-b000-00000000000b', '2027-06-01', null)$$,
  null, null, 'or its launch date');
select throws_ok($$select public.portal_set_stage_dates('a1900000-0000-4000-c000-00000000000b', '2026-10-01', '2026-12-31')$$,
  null, null, 'or its stage dates');
select throws_ok($$select public.portal_complete_stage('a1900000-0000-4000-c000-00000000000b', false, null)$$,
  null, null, 'or complete its stage');
select throws_ok($$select public.portal_reopen_stage('a1900000-0000-4000-c000-00000000000b')$$,
  null, null, 'or reopen it');
select throws_ok($$select public.portal_register_file('a1900000-0000-4000-b000-00000000000b', gen_random_uuid(), 'x.pdf', 10, 'application/pdf')$$,
  null, null, 'or register a file in B');
select throws_ok($$select public.portal_add_client('a1900000-0000-4000-b000-00000000000b', 'evil@x.example', 'Evil', 'en', null)$$,
  null, null, 'or add a client to B');
select throws_ok($$select public.portal_remove_client('a1900000-0000-4000-b000-00000000000b', 'a1900000-0000-4000-7000-00000000000b')$$,
  null, null, 'or remove B''s client');
select throws_ok($$select public.portal_rotate_project_id('a1900000-0000-4000-b000-00000000000b')$$,
  null, null, 'or rotate B''s Project ID');
select throws_ok($$select public.portal_set_project_status('a1900000-0000-4000-b000-00000000000b', 'closed')$$,
  null, null, 'or archive B');
select throws_ok($$select * from public.portal_delete_project('a1900000-0000-4000-b000-00000000000b', 'NB-9992')$$,
  null, null, 'or delete B');
select throws_ok($$insert into public.tickets (project_id, stage_id, title) values ('a1900000-0000-4000-b000-00000000000b', 'a1900000-0000-4000-c000-00000000000b', 'Direct')$$,
  null, null, 'or insert into B''s tickets directly');
select throws_ok($$insert into public.updates (project_id, author_id, body) values ('a1900000-0000-4000-b000-00000000000b', 'a1900000-0000-4000-a000-000000000002', 'Direct')$$,
  null, null, 'or its updates');
select throws_ok($$insert into public.project_milestones (project_id, title, due_on) values ('a1900000-0000-4000-b000-00000000000b', 'Direct', '2026-12-01')$$,
  null, null, 'or its milestones');
-- A row from A can't be moved into B (composite foreign keys keep children in place).
select throws_ok($$insert into public.tickets (project_id, stage_id, title) values ('a1900000-0000-4000-b000-00000000000a', 'a1900000-0000-4000-c000-00000000000b', 'Cross')$$,
  null, null, 'a ticket in A cannot point at B''s stage');
update public.projects set name = 'Hijacked' where id = 'a1900000-0000-4000-b000-00000000000b';
delete from public.project_files where project_id = 'a1900000-0000-4000-b000-00000000000b';
select pass('direct updates and deletes on B''s rows are filtered out by RLS (checked by the checksum)');

-- ---------------------------------------------------------------------------
-- A client of project A: project B, and every team function (26–51)
-- ---------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub":"a1900000-0000-4000-a000-000000000004","role":"authenticated"}', true);

select is((select count(*)::int from public.projects), 1, 'client A sees only project A');
select is((select count(*)::int from public.project_clients), 0, 'and no client list, not even their own project''s');
select is((select count(*)::int from public.portal_settings), 0, 'and no settings');
select is(public.portal_client_preview('NB-9991'), null, 'no preview of their own project (a team tool)');
select is((select count(*)::int from public.portal_search('Project')), 0, 'and nothing from the team search');

select throws_ok($$select public.portal_save_ticket('a1900000-0000-4000-b000-00000000000a', 'Client edit', '', 'todo', 'a1900000-0000-4000-c000-00000000000a', true, '[]', null, null, null, null)$$,
  null, null, 'client A cannot create a ticket, even in their project');
select throws_ok($$select public.portal_post_update('a1900000-0000-4000-b000-00000000000a', 'Client post', false, false, '{}')$$,
  null, null, 'or post an update');
select throws_ok($$select public.portal_set_project_health('a1900000-0000-4000-b000-00000000000a', 'on_track', null)$$,
  null, null, 'or set health');
select throws_ok($$select public.portal_add_client('a1900000-0000-4000-b000-00000000000a', 'friend@x.example', 'Friend', 'en', null)$$,
  null, null, 'or add someone to their project');
select throws_ok($$select public.portal_rotate_project_id('a1900000-0000-4000-b000-00000000000a')$$,
  null, null, 'or rotate its Project ID');
select throws_ok($$select * from public.portal_client_lockouts('a1900000-0000-4000-b000-00000000000a')$$,
  null, null, 'or list lockouts');
select throws_ok($$select public.portal_clear_lockout('a1900000-0000-4000-b000-00000000000a', 'clara@clienta.example')$$,
  null, null, 'or clear one');
select throws_ok($$select public.portal_log_invite_sent('a1900000-0000-4000-b000-00000000000a', 'clara@clienta.example')$$,
  null, null, 'or log an invite');
select throws_ok($$select public.portal_set_project_status('a1900000-0000-4000-b000-00000000000a', 'closed')$$,
  null, null, 'or archive their project');
select throws_ok($$select * from public.portal_delete_project('a1900000-0000-4000-b000-00000000000b', 'NB-9992')$$,
  null, null, 'or delete another');
select throws_ok($$select * from public.portal_team_overview()$$,
  null, null, 'or read the team overview');
select throws_ok($$select public.portal_set_team_role('a1900000-0000-4000-a000-000000000002', 'admin')$$,
  null, null, 'or change a role');
select throws_ok($$select public.portal_add_team_member('a1900000-0000-4000-a000-000000000004', 'Clara', 'admin')$$,
  null, null, 'or make themselves a teammate');
select throws_ok($$select public.portal_remove_team_member('a1900000-0000-4000-a000-000000000003')$$,
  null, null, 'or remove one');
select throws_ok($$select public.portal_check_team_invite('x@x.example')$$,
  null, null, 'or check an invite');
select throws_ok($$select * from public.portal_find_client_users('{beto@clientb.example}')$$,
  null, null, 'or look up other clients'' accounts');
select throws_ok($$select public.portal_next_project_id()$$,
  null, null, 'or reserve a Project ID');
select throws_ok($$select public.portal_create_project('X', 'X', 'a1900000-0000-4000-a000-000000000004', '2026-12-01', '2027-03-01', null, '[]', '[]')$$,
  null, null, 'or create a project');
select throws_ok($$select public.portal_save_settings((select now()), 3, 15, 30, true, true, null, '[]')$$,
  null, null, 'or save settings');
-- By design it answers null (no role) to anyone who isn't an active teammate, and
-- records nothing; the team sign-in action then treats them as not found.
select is(public.portal_complete_team_sign_in(), null, 'and completing a team sign-in gives them no role');
select throws_ok($$insert into public.team_members (user_id, name, email, role) values ('a1900000-0000-4000-a000-000000000004', 'Clara', 'clara@clienta.example', 'admin')$$,
  null, null, 'or insert themselves into the team directly');

-- ---------------------------------------------------------------------------
-- Nothing changed (52)
-- ---------------------------------------------------------------------------

reset role;
select is(pg_temp.project_b_checksum(), (select checksum from before_sweep),
  'project B, the settings and the team are exactly as before the sweep');

select * from finish();
rollback;
