# Database

**Covers:** #36 (marketing tables, § 1–6) and #130 (portal schema, § 7). **Source:**
ADR-002 (and its amendments), ADR-009, CLAUDE.md › Data model.

## 1. What we built

Two tables of personal data, written by anonymous visitors, that the public API can never
read:

| Object                                                               | Schema    | Purpose                                                        |
| -------------------------------------------------------------------- | --------- | -------------------------------------------------------------- |
| `consultation_requests`                                              | `public`  | Contact form submissions; the team reads them in the dashboard |
| `newsletter_subscribers`                                             | `public`  | Double opt-in list: `pending` → `subscribed` → `unsubscribed`  |
| `write_events`                                                       | `private` | One row per public write, for the rate limits; pruned hourly   |
| `submit_consultation_request`                                        | `public`  | Inserts a request, returns its id                              |
| `mark_consultation_notified`                                         | `public`  | Records that the team alert was sent                           |
| `subscribe_newsletter`                                               | `public`  | Creates or refreshes a pending subscription                    |
| `confirm_newsletter`                                                 | `public`  | Confirms with a signed link                                    |
| `unsubscribe_newsletter`                                             | `public`  | Unsubscribes with a signed link                                |
| `enforce_write_limit`, `newsletter_token`, `newsletter_token_secret` | `private` | Helpers; not reachable through the API                         |

The schema is in `supabase/migrations/20261015120000_requests_and_subscribers.sql`.
`20261015204624_consultation_empty_phone.sql` (#37) makes `submit_consultation_request`
store an empty or blank phone as `null`, because generated types cannot pass `null`.

## 2. The threat model, in one paragraph

The server actions call these functions with the **anon key**, and the anon key ships to
every browser. So anyone can skip our server action and call
`POST /rest/v1/rpc/<function>` directly, with any arguments. The honeypot, the fill-time
check and zod only stop casual bots. **Every function must be safe on its own**, which is
why each design choice below exists.

## 3. How a request flows at runtime

```text
Contact form → server action (honeypot, fill time, zod, ip_hash = SHA-256(salt + IP))
  → supabase.rpc('submit_consultation_request', …)          [anon key]
    → PostgREST → function runs as its owner (SECURITY DEFINER)
      → private.enforce_write_limit: lock, prune, count, log   → PT429 if over
      → INSERT … CHECK constraints                              → 23514 if invalid
    ← new id
  → Resend team alert → supabase.rpc('mark_consultation_notified', { p_id })
```

The newsletter follows the same path, then double opt-in:

```text
subscribe_newsletter(email, locale, ip_hash) ← issued_at (Unix seconds)
server action signs token = HMAC(secret, "confirm|email|issued_at"), emails the link
visitor presses Confirm → server action → confirm_newsletter(email, issued_at, token) → true/false
```

## 4. Decisions, file by file

**Tables.** Every rule from the zod schemas is mirrored as a `CHECK`: name 1–120 characters
(after trimming), email lowercase, at most 254 characters and shaped like an address, phone
optional (`+`, digits, spaces, `().-`, 6–31 characters), one of the five service slugs,
message 10–5000 characters, locale `en`/`pt`, `ip_hash` a 64-character hex digest. Defaults
(`status`, `consent_at`, `created_at`) are set by the database, not by the caller. All
timestamps are `timestamptz`, stored in UTC. The BACKEND tickets' zod schemas must match
these rules exactly; the database is the last line, zod gives the friendly messages.

**RLS with no policies.** RLS is on and there are deliberately zero policies, so `anon` and
`authenticated` match no rows for any operation. Table privileges are also revoked, so the
API returns 401 before RLS is even consulted. Two layers, because a future `grant` added by
mistake would still hit RLS.

**`SECURITY DEFINER` and `search_path = ''`.** The functions run as their owner, so they can
write tables the caller cannot. An empty `search_path` means every name is
schema-qualified (`public.…`, `private.…`, `extensions.hmac`), so a caller cannot plant a
lookalike object to hijack the function.

**Grants.** Postgres lets `PUBLIC` execute new functions, and Supabase also grants them to
`anon` and `authenticated`. The migration revokes all three and grants `anon` only.

**The `private` schema.** PostgREST exposes only `public` and `graphql_public`
(`supabase/config.toml`), so helpers and `write_events` are invisible to the API
(`PGRST202`). The schema is also revoked from the API roles.

**Rate limits** (`private.enforce_write_limit`). Each write takes one transaction-scoped
advisory lock, deletes events older than an hour, then rejects when there are already 100
events in total or 5 for this `ip_hash`, and finally logs the new event. The lock makes
count-then-insert safe under concurrency: two requests cannot both see "4". The global
ceiling exists because a direct caller can send a fresh `ip_hash` every time. Rejections
raise SQLSTATE `PT429`, which PostgREST turns into HTTP 429, so the server action can show
the right message. A rejected write rolls back with its transaction and is not counted.

**`mark_consultation_notified`.** It only touches rows created in the last 10 minutes that
were not yet notified. A caller who somehow had an id cannot rewrite older history.

**`subscribe_newsletter`.** An upsert on `email`:

- new email → `pending`, with `consent_at` = now, truncated to whole seconds;
- `pending` or `unsubscribed` → back to `pending` with a fresh `consent_at` and locale;
- `subscribed` → untouched (the `where` clause on `do update`).

It always returns the current second, so the result for a subscribed address looks the same
as any other: a caller cannot test whether someone is on the list. Every call counts as a
write.

**Newsletter tokens.** `confirm_newsletter` and `unsubscribe_newsletter` would otherwise let
anyone confirm or unsubscribe any address. So the database verifies the link itself:

| Link        | Signed message                  | Valid for                           |
| ----------- | ------------------------------- | ----------------------------------- |
| Confirm     | `confirm\|<email>\|<issued_at>` | 7 days, and only the latest link    |
| Unsubscribe | `unsubscribe\|<email>`          | Forever (it is in every newsletter) |

The token is `base64url(HMAC-SHA256(secret, message))` without padding: in Node,
`createHmac("sha256", secret).update(message).digest("base64url")`. `issued_at` equals the
row's `consent_at`, so subscribing again invalidates older confirm links. The secret is
read from Supabase Vault (`newsletter_token_secret`) and must equal
`NEWSLETTER_TOKEN_SECRET`. Both functions return `false` for a bad token instead of raising,
and `true` for any valid token even when nothing changed (already subscribed, unknown
email), so the answer leaks nothing.

## 5. Tests

`pnpm db:test` runs the pgTAP suite in `supabase/tests` against the local stack. Each file
runs in a transaction that starts by truncating the tables and ends in a rollback, so tests
are independent of the seed and of each other.

| File                        | Proves                                                                                                              |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `01_access.test.sql`        | RLS on, no policies; `anon`/`authenticated` cannot select, insert, update or delete; grants                         |
| `02_consultation.test.sql`  | Valid insert; every `CHECK` violation; defaults; `mark_consultation_notified` rules                                 |
| `03_newsletter.test.sql`    | Fixed token vectors; subscribe/refresh/no-op; wrong, missing, expired, future, superseded tokens                    |
| `04_rate_limit.test.sql`    | 6th write per `ip_hash` rejected; other hashes unaffected; hourly expiry; 101st global write                        |
| `05_portal_access.test.sql` | Portal (§ 7): RLS on every table; what each role sees and changes; Realtime publication; cross-project foreign keys |

The token vectors in `03_newsletter.test.sql` were generated with Node's `crypto`. The
TypeScript signer (BACKEND ticket) must test against the same vectors, so both sides stay in
step.

CI runs the suite on every pull request against a fresh database ([CI](./ci.md)). Still
run `pnpm db:test` before pushing a migration: it is faster than waiting for the check.

## 6. Day-to-day rules

- **New migration:** `pnpm exec supabase migration new <name>`, write SQL, `pnpm db:reset`,
  `pnpm db:test`, `pnpm db:types` (commit the regenerated types).
- **Pushing to a hosted project** is deliberate and needs the lead's approval:
  `pnpm exec supabase db push` (dev first; production after merge). Nothing in CI pushes.
- **Vault secret:** each project needs `newsletter_token_secret` (runbook § 6). Local stack:
  run `select vault.create_secret('<value>', 'newsletter_token_secret');` in Studio after a
  reset, with the same value as your local `NEWSLETTER_TOKEN_SECRET`. Check it with
  `/api/health/newsletter` ([Newsletter](./newsletter.md)).
- **Calling the functions** (BACKEND): handle `PT429` (rate limited → designed message),
  `23514`/`23502` (should not happen after zod → _Send failed_), anything else → _Send
  failed_. **Never log or forward `error.details`**: Postgres puts the submitted row in it,
  personal data included.
- **Reading data:** the team uses the Supabase dashboard (Table Editor), signed in to
  Supabase. The website never reads the marketing tables; portal tables are read by
  signed-in users through RLS (§ 7).
- **Seed data** (`supabase/seed.sql`) is for the local stack only, with `example.com`
  addresses.

## 7. Portal schema (#130, ADR-009)

The Client and Team Portal adds signed-in users. The marketing tables above are untouched.
The portal tables use the opposite model: **RLS with policies**, read and written by the
signed-in user's own session. The migration is
`supabase/migrations/20261113120000_portal_schema.sql`.

### The tenant is the project

```
team_members ──┐ (lead, owner, author)
               ▼
projects ──┬── project_team      who works on it: members' access, and "Your team" for clients
           ├── project_clients   client people: email + Project ID sign-in, status
           ├── stages ── tickets ── ticket_checklist_items
           ├── updates ── update_tickets ── (tickets)
           ├── project_files     private Storage objects (#140)
           └── access_events     team-only activity log (TM-06)
portal_settings (one row) · private.portal_sign_in_attempts (#131)
```

Every child row carries `project_id`, and composite foreign keys tie it to a parent **in the
same project**: a ticket's `(project_id, stage_id)` must match a stage, a checklist item's
`(project_id, ticket_id)` a ticket, and so on. An id copied from another project fails with
`23503`, whatever the caller sends. File paths must be `projects/<project id>/<file id>`
(a `CHECK`).

### Who sees what

Four `SECURITY DEFINER` helpers in `private` answer "who is asking" without recursing
through RLS: `is_team_member()`, `is_team_admin()`, `works_on_project(project)` (an admin,
or an active member listed in `project_team`) and `is_project_client(project)` (an active
client of an _open_ project). `authenticated` may execute them; the schema stays unexposed
by the API. **A member works only on the projects they are assigned to** (lead's decision,
2026-11-13); admins work on every project and alone create projects and manage client
access, the team and settings.

| Table                    | Client (active, open project) | Member (assigned)  | Admin (all)      |
| ------------------------ | ----------------------------- | ------------------ | ---------------- |
| `projects`               | their projects                | read, edit         | + create, delete |
| `stages`                 | their projects                | read, write        | same             |
| `tickets`                | `client_visible` only         | read, write        | same             |
| `ticket_checklist_items` | items of visible tickets      | read, write        | same             |
| `updates`                | live posts (no `deleted_at`)  | read, post as self | + delete         |
| `update_tickets`         | live update ↔ visible ticket  | read, write        | same             |
| `project_files`          | `shared` only                 | read, write        | same             |
| `project_team`           | their projects                | read               | write            |
| `project_clients`        | nothing                       | read               | write            |
| `access_events`          | nothing                       | read               | read             |
| `team_members`           | people on their projects      | the whole team     | write            |
| `portal_settings`        | nothing                       | read               | edit             |

Every row above except the last two is limited to the member's assigned projects. A new
project is invisible to members until an admin adds them to its team.

`anon` has no privilege on any portal table. A removed client, a client of a closed
project, a deactivated teammate and a signed-in stranger all see nothing, and a member
sees nothing of a project they aren't assigned to.

### Column privileges: grant, never revoke

`authenticated` has `select`, `insert` and `delete` on the portal tables, but `update` only
on the columns people edit. **A table-wide `UPDATE` grant covers every column, and a
column-level `REVOKE` cannot narrow it.** The pgTAP suite caught exactly this: a member
could change a Project ID until the grants became per column. So ids, `public_id`,
`project_id`, ticket `number`, `author_id`, `storage_path` and creation stamps are simply
never granted. The Project ID changes only through its rotation function (#141).

### Defaults, triggers and versions

- `projects.public_id` defaults to `private.generate_project_public_id()`: a free `NB-0000`
  (9,000 values), never typed by anyone (TM-04).
- `tickets.number` is set per project by a trigger, serialised with an advisory lock, so two
  new tickets never share a number.
- `projects.updated_at` and `tickets.updated_at` are set by triggers. A ticket's
  `updated_at` is its version for edit conflicts (#137): a save sends the value it read.

### Realtime

Only `public.updates` is in the `supabase_realtime` publication (Figma 14 Portal — Motion,
"New update arrives"; lead's decision, 2026-11-13). Realtime applies the same select
policies, so a client only receives live posts from their own projects. The local stack
does not run the Realtime service (`supabase/config.toml`); the publication is still
created and tested.

### Seed

`supabase/seed.sql` adds the Figma demo for the local stack: the Atlântico Café project
(`NB-4821`), three teammates (Ana Costa as admin, Tiago Sousa, Rui Matos), one active
client (João), six stages, six tickets (one team-only), a checklist, four updates and two
files (one shared). The auth users are inserted directly, with `example.com` addresses.

### Team access (#132)

`20261115120000_portal_team_access.sql` adds team sign-in (its own attempts table,
sharing the client code-request rate limit), the allowed-domain trigger on
`team_members` (also checks the row's email is the auth user's), and the admin-only
functions `portal_check_team_invite`, `portal_add_team_member` and
`portal_remove_team_member` (42501 for non-admins; PT403 removing yourself; PT409 the lead
of an active project; PT422 outside the allowed domain). `private.portal_bootstrap_first_admin`
has no grants: the SQL editor only. Tests: `supabase/tests/07_portal_team_access.test.sql`.

### Rules for portal work

- Read and write portal tables with the signed-in user's Supabase client, never the
  service-role key (ADR-009 § 5).
- A new portal table: RLS on, policies through the helpers, `revoke all from anon`,
  `update` granted per column, composite foreign keys to its project, and pgTAP tests for
  each role, including cross-project denial.
- A new client-facing column on a team table: decide whether clients may see it, then test
  it.
- Run `pnpm db:types` after every migration and commit the result.
