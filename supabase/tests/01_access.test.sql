-- The public API roles can read, change or delete nothing, and may only execute the
-- public write functions (ADR-002).
begin;
create extension if not exists pgtap with schema extensions;

-- Start from empty tables (seed data included); the rollback at the end restores them.
truncate public.consultation_requests, public.newsletter_subscribers, private.write_events;

select plan(25);

-- RLS is on, with no policies.
select ok(relrowsecurity, format('RLS is enabled on %s', oid::regclass))
from pg_class
where oid in (
  'public.consultation_requests'::regclass,
  'public.newsletter_subscribers'::regclass,
  'private.write_events'::regclass
);

select is(
  (select count(*)::int from pg_policies
   where schemaname in ('public', 'private')
     and tablename in ('consultation_requests', 'newsletter_subscribers', 'write_events')),
  0,
  'no RLS policies exist on the tables'
);

-- One row of each, written as the owner, so a denied read is not an empty result.
insert into public.consultation_requests
  (name, email, service, message, locale, consent_at, ip_hash)
values
  ('Ana', 'ana@example.com', 'web-design', 'A new website, please.', 'en', now(), repeat('a', 64));
insert into public.newsletter_subscribers (email, locale, consent_at)
values ('ana@example.com', 'en', now());

-- anon and authenticated: no select, insert, update or delete.
set local role anon;
select throws_ok('select * from public.consultation_requests', '42501', null, 'anon cannot select consultation_requests');
select throws_ok('select * from public.newsletter_subscribers', '42501', null, 'anon cannot select newsletter_subscribers');
select throws_ok($$update public.consultation_requests set status = 'spam'$$, '42501', null, 'anon cannot update consultation_requests');
select throws_ok($$update public.newsletter_subscribers set status = 'subscribed'$$, '42501', null, 'anon cannot update newsletter_subscribers');
select throws_ok('delete from public.consultation_requests', '42501', null, 'anon cannot delete consultation_requests');
select throws_ok('delete from public.newsletter_subscribers', '42501', null, 'anon cannot delete newsletter_subscribers');
select throws_ok(
  $$insert into public.newsletter_subscribers (email, locale, consent_at) values ('x@example.com', 'en', now())$$,
  '42501', null, 'anon cannot insert into newsletter_subscribers directly'
);
select throws_ok('select * from private.write_events', '42501', null, 'anon cannot reach the private schema');
reset role;

set local role authenticated;
select throws_ok('select * from public.consultation_requests', '42501', null, 'authenticated cannot select consultation_requests');
select throws_ok('select * from public.newsletter_subscribers', '42501', null, 'authenticated cannot select newsletter_subscribers');
select throws_ok($$update public.consultation_requests set status = 'spam'$$, '42501', null, 'authenticated cannot update consultation_requests');
select throws_ok('delete from public.newsletter_subscribers', '42501', null, 'authenticated cannot delete newsletter_subscribers');
reset role;

-- Function grants: anon only, and the private helpers for nobody.
select ok(has_function_privilege('anon', 'public.submit_consultation_request(text, text, text, text, text, text, text)', 'execute'), 'anon can execute submit_consultation_request');
select ok(has_function_privilege('anon', 'public.mark_consultation_notified(uuid)', 'execute'), 'anon can execute mark_consultation_notified');
select ok(has_function_privilege('anon', 'public.subscribe_newsletter(text, text, text)', 'execute'), 'anon can execute subscribe_newsletter');
select ok(has_function_privilege('anon', 'public.confirm_newsletter(text, bigint, text)', 'execute'), 'anon can execute confirm_newsletter');
select ok(has_function_privilege('anon', 'public.unsubscribe_newsletter(text, text)', 'execute'), 'anon can execute unsubscribe_newsletter');
select ok(not has_function_privilege('authenticated', 'public.submit_consultation_request(text, text, text, text, text, text, text)', 'execute'), 'authenticated cannot execute submit_consultation_request');
select ok(not has_function_privilege('authenticated', 'public.subscribe_newsletter(text, text, text)', 'execute'), 'authenticated cannot execute subscribe_newsletter');
select ok(not has_function_privilege('anon', 'private.newsletter_token(text)', 'execute'), 'anon cannot execute private.newsletter_token');

-- Every public function is SECURITY DEFINER with an empty search_path.
select is(
  (select count(*)::int from pg_proc
   where pronamespace = 'public'::regnamespace
     and proname in ('submit_consultation_request', 'mark_consultation_notified',
                     'subscribe_newsletter', 'confirm_newsletter', 'unsubscribe_newsletter')
     and prosecdef
     and proconfig @> array['search_path=""']),
  5,
  'all five public functions are SECURITY DEFINER with search_path = ''''');

select * from finish();
rollback;
