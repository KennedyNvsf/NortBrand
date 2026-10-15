-- submit_consultation_request and mark_consultation_notified, called as anon.
begin;
create extension if not exists pgtap with schema extensions;

-- Start from empty tables (seed data included); the rollback at the end restores them.
truncate public.consultation_requests, public.newsletter_subscribers, private.write_events;

select plan(24);

-- Valid input, called through a helper so each case changes one field.
create function pg_temp.submit(
  p_name text default 'Ana Silva',
  p_email text default 'ana@example.com',
  p_phone text default '+351 912 345 678',
  p_service text default 'web-design',
  p_message text default 'We need a new studio website.',
  p_locale text default 'pt',
  p_ip_hash text default repeat('a', 64)
)
returns uuid
language sql
as $$
  select public.submit_consultation_request(p_name, p_email, p_phone, p_service, p_message, p_locale, p_ip_hash);
$$;
grant execute on function pg_temp.submit to anon;

-- Each call uses its own ip_hash, so the rate limit (04_rate_limit) stays out of the way.
create function pg_temp.ip(n int) returns text language sql as $$
  select lpad(to_hex(n), 64, '0');
$$;
grant execute on function pg_temp.ip to anon;

set local role anon;

select isnt(pg_temp.submit(p_ip_hash => pg_temp.ip(1)), null, 'valid input returns the new id');
select isnt(pg_temp.submit(p_phone => null, p_ip_hash => pg_temp.ip(2)), null, 'phone is optional');
select isnt(pg_temp.submit(p_phone => '  ', p_ip_hash => pg_temp.ip(3)), null, 'a blank phone is accepted');

-- Every CHECK violation is rejected with 23514.
select throws_ok(format('select pg_temp.submit(p_name => %L, p_ip_hash => pg_temp.ip(10))', '   '), '23514', null, 'blank name');
select throws_ok(format('select pg_temp.submit(p_name => %L, p_ip_hash => pg_temp.ip(11))', repeat('a', 121)), '23514', null, 'name over 120 characters');
select throws_ok(format('select pg_temp.submit(p_email => %L, p_ip_hash => pg_temp.ip(12))', 'Ana@Example.com'), '23514', null, 'email not lowercase');
select throws_ok(format('select pg_temp.submit(p_email => %L, p_ip_hash => pg_temp.ip(13))', 'not-an-email'), '23514', null, 'email without @ and domain');
select throws_ok(format('select pg_temp.submit(p_email => %L, p_ip_hash => pg_temp.ip(14))', repeat('a', 250) || '@x.pt'), '23514', null, 'email over 254 characters');
select throws_ok(format('select pg_temp.submit(p_phone => %L, p_ip_hash => pg_temp.ip(15))', '12345'), '23514', null, 'phone too short');
select throws_ok(format('select pg_temp.submit(p_phone => %L, p_ip_hash => pg_temp.ip(16))', 'call me'), '23514', null, 'phone with letters');
select throws_ok(format('select pg_temp.submit(p_service => %L, p_ip_hash => pg_temp.ip(17))', 'branding'), '23514', null, 'unknown service slug');
select throws_ok(format('select pg_temp.submit(p_message => %L, p_ip_hash => pg_temp.ip(18))', 'Too short'), '23514', null, 'message under 10 characters');
select throws_ok(format('select pg_temp.submit(p_message => %L, p_ip_hash => pg_temp.ip(19))', '          x'), '23514', null, 'message under 10 characters once trimmed');
select throws_ok(format('select pg_temp.submit(p_message => %L, p_ip_hash => pg_temp.ip(20))', repeat('a', 5001)), '23514', null, 'message over 5000 characters');
select throws_ok(format('select pg_temp.submit(p_locale => %L, p_ip_hash => pg_temp.ip(21))', 'es'), '23514', null, 'unsupported locale');
select throws_ok(format('select pg_temp.submit(p_ip_hash => %L)', 'not-a-hash'), '23514', null, 'ip_hash not a SHA-256 hex digest');
select throws_ok('select pg_temp.submit(p_name => null, p_ip_hash => pg_temp.ip(22))', '23502', null, 'missing name');

reset role;

-- Defaults set by the database, not the caller.
select is(
  (select phone from public.consultation_requests where ip_hash = lpad(to_hex(3), 64, '0')),
  null,
  'a blank phone is stored as null'
);
select results_eq(
  $$select status, consent_at = now(), notified_at is null from public.consultation_requests where ip_hash = lpad(to_hex(1), 64, '0')$$,
  $$values ('new'::text, true, true)$$,
  'a new request is status new, consented now, not yet notified'
);

-- mark_consultation_notified: fresh rows once; never old or already-notified rows.
create temp table ids as
  select id, ip_hash from public.consultation_requests;
grant select on ids to anon;

update public.consultation_requests
set created_at = now() - interval '11 minutes'
where ip_hash = pg_temp.ip(2);

set local role anon;
select ok(public.mark_consultation_notified((select id from ids where ip_hash = pg_temp.ip(1))), 'marks a fresh request as notified');
select ok(not public.mark_consultation_notified((select id from ids where ip_hash = pg_temp.ip(1))), 'ignores an already-notified request');
select ok(not public.mark_consultation_notified((select id from ids where ip_hash = pg_temp.ip(2))), 'ignores a request older than 10 minutes');
select ok(not public.mark_consultation_notified(gen_random_uuid()), 'ignores an unknown id');
reset role;

select is(
  (select notified_at is null from public.consultation_requests where ip_hash = pg_temp.ip(2)),
  true,
  'the old request is still unnotified'
);

select * from finish();
rollback;
