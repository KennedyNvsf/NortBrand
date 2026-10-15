-- Double opt-in: subscribe_newsletter, confirm_newsletter and unsubscribe_newsletter.
begin;
create extension if not exists pgtap with schema extensions;

-- Start from empty tables (seed data included); the rollback at the end restores them.
truncate public.consultation_requests, public.newsletter_subscribers, private.write_events;

select plan(27);

-- The same secret and vectors as the TypeScript signer's tests, so both sides agree on
-- the token format.
delete from vault.secrets where name = 'newsletter_token_secret';
select vault.create_secret('test-secret-0123456789abcdef0123456789', 'newsletter_token_secret');

select is(
  private.newsletter_token('confirm|ana@example.com|1700000000'),
  'QGarSH8806G_BeOERWNKMVOnGN5hhKLabFIabU3Fngo',
  'confirm token matches the fixed test vector'
);
select is(
  private.newsletter_token('unsubscribe|ana@example.com'),
  'QcQyEaQAdgoas-1uK3mWvuMc9xqCuR6myajF0Nk-SDE',
  'unsubscribe token matches the fixed test vector'
);

create function pg_temp.ip(n int) returns text language sql as $$
  select lpad(to_hex(n), 64, '0');
$$;
-- Token helpers run as the owner: anon has no access to the private schema.
create function pg_temp.confirm_token(p_email text, p_issued_at bigint) returns text
language sql security definer as $$
  select private.newsletter_token('confirm|' || p_email || '|' || p_issued_at);
$$;
create function pg_temp.unsubscribe_token(p_email text) returns text
language sql security definer as $$
  select private.newsletter_token('unsubscribe|' || p_email);
$$;
create function pg_temp.row_of(p_email text) returns text language sql as $$
  select row(status, locale, consent_at, confirmed_at, unsubscribed_at)::text
  from public.newsletter_subscribers where email = p_email;
$$;
grant execute on function pg_temp.ip, pg_temp.confirm_token, pg_temp.unsubscribe_token, pg_temp.row_of to anon;
create temp table issued (email text primary key, at bigint);
grant all on issued to anon;

-- Subscribe.
set local role anon;
insert into issued values ('ana@example.com', public.subscribe_newsletter('ana@example.com', 'pt', pg_temp.ip(1)));
reset role;

select is(
  (select at from issued where email = 'ana@example.com'),
  extract(epoch from date_trunc('second', now()))::bigint,
  'subscribe returns the issue time in whole seconds'
);
select results_eq(
  $$select status, locale, extract(epoch from consent_at)::bigint from public.newsletter_subscribers where email = 'ana@example.com'$$,
  $$select 'pending'::text, 'pt'::text, at from issued where email = 'ana@example.com'$$,
  'a new subscriber is pending with consent at the issue time'
);

-- CHECK violations.
set local role anon;
select throws_ok($$select public.subscribe_newsletter('Ana@Example.com', 'en', pg_temp.ip(2))$$, '23514', null, 'email not lowercase');
select throws_ok($$select public.subscribe_newsletter('nope', 'en', pg_temp.ip(3))$$, '23514', null, 'invalid email');
select throws_ok($$select public.subscribe_newsletter('bo@example.com', 'fr', pg_temp.ip(4))$$, '23514', null, 'unsupported locale');
select throws_ok($$select public.subscribe_newsletter('bo@example.com', 'en', 'abc')$$, '23514', null, 'invalid ip_hash');

-- Confirm: wrong, missing and forged tokens fail and change nothing.
select ok(not public.confirm_newsletter('ana@example.com', (select at from issued where email = 'ana@example.com'), 'forged'), 'a wrong token is rejected');
select ok(not public.confirm_newsletter('ana@example.com', (select at from issued where email = 'ana@example.com'), null), 'a missing token is rejected');
select ok(
  not public.confirm_newsletter('bo@example.com', (select at from issued where email = 'ana@example.com'),
    pg_temp.confirm_token('ana@example.com', (select at from issued where email = 'ana@example.com'))),
  'a token for another email is rejected'
);
reset role;
select is((select status from public.newsletter_subscribers where email = 'ana@example.com'), 'pending', 'still pending after rejected tokens');

-- Expired and future tokens fail even when correctly signed.
set local role anon;
select ok(
  not public.confirm_newsletter('ana@example.com', extract(epoch from now() - interval '8 days')::bigint,
    pg_temp.confirm_token('ana@example.com', extract(epoch from now() - interval '8 days')::bigint)),
  'a token older than 7 days is rejected'
);
select ok(
  not public.confirm_newsletter('ana@example.com', extract(epoch from now() + interval '1 hour')::bigint,
    pg_temp.confirm_token('ana@example.com', extract(epoch from now() + interval '1 hour')::bigint)),
  'a token issued in the future is rejected'
);
reset role;

-- A newer subscription supersedes the old link.
update public.newsletter_subscribers set consent_at = consent_at - interval '1 hour' where email = 'ana@example.com';
update issued set at = at - 3600 where email = 'ana@example.com';
create temp table old_link as select at from issued where email = 'ana@example.com';
grant select on old_link to anon;

set local role anon;
update issued set at = public.subscribe_newsletter('ana@example.com', 'en', pg_temp.ip(5)) where email = 'ana@example.com';
select ok(
  not public.confirm_newsletter('ana@example.com', (select at from old_link), pg_temp.confirm_token('ana@example.com', (select at from old_link))),
  'a superseded link is rejected after subscribing again'
);
reset role;
select is((select locale from public.newsletter_subscribers where email = 'ana@example.com'), 'en', 'subscribing again while pending refreshes the locale');

-- The current link confirms.
set local role anon;
select ok(
  public.confirm_newsletter('ana@example.com', (select at from issued where email = 'ana@example.com'),
    pg_temp.confirm_token('ana@example.com', (select at from issued where email = 'ana@example.com'))),
  'the current link confirms'
);
reset role;
select results_eq(
  $$select status, confirmed_at = now() from public.newsletter_subscribers where email = 'ana@example.com'$$,
  $$values ('subscribed'::text, true)$$,
  'the subscriber is now subscribed'
);

-- Subscribing an already subscribed email changes nothing and looks the same.
create temp table before as select pg_temp.row_of('ana@example.com') as r;
set local role anon;
select is(
  public.subscribe_newsletter('ana@example.com', 'pt', pg_temp.ip(6)),
  extract(epoch from date_trunc('second', now()))::bigint,
  'subscribing a subscribed email returns an issue time like any other'
);
reset role;
select is(pg_temp.row_of('ana@example.com'), (select r from before), 'subscribing a subscribed email changes nothing');

set local role anon;
select ok(
  public.confirm_newsletter('ana@example.com', (select at from issued where email = 'ana@example.com'),
    pg_temp.confirm_token('ana@example.com', (select at from issued where email = 'ana@example.com'))),
  'confirming again returns true'
);

-- Unsubscribe.
select ok(not public.unsubscribe_newsletter('ana@example.com', 'forged'), 'unsubscribe rejects a wrong token');
select ok(not public.unsubscribe_newsletter('ana@example.com', null), 'unsubscribe rejects a missing token');
reset role;
select is((select status from public.newsletter_subscribers where email = 'ana@example.com'), 'subscribed', 'still subscribed after rejected unsubscribes');

set local role anon;
select ok(public.unsubscribe_newsletter('ana@example.com', 'QcQyEaQAdgoas-1uK3mWvuMc9xqCuR6myajF0Nk-SDE'), 'unsubscribe accepts the valid token');
reset role;
select results_eq(
  $$select status, unsubscribed_at = now() from public.newsletter_subscribers where email = 'ana@example.com'$$,
  $$values ('unsubscribed'::text, true)$$,
  'the subscriber is now unsubscribed'
);

set local role anon;
select ok(
  public.unsubscribe_newsletter('nobody@example.com', pg_temp.unsubscribe_token('nobody@example.com')),
  'a valid token for an unknown email also returns true'
);

select * from finish();
rollback;
