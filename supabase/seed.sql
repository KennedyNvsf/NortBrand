-- Development data only. Runs after migrations on `pnpm db:reset` (local stack).
-- Never run against a hosted project. All addresses use the reserved example.com domain.

insert into public.consultation_requests
  (created_at, name, email, phone, service, message, locale, consent_at, status, ip_hash, notified_at)
values
  (now() - interval '3 days', 'Ana Silva', 'ana@example.com', '+351 912 345 678', 'web-design',
   'We are opening a second studio in Porto and need a bilingual site.', 'pt',
   now() - interval '3 days', 'contacted', repeat('a', 64), now() - interval '3 days'),
  (now() - interval '1 day', 'James Carter', 'james@example.com', null, 'website-maintenance',
   'Our current site is slow and nobody updates it. Can you take it over?', 'en',
   now() - interval '1 day', 'new', repeat('b', 64), now() - interval '1 day'),
  (now() - interval '2 hours', 'Marta Costa', 'marta@example.com', null, 'content-writing',
   'Looking for help with blog posts in Portuguese and English.', 'pt',
   now() - interval '2 hours', 'new', repeat('c', 64), null);

insert into public.newsletter_subscribers
  (email, locale, status, consent_at, confirmed_at, unsubscribed_at)
values
  ('ana@example.com', 'pt', 'subscribed', now() - interval '10 days', now() - interval '10 days', null),
  ('james@example.com', 'en', 'pending', date_trunc('second', now()), null, null),
  ('old@example.com', 'en', 'unsubscribed', now() - interval '60 days', now() - interval '60 days', now() - interval '5 days');

-- ---------------------------------------------------------------------------
-- Portal demo (#130): the Atlântico Café project from Figma 12 Portal — Client.
-- Auth users are created directly here, for the local stack only. Every address is on
-- example.com; the Project ID NB-4821 matches the designs.
-- ---------------------------------------------------------------------------

insert into auth.users
  (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
   raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
   confirmation_token, recovery_token, email_change_token_new, email_change)
values
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-000000000001', 'authenticated', 'authenticated',
   'ana.costa@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-000000000002', 'authenticated', 'authenticated',
   'tiago.sousa@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-000000000003', 'authenticated', 'authenticated',
   'rui.matos@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-000000000011', 'authenticated', 'authenticated',
   'joao@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');

insert into public.team_members (user_id, name, email, role) values
  ('00000000-0000-4000-a000-000000000001', 'Ana Costa', 'ana.costa@example.com', 'admin'),
  ('00000000-0000-4000-a000-000000000002', 'Tiago Sousa', 'tiago.sousa@example.com', 'member'),
  ('00000000-0000-4000-a000-000000000003', 'Rui Matos', 'rui.matos@example.com', 'member');

insert into public.projects
  (id, public_id, name, client_name, starts_on, launches_on, health, staging_url, lead_id)
values
  ('00000000-0000-4000-b000-000000000001', 'NB-4821', 'Atlântico Café website', 'Atlântico Café',
   '2026-10-01', '2027-02-12', 'on_track', 'https://staging.example.com', '00000000-0000-4000-a000-000000000001');

insert into public.project_team (project_id, user_id, role_label, position) values
  ('00000000-0000-4000-b000-000000000001', '00000000-0000-4000-a000-000000000001', 'Project lead', 0),
  ('00000000-0000-4000-b000-000000000001', '00000000-0000-4000-a000-000000000002', 'Design', 1),
  ('00000000-0000-4000-b000-000000000001', '00000000-0000-4000-a000-000000000003', 'Development', 2);

insert into public.project_clients (project_id, email, name, locale, user_id, status, last_sign_in_at) values
  ('00000000-0000-4000-b000-000000000001', 'joao@example.com', 'João Marques', 'pt',
   '00000000-0000-4000-a000-000000000011', 'active', now() - interval '1 day');

insert into public.stages (id, project_id, position, name, starts_on, ends_on, completed_at) values
  ('00000000-0000-4000-c000-000000000001', '00000000-0000-4000-b000-000000000001', 1, 'Discovery', '2026-10-01', '2026-10-10', '2026-10-10'),
  ('00000000-0000-4000-c000-000000000002', '00000000-0000-4000-b000-000000000001', 2, 'Design', '2026-10-13', '2026-10-31', '2026-10-31'),
  ('00000000-0000-4000-c000-000000000003', '00000000-0000-4000-b000-000000000001', 3, 'Development', '2026-11-03', '2026-12-15', null),
  ('00000000-0000-4000-c000-000000000004', '00000000-0000-4000-b000-000000000001', 4, 'Review', '2026-12-16', '2027-01-09', null),
  ('00000000-0000-4000-c000-000000000005', '00000000-0000-4000-b000-000000000001', 5, 'Launch', '2027-02-12', '2027-02-12', null),
  ('00000000-0000-4000-c000-000000000006', '00000000-0000-4000-b000-000000000001', 6, 'Support', '2027-02-13', null, null);

insert into public.tickets
  (id, project_id, stage_id, title, description, status, owner_id, due_on, client_visible, waiting_on_client)
values
  ('00000000-0000-4000-d000-000000000001', '00000000-0000-4000-b000-000000000001', '00000000-0000-4000-c000-000000000003',
   'Menu photos for the menu page', 'We need the menu photos to finish the menu page.', 'blocked',
   '00000000-0000-4000-a000-000000000001', '2026-11-14', true, true),
  ('00000000-0000-4000-d000-000000000002', '00000000-0000-4000-b000-000000000001', '00000000-0000-4000-c000-000000000003',
   'Home page build', 'Building the home page from the approved design: hero, menu highlights, story and the reservation call to action.',
   'in_progress', '00000000-0000-4000-a000-000000000003', '2026-11-20', true, false),
  ('00000000-0000-4000-d000-000000000003', '00000000-0000-4000-b000-000000000001', '00000000-0000-4000-c000-000000000003',
   'Home page copy review', '', 'in_review', '00000000-0000-4000-a000-000000000001', '2026-11-18', true, false),
  ('00000000-0000-4000-d000-000000000004', '00000000-0000-4000-b000-000000000001', '00000000-0000-4000-c000-000000000003',
   'Reservation form', '', 'todo', '00000000-0000-4000-a000-000000000003', '2026-12-02', true, false),
  ('00000000-0000-4000-d000-000000000005', '00000000-0000-4000-b000-000000000001', '00000000-0000-4000-c000-000000000003',
   'Set up analytics', '', 'todo', '00000000-0000-4000-a000-000000000003', '2026-12-08', false, false),
  ('00000000-0000-4000-d000-000000000006', '00000000-0000-4000-b000-000000000001', '00000000-0000-4000-c000-000000000002',
   'Mobile designs: Menu and Contact', '', 'done', '00000000-0000-4000-a000-000000000002', '2026-11-12', true, false);

insert into public.ticket_checklist_items (project_id, ticket_id, position, label, done) values
  ('00000000-0000-4000-b000-000000000001', '00000000-0000-4000-d000-000000000002', 0, 'Layout and grid', true),
  ('00000000-0000-4000-b000-000000000001', '00000000-0000-4000-d000-000000000002', 1, 'Hero with photography', true),
  ('00000000-0000-4000-b000-000000000001', '00000000-0000-4000-d000-000000000002', 2, 'Menu highlights', true),
  ('00000000-0000-4000-b000-000000000001', '00000000-0000-4000-d000-000000000002', 3, 'Story section', false),
  ('00000000-0000-4000-b000-000000000001', '00000000-0000-4000-d000-000000000002', 4, 'Animations', false);

insert into public.updates (project_id, author_id, body, highlight, needs_client, created_at) values
  ('00000000-0000-4000-b000-000000000001', '00000000-0000-4000-a000-000000000001',
   'Development has started. We''ll share progress here every few days.', false, false, '2026-11-03 09:00+00'),
  ('00000000-0000-4000-b000-000000000001', '00000000-0000-4000-a000-000000000001',
   'We need the menu photos to finish the menu page. Could you send them this week? Any format works.', false, true, '2026-11-09 09:12+00'),
  ('00000000-0000-4000-b000-000000000001', '00000000-0000-4000-a000-000000000003',
   'The home page is live on staging. Hero and menu highlights are in; the story section and animations come next.', true, false, '2026-11-11 17:45+00'),
  ('00000000-0000-4000-b000-000000000001', '00000000-0000-4000-a000-000000000002',
   'Finished the mobile designs for the Menu and Contact pages. They''re in the design file if you''d like a look.', false, false, '2026-11-12 10:20+00');

insert into public.project_files (id, project_id, storage_path, name, size_bytes, content_type, shared, uploaded_by) values
  ('00000000-0000-4000-e000-000000000001', '00000000-0000-4000-b000-000000000001',
   'projects/00000000-0000-4000-b000-000000000001/00000000-0000-4000-e000-000000000001',
   'Brand guidelines.pdf', 2400000, 'application/pdf', true, '00000000-0000-4000-a000-000000000002'),
  ('00000000-0000-4000-e000-000000000002', '00000000-0000-4000-b000-000000000001',
   'projects/00000000-0000-4000-b000-000000000001/00000000-0000-4000-e000-000000000002',
   'Internal estimate.pdf', 180000, 'application/pdf', false, '00000000-0000-4000-a000-000000000001');
