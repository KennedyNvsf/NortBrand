-- 5 writes per ip_hash per hour across both functions, and 100 public writes per hour in
-- total. Rejections use SQLSTATE PT429, which PostgREST returns as HTTP 429.
begin;
create extension if not exists pgtap with schema extensions;

-- Start from empty tables (seed data included); the rollback at the end restores them.
truncate public.consultation_requests, public.newsletter_subscribers, private.write_events;

select plan(9);

create function pg_temp.ip(n int) returns text language sql as $$
  select lpad(to_hex(n), 64, '0');
$$;
create function pg_temp.submit(p_ip_hash text) returns uuid language sql as $$
  select public.submit_consultation_request(
    'Ana', 'ana@example.com', null, 'web-design', 'We need a new website.', 'en', p_ip_hash);
$$;
grant execute on function pg_temp.ip, pg_temp.submit to anon;

set local role anon;

-- Five writes from one ip_hash, mixing both functions.
select lives_ok($$select pg_temp.submit(pg_temp.ip(1))$$, 'write 1 (request)');
select lives_ok($$select pg_temp.submit(pg_temp.ip(1))$$, 'write 2 (request)');
select lives_ok($$select pg_temp.submit(pg_temp.ip(1))$$, 'write 3 (request)');
select lives_ok($$select public.subscribe_newsletter('ana@example.com', 'en', pg_temp.ip(1))$$, 'write 4 (newsletter)');
select lives_ok($$select public.subscribe_newsletter('ana@example.com', 'en', pg_temp.ip(1))$$, 'write 5 (newsletter, already pending)');

select throws_ok($$select pg_temp.submit(pg_temp.ip(1))$$, 'PT429', 'rate_limited', 'the 6th write from one ip_hash within an hour is rejected');
select lives_ok($$select pg_temp.submit(pg_temp.ip(2))$$, 'another ip_hash can still write');

reset role;

-- Writes older than an hour no longer count, and are deleted.
update private.write_events set created_at = now() - interval '61 minutes' where ip_hash = pg_temp.ip(1);
set local role anon;
select lives_ok($$select pg_temp.submit(pg_temp.ip(1))$$, 'the same ip_hash can write again after an hour');
reset role;

-- Global ceiling: 100 writes in the last hour, from any ip_hash.
insert into private.write_events (ip_hash, action)
select pg_temp.ip(1000 + n), 'consultation'
from generate_series(1, 100 - (select count(*)::int from private.write_events)) as n;

set local role anon;
select throws_ok($$select pg_temp.submit(pg_temp.ip(9999))$$, 'PT429', 'rate_limited', 'the 101st public write within an hour is rejected');
reset role;

select * from finish();
rollback;
