-- Client and Team Portal: schema, constraints and row-level security (ADR-009, #130).
--
-- The tenant is the project. RLS enforces who sees what; server actions check again.
--   * A client (an auth user listed as an active client of an open project) reads only
--     that project, and within it only client-visible tickets and their checklists,
--     shared files, live updates, its stages and its team.
--   * Any active team member reads and works on every project (a small studio; the lead
--     decided team access is by invitation, 2026-11-13). Creating and deleting projects,
--     managing client access, the team and settings are admin-only.
--   * anon gets nothing. Marketing tables keep ADR-002's model and are untouched.
-- Composite foreign keys keep every child row inside its project, so a client- or
-- team-supplied id can never join rows from two projects.

-- ---------------------------------------------------------------------------
-- Helpers used by defaults, triggers and policies
-- ---------------------------------------------------------------------------

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- Teammates. One row per auth user who works at NortBrand.
create table public.team_members (
  user_id uuid primary key references auth.users (id) on delete restrict,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  email text not null unique
    check (
      email = lower(email)
      and char_length(email) <= 254
      and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
    ),
  role text not null default 'member' check (role in ('admin', 'member')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.team_members is
  'NortBrand teammates (portal). Created by invitation only (ADR-009); removing someone sets active = false.';

-- Workspace settings: a single row (Settings, TM-13).
create table public.portal_settings (
  id boolean primary key default true check (id),
  -- Off (null) until NortBrand has mailboxes on its own domain (ADR-009 § 3).
  allowed_team_domain text
    check (allowed_team_domain ~ '^[a-z0-9-]+(\.[a-z0-9-]+)+$'),
  code_max_tries smallint not null default 3 check (code_max_tries between 1 and 10),
  lockout_minutes smallint not null default 15 check (lockout_minutes between 1 and 1440),
  session_days smallint not null default 30 check (session_days between 1 and 90),
  daily_digest boolean not null default true,
  notify_first_client_sign_in boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.portal_settings (id) values (true);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  -- The Project ID clients sign in with. Generated, never typed (TM-04); rotated by a
  -- function (#141), never by a direct update.
  public_id text not null unique check (public_id ~ '^NB-[0-9]{4}$'),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  client_name text not null check (char_length(btrim(client_name)) between 1 and 120),
  starts_on date not null,
  launches_on date not null,
  health text not null default 'on_track'
    check (health in ('on_track', 'at_risk', 'waiting_on_client')),
  status text not null default 'active' check (status in ('active', 'closed')),
  staging_url text check (staging_url ~ '^https://[^[:space:]]+$' and char_length(staging_url) <= 500),
  lead_id uuid not null references public.team_members (user_id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (launches_on >= starts_on)
);

comment on column public.projects.public_id is
  'Project ID (NB-0000) used with an email to sign in. Shown in welcome emails.';

-- Who works on a project, for "Your team" on the client overview.
create table public.project_team (
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references public.team_members (user_id) on delete restrict,
  role_label text not null check (char_length(btrim(role_label)) between 1 and 40),
  position smallint not null default 0 check (position between 0 and 50),
  primary key (project_id, user_id)
);

-- Client people. Each signs in with their own email and the Project ID.
create table public.project_clients (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  email text not null
    check (
      email = lower(email)
      and char_length(email) <= 254
      and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
    ),
  name text check (char_length(btrim(name)) between 1 and 80),
  locale text not null default 'pt' check (locale in ('en', 'pt')),
  -- Set when the auth user exists (created on invite, #136/#141).
  user_id uuid references auth.users (id) on delete set null,
  status text not null default 'invited' check (status in ('invited', 'active', 'removed')),
  invited_at timestamptz not null default now(),
  last_sign_in_at timestamptz,
  removed_at timestamptz,
  unique (project_id, email),
  check (status <> 'removed' or removed_at is not null),
  check (status <> 'active' or user_id is not null)
);

create index project_clients_user_id_idx on public.project_clients (user_id)
  where user_id is not null;

create table public.stages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  position smallint not null check (position between 1 and 20),
  name text not null check (char_length(btrim(name)) between 1 and 60),
  starts_on date not null,
  ends_on date,
  completed_at timestamptz,
  unique (project_id, position) deferrable initially immediate,
  unique (project_id, id),
  check (ends_on is null or ends_on >= starts_on)
);

create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  stage_id uuid not null,
  -- Per project, shown as NB-4821-18. Set by a trigger.
  number integer not null check (number > 0),
  title text not null check (char_length(btrim(title)) between 1 and 160),
  description text not null default '' check (char_length(description) <= 5000),
  status text not null default 'todo'
    check (status in ('todo', 'in_progress', 'in_review', 'done', 'blocked')),
  owner_id uuid references public.team_members (user_id) on delete set null,
  due_on date,
  client_visible boolean not null default true,
  waiting_on_client boolean not null default false,
  created_at timestamptz not null default now(),
  -- Also the version for edit conflicts (TM-09): a save sends the value it read.
  updated_at timestamptz not null default now(),
  unique (project_id, number),
  unique (project_id, id),
  foreign key (project_id, stage_id) references public.stages (project_id, id) on delete restrict
);

create index tickets_project_status_idx on public.tickets (project_id, status);
create index tickets_owner_id_idx on public.tickets (owner_id) where owner_id is not null;

create table public.ticket_checklist_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  ticket_id uuid not null,
  position smallint not null check (position between 0 and 100),
  label text not null check (char_length(btrim(label)) between 1 and 200),
  done boolean not null default false,
  foreign key (project_id, ticket_id) references public.tickets (project_id, id) on delete cascade
);

create index ticket_checklist_items_ticket_idx on public.ticket_checklist_items (ticket_id, position);

create table public.updates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  author_id uuid not null references public.team_members (user_id) on delete restrict,
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  highlight boolean not null default false,
  needs_client boolean not null default false,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  -- Deleted posts disappear from the client feed; the row stays for the team's history.
  deleted_at timestamptz,
  unique (project_id, id)
);

create index updates_project_created_idx on public.updates (project_id, created_at desc);

-- Tickets an update mentions (task detail shows its linked updates).
create table public.update_tickets (
  project_id uuid not null,
  update_id uuid not null,
  ticket_id uuid not null,
  primary key (update_id, ticket_id),
  foreign key (project_id, update_id) references public.updates (project_id, id) on delete cascade,
  foreign key (project_id, ticket_id) references public.tickets (project_id, id) on delete cascade
);

create index update_tickets_ticket_idx on public.update_tickets (ticket_id);

create table public.project_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  -- projects/<project id>/<file id> in the private bucket (#140).
  storage_path text not null unique check (char_length(storage_path) <= 300),
  name text not null check (char_length(btrim(name)) between 1 and 200),
  size_bytes bigint not null check (size_bytes between 1 and 52428800),
  content_type text not null
    check (
      content_type in (
        'application/pdf',
        'application/zip',
        'image/png',
        'image/jpeg',
        'image/webp',
        'image/gif',
        'image/svg+xml'
      )
    ),
  -- New files are team-only until shared (TM-08).
  shared boolean not null default false,
  uploaded_by uuid references public.team_members (user_id) on delete set null,
  created_at timestamptz not null default now(),
  check (storage_path = 'projects/' || project_id::text || '/' || id::text)
);

create index project_files_project_idx on public.project_files (project_id, created_at desc);

-- Client access activity (TM-06): team-only, the last 30 days are shown. Written by
-- SECURITY DEFINER functions only (#131, #136, #141).
create table public.access_events (
  id bigint generated always as identity primary key,
  project_id uuid not null references public.projects (id) on delete cascade,
  occurred_at timestamptz not null default now(),
  kind text not null
    check (
      kind in (
        'sign_in',
        'wrong_code',
        'locked',
        'lockout_cleared',
        'invite_sent',
        'client_removed',
        'project_id_rotated'
      )
    ),
  email text check (email = lower(email) and char_length(email) <= 254),
  actor_id uuid references public.team_members (user_id) on delete set null
);

create index access_events_project_idx on public.access_events (project_id, occurred_at desc);

-- Sign-in attempts per email and project, for the 3-tries rule and the 15-minute pause
-- (#131). Private: only the sign-in functions read and write it.
create table private.portal_sign_in_attempts (
  id bigint generated always as identity primary key,
  project_id uuid not null references public.projects (id) on delete cascade,
  email text not null check (email = lower(email) and char_length(email) <= 254),
  attempted_at timestamptz not null default now(),
  outcome text not null check (outcome in ('code_sent', 'wrong_code', 'signed_in'))
);

create index portal_sign_in_attempts_lookup_idx
  on private.portal_sign_in_attempts (project_id, email, attempted_at desc);

-- ---------------------------------------------------------------------------
-- Defaults and triggers
-- ---------------------------------------------------------------------------

-- A free NB-0000 id. 9,000 possible values; retries on the rare collision.
create function private.generate_project_public_id()
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  candidate text;
begin
  for i in 1..50 loop
    candidate := 'NB-' || (1000 + floor(random() * 9000))::int::text;
    if not exists (select 1 from public.projects where public_id = candidate) then
      return candidate;
    end if;
  end loop;
  raise exception 'no free Project ID after 50 tries';
end;
$$;

alter table public.projects
  alter column public_id set default private.generate_project_public_id();

-- Next ticket number in the project, serialised per project.
create function private.set_ticket_number()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('nortbrand.ticket_number.' || new.project_id::text, 0));
  select coalesce(max(number), 0) + 1 into new.number
  from public.tickets
  where project_id = new.project_id;
  return new;
end;
$$;

create trigger tickets_set_number
  before insert on public.tickets
  for each row execute function private.set_ticket_number();

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function private.set_updated_at();

create trigger tickets_set_updated_at
  before update on public.tickets
  for each row execute function private.set_updated_at();

create trigger portal_settings_set_updated_at
  before update on public.portal_settings
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Access helpers (stable, SECURITY DEFINER, so policies don't recurse through RLS)
-- ---------------------------------------------------------------------------

create function private.is_team_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.team_members
    where user_id = (select auth.uid()) and active
  );
$$;

create function private.is_team_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.team_members
    where user_id = (select auth.uid()) and active and role = 'admin'
  );
$$;

-- An active client of an open project.
create function private.is_project_client(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.project_clients c
    join public.projects p on p.id = c.project_id
    where c.project_id = p_project_id
      and c.user_id = (select auth.uid())
      and c.status = 'active'
      and p.status = 'active'
  );
$$;

-- Whether the ticket exists and is visible to clients (for checklist and links policies).
create function private.is_client_visible_ticket(p_ticket_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.tickets where id = p_ticket_id and client_visible
  );
$$;

revoke all on function private.set_updated_at() from public, anon, authenticated;
revoke all on function private.set_ticket_number() from public, anon, authenticated;
revoke all on function private.generate_project_public_id() from public, anon, authenticated;
revoke all on function private.is_team_member() from public, anon, authenticated;
revoke all on function private.is_team_admin() from public, anon, authenticated;
revoke all on function private.is_project_client(uuid) from public, anon, authenticated;
revoke all on function private.is_client_visible_ticket(uuid) from public, anon, authenticated;

-- Policies run as the caller, so authenticated needs the schema and these helpers. The
-- private schema is not exposed by the API, and its tables stay revoked.
grant usage on schema private to authenticated;
grant execute on function private.is_team_member() to authenticated;
grant execute on function private.is_team_admin() to authenticated;
grant execute on function private.is_project_client(uuid) to authenticated;
grant execute on function private.is_client_visible_ticket(uuid) to authenticated;
grant execute on function private.generate_project_public_id() to authenticated;

-- ---------------------------------------------------------------------------
-- Privileges: nothing for anon; authenticated gets table privileges that RLS narrows.
-- ---------------------------------------------------------------------------

revoke all on table
  public.team_members,
  public.portal_settings,
  public.projects,
  public.project_team,
  public.project_clients,
  public.stages,
  public.tickets,
  public.ticket_checklist_items,
  public.updates,
  public.update_tickets,
  public.project_files,
  public.access_events
from anon, authenticated;

revoke all on table private.portal_sign_in_attempts from public, anon, authenticated;

-- Select, insert and delete on whole tables; update only on the columns people edit.
-- (A table-wide UPDATE grant covers every column and can't be narrowed by a column-level
-- REVOKE, so ids, the Project ID, project membership of child rows, authors and creation
-- stamps are simply never granted. The Project ID is rotated by a function, #141.)
grant select, insert, delete on table
  public.team_members,
  public.projects,
  public.project_team,
  public.project_clients,
  public.stages,
  public.tickets,
  public.ticket_checklist_items,
  public.updates,
  public.update_tickets,
  public.project_files
to authenticated;

grant update (name, email, role, active) on public.team_members to authenticated;
grant update (name, client_name, starts_on, launches_on, health, status, staging_url, lead_id)
  on public.projects to authenticated;
grant update (role_label, position) on public.project_team to authenticated;
grant update (name, locale, status, removed_at) on public.project_clients to authenticated;
grant update (position, name, starts_on, ends_on, completed_at) on public.stages to authenticated;
grant update (stage_id, title, description, status, owner_id, due_on, client_visible, waiting_on_client)
  on public.tickets to authenticated;
grant update (position, label, done) on public.ticket_checklist_items to authenticated;
grant update (body, highlight, needs_client, edited_at, deleted_at) on public.updates to authenticated;
grant update (name, shared) on public.project_files to authenticated;

grant select on table public.portal_settings to authenticated;
grant update (
  allowed_team_domain,
  code_max_tries,
  lockout_minutes,
  session_days,
  daily_digest,
  notify_first_client_sign_in
) on public.portal_settings to authenticated;

grant select on table public.access_events to authenticated;

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

alter table public.team_members enable row level security;
alter table public.portal_settings enable row level security;
alter table public.projects enable row level security;
alter table public.project_team enable row level security;
alter table public.project_clients enable row level security;
alter table public.stages enable row level security;
alter table public.tickets enable row level security;
alter table public.ticket_checklist_items enable row level security;
alter table public.updates enable row level security;
alter table public.update_tickets enable row level security;
alter table public.project_files enable row level security;
alter table public.access_events enable row level security;
alter table private.portal_sign_in_attempts enable row level security;

-- team_members: the team sees the team; a client sees the people on their projects.
create policy team_members_select on public.team_members
  for select to authenticated
  using (
    (select private.is_team_member())
    or exists (
      select 1 from public.project_team pt
      where pt.user_id = team_members.user_id
        and private.is_project_client(pt.project_id)
    )
  );
create policy team_members_admin_insert on public.team_members
  for insert to authenticated with check ((select private.is_team_admin()));
create policy team_members_admin_update on public.team_members
  for update to authenticated
  using ((select private.is_team_admin())) with check ((select private.is_team_admin()));
create policy team_members_admin_delete on public.team_members
  for delete to authenticated using ((select private.is_team_admin()));

-- portal_settings: the team reads (members see Settings read-only), admins change.
create policy portal_settings_select on public.portal_settings
  for select to authenticated using ((select private.is_team_member()));
create policy portal_settings_admin_update on public.portal_settings
  for update to authenticated
  using ((select private.is_team_admin())) with check ((select private.is_team_admin()));

-- projects
create policy projects_select on public.projects
  for select to authenticated
  using ((select private.is_team_member()) or private.is_project_client(id));
create policy projects_admin_insert on public.projects
  for insert to authenticated with check ((select private.is_team_admin()));
create policy projects_team_update on public.projects
  for update to authenticated
  using ((select private.is_team_member())) with check ((select private.is_team_member()));
create policy projects_admin_delete on public.projects
  for delete to authenticated using ((select private.is_team_admin()));

-- project_team
create policy project_team_select on public.project_team
  for select to authenticated
  using ((select private.is_team_member()) or private.is_project_client(project_id));
create policy project_team_admin_write on public.project_team
  for all to authenticated
  using ((select private.is_team_admin())) with check ((select private.is_team_admin()));

-- project_clients: the team reads; admins manage access (TM-06). Clients never see the list.
create policy project_clients_team_select on public.project_clients
  for select to authenticated using ((select private.is_team_member()));
create policy project_clients_admin_write on public.project_clients
  for all to authenticated
  using ((select private.is_team_admin())) with check ((select private.is_team_admin()));

-- stages
create policy stages_select on public.stages
  for select to authenticated
  using ((select private.is_team_member()) or private.is_project_client(project_id));
create policy stages_team_write on public.stages
  for all to authenticated
  using ((select private.is_team_member())) with check ((select private.is_team_member()));

-- tickets: clients see client-visible tickets only.
create policy tickets_select on public.tickets
  for select to authenticated
  using (
    (select private.is_team_member())
    or (client_visible and private.is_project_client(project_id))
  );
create policy tickets_team_write on public.tickets
  for all to authenticated
  using ((select private.is_team_member())) with check ((select private.is_team_member()));

-- ticket_checklist_items: follow their ticket's visibility.
create policy ticket_checklist_items_select on public.ticket_checklist_items
  for select to authenticated
  using (
    (select private.is_team_member())
    or (
      private.is_project_client(project_id)
      and private.is_client_visible_ticket(ticket_id)
    )
  );
create policy ticket_checklist_items_team_write on public.ticket_checklist_items
  for all to authenticated
  using ((select private.is_team_member())) with check ((select private.is_team_member()));

-- updates: clients see live posts; the team posts as itself.
create policy updates_select on public.updates
  for select to authenticated
  using (
    (select private.is_team_member())
    or (deleted_at is null and private.is_project_client(project_id))
  );
create policy updates_team_insert on public.updates
  for insert to authenticated
  with check ((select private.is_team_member()) and author_id = (select auth.uid()));
create policy updates_team_update on public.updates
  for update to authenticated
  using ((select private.is_team_member())) with check ((select private.is_team_member()));
create policy updates_admin_delete on public.updates
  for delete to authenticated using ((select private.is_team_admin()));

-- update_tickets: a client sees a link only between a live update and a visible ticket.
create policy update_tickets_select on public.update_tickets
  for select to authenticated
  using (
    (select private.is_team_member())
    or (
      private.is_project_client(project_id)
      and private.is_client_visible_ticket(ticket_id)
      and exists (
        select 1 from public.updates u
        where u.id = update_tickets.update_id and u.deleted_at is null
      )
    )
  );
create policy update_tickets_team_write on public.update_tickets
  for all to authenticated
  using ((select private.is_team_member())) with check ((select private.is_team_member()));

-- project_files: clients see shared files only.
create policy project_files_select on public.project_files
  for select to authenticated
  using (
    (select private.is_team_member())
    or (shared and private.is_project_client(project_id))
  );
create policy project_files_team_write on public.project_files
  for all to authenticated
  using ((select private.is_team_member())) with check ((select private.is_team_member()));

-- access_events: team only, read only.
create policy access_events_team_select on public.access_events
  for select to authenticated using ((select private.is_team_member()));

-- ---------------------------------------------------------------------------
-- Realtime: the client feed and Overview show new updates live (Figma 14 Portal —
-- Motion, "New update arrives"; lead's decision 2026-11-13, ADR-009). Only `updates` is
-- published, and Realtime applies the select policies above, so a client only receives
-- posts from their own projects, and never deleted ones.
-- ---------------------------------------------------------------------------

alter publication supabase_realtime add table public.updates;
