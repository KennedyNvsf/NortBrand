-- Project updates, "Needs you" and the daily digest (#139; Figma TM-03 531:235, TM-10
-- 544:1176, TM-13 546:583).
--
-- Posting, editing and deleting are SECURITY INVOKER: RLS decides (works_on_project),
-- the author is the signed-in teammate, and linked tickets must belong to the same
-- project (update_tickets' composite foreign keys). Editing marks the post "edited";
-- deleting hides it from the client feed (deleted_at) and keeps it for the team.
--
-- The daily digest runs from Vercel Cron with no user session, and the service-role key
-- is never used for table reads (ADR-002/ADR-009). So it goes through one SECURITY
-- DEFINER function, safe to grant to anon because it checks the cron secret in SQL
-- (Vault `portal_cron_secret`, equal to CRON_SECRET in the app). It CLAIMS each client's
-- digest for today before returning it: a unique (client, day) row means a client gets
-- at most one digest a day, however often the cron runs or retries. A failed send is not
-- retried that day (logged without personal data). "New" means posted since that
-- client's last digest (or since their invite), live (not deleted), on an active project.

create table private.portal_digest_log (
  client_id uuid not null references public.project_clients (id) on delete cascade,
  day date not null,
  sent_at timestamptz not null default now(),
  primary key (client_id, day)
);

comment on table private.portal_digest_log is
  'One row per client per Lisbon day a digest was claimed (#139). The key makes the digest at-most-once.';

create function private.portal_cron_secret()
returns text
language plpgsql
stable
set search_path = ''
as $$
declare
  secret text;
begin
  select decrypted_secret into secret
  from vault.decrypted_secrets
  where name = 'portal_cron_secret';

  if secret is null or char_length(secret) < 32 then
    raise exception 'portal_cron_secret is missing from Vault or shorter than 32 characters';
  end if;

  return secret;
end;
$$;

revoke all on function private.portal_cron_secret() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Posting (team, SECURITY INVOKER)
-- ---------------------------------------------------------------------------

create function public.portal_post_update(
  p_project_id uuid,
  p_body text,
  p_highlight boolean,
  p_needs_client boolean,
  p_ticket_ids uuid[] default '{}'
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  posted uuid;
begin
  if not private.works_on_project(p_project_id) then
    raise exception 'not_found' using errcode = 'P0002';
  end if;

  insert into public.updates (project_id, author_id, body, highlight, needs_client)
  values (p_project_id, (select auth.uid()), btrim(p_body), p_highlight, p_needs_client)
  returning id into posted;

  insert into public.update_tickets (project_id, update_id, ticket_id)
  select p_project_id, posted, ticket from unnest(coalesce(p_ticket_ids, '{}')) as ticket;

  return posted;
end;
$$;

create function public.portal_edit_update(
  p_update_id uuid,
  p_body text,
  p_highlight boolean,
  p_needs_client boolean,
  p_ticket_ids uuid[] default '{}'
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  project uuid;
begin
  update public.updates
  set body = btrim(p_body),
      highlight = p_highlight,
      needs_client = p_needs_client,
      edited_at = now()
  where id = p_update_id and deleted_at is null
  returning project_id into project;

  if project is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;

  delete from public.update_tickets where update_id = p_update_id;
  insert into public.update_tickets (project_id, update_id, ticket_id)
  select project, p_update_id, ticket from unnest(coalesce(p_ticket_ids, '{}')) as ticket;
end;
$$;

create function public.portal_delete_update(p_update_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.updates set deleted_at = now()
  where id = p_update_id and deleted_at is null;
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- The daily digest (cron, SECURITY DEFINER behind the cron secret)
-- ---------------------------------------------------------------------------

create function public.portal_claim_digests(p_secret text)
returns table (
  client_email text,
  locale text,
  project_name text,
  public_id text,
  updates jsonb
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  today date := private.lisbon_today();
begin
  if p_secret is null
     or extensions.digest(p_secret, 'sha256') <> extensions.digest(private.portal_cron_secret(), 'sha256') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if not coalesce((select s.daily_digest from public.portal_settings s where s.id), false) then
    return;
  end if;

  return query
  with candidates as (
    select
      c.id as client_id,
      c.email,
      c.locale,
      p.id as project_id,
      p.name,
      p.public_id,
      coalesce(
        (select max(l.sent_at) from private.portal_digest_log l where l.client_id = c.id),
        c.invited_at
      ) as since
    from public.project_clients c
    join public.projects p on p.id = c.project_id
    where p.status = 'active'
      and c.status in ('invited', 'active')
      and c.user_id is not null
  ),
  due as (
    select k.* from candidates k
    where exists (
      select 1 from public.updates u
      where u.project_id = k.project_id and u.deleted_at is null and u.created_at > k.since
    )
  ),
  claimed as (
    insert into private.portal_digest_log (client_id, day)
    select d.client_id, today from due d
    on conflict (client_id, day) do nothing
    returning private.portal_digest_log.client_id
  )
  select
    d.email,
    d.locale,
    d.name,
    d.public_id,
    (
      select jsonb_agg(
        jsonb_build_object(
          'author', m.name,
          'body', u.body,
          'created_at', u.created_at,
          'highlight', u.highlight,
          'needs_client', u.needs_client
        )
        order by u.created_at
      )
      from public.updates u
      left join public.team_members m on m.user_id = u.author_id
      where u.project_id = d.project_id and u.deleted_at is null and u.created_at > d.since
    )
  from due d
  join claimed on claimed.client_id = d.client_id;
end;
$$;

revoke all on function public.portal_post_update(uuid, text, boolean, boolean, uuid[]) from public, anon, authenticated;
revoke all on function public.portal_edit_update(uuid, text, boolean, boolean, uuid[]) from public, anon, authenticated;
revoke all on function public.portal_delete_update(uuid) from public, anon, authenticated;
revoke all on function public.portal_claim_digests(text) from public, anon, authenticated;

grant execute on function public.portal_post_update(uuid, text, boolean, boolean, uuid[]) to authenticated;
grant execute on function public.portal_edit_update(uuid, text, boolean, boolean, uuid[]) to authenticated;
grant execute on function public.portal_delete_update(uuid) to authenticated;
-- Safe for the public key: it refuses anything without the cron secret.
grant execute on function public.portal_claim_digests(text) to anon;
