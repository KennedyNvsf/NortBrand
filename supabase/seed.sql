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
