# Client portal

**Covers:** #131 (client sign-in), #132 (team sign-in and roles), #133 (shells and
states), #134 (overview and tasks), #135 (timeline, files and updates), #136 (team projects and new project), #137 (team board and ticket editor), #138 (stage management and the team overview), #139 (updates, Needs you emails and the digest). Later portal tickets
extend this guide. **Source:**
ADR-009, Figma 12 Portal — Client (`516:2`), 14 Portal — Motion (`566:127`). The data model
is in the [Database guide](./database.md) § 7.

## 1. What we built

- **Track Project** in the site navigation (desktop nav and the tablet/mobile menu, not
  the footer) opens `/[locale]/portal`.
- **Sign-in in two steps** (CP-01, CP-02):
  1. The client enters their email and Project ID (`NB-4821`). If they match an open
     project, Supabase emails a 6-digit code.
  2. The client types the code. On success the project opens; three wrong codes cancel
     it and pause sign-in for 15 minutes.
- **The states in CP-08:** one message for every non-match, the wrong-code count, "That
  code has expired", "You've been signed out" (30-day sessions), and the locked and
  rate-limited messages.
- **`/[locale]/portal/[projectId]`**: the guard and a placeholder (project name, Sign out)
  until the portal shell (#133) and overview (#134) arrive.

## 2. How it works at runtime

```
Browser (ClientSignIn)            Server action (actions.ts → sign-in.ts)          Postgres / Supabase Auth
──────────────────────            ───────────────────────────────────────          ────────────────────────
email + Project ID ─────────────► requestClientCode
                                   zod ─► portal_begin_client_sign_in(ip_hash) ──► rate limit, match? lock?
                                   ok? ─► auth.signInWithOtp(shouldCreateUser:false) ─► email with {{ .Token }}
                                   always ≥ 1.2 s (no timing hint)
◄──── code_sent / no_match / locked / rate_limited / failed

6 digits ───────────────────────► verifyClientCode
                                   zod ─► portal_code_state ──────────────────────► active / expired / locked
                                   ─► auth.verifyOtp (session cookies via @supabase/ssr)
                                   miss ─► portal_register_wrong_code ────────────► tries left, lock at 3
                                   hit  ─► portal_complete_client_sign_in (as the user) ─► only their own row
                                   ─► sign the 30-day marker cookie
◄──── signed_in → boxes turn green, form fades (150 ms) → /portal/NB-4821
```

On every portal request, `src/proxy.ts` refreshes the Supabase session cookies. The
sign-in form is part of the page's static shell; beside it, `SessionGate` reads the
session inside a Suspense boundary and only ever redirects (signed in → the project;
ended session → `?reason=signed-out`, which the form shows as "You've been signed out").
`getPortalViewer()` needs a Supabase user **and** a valid marker; RLS decides which
projects that user sees.

## 3. Files, one by one

| File                                                           | What and why                                                                                                                                                                                                                                                                                                                                            |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `supabase/migrations/20261114120000_portal_client_sign_in.sql` | The four functions in § 2, a separate rate-limit table (10 code requests per IP per hour, 200 in total), and the `locked` outcome. Each function is safe to call with the public key: answers are only `ok` / `no_match` / `locked`, an unknown client's code state reads `expired`, and completion works only for the signed-in user's own client row. |
| `src/features/portal/auth/schema.ts`                           | zod for both steps, matching the database (lowercase email, `NB-0000`), and `maskEmail` ("j•••@atlantico.pt").                                                                                                                                                                                                                                          |
| `src/features/portal/auth/sign-in.ts`                          | The rules, free of Next.js and Supabase, with dependencies injected (the consultation pattern), so every branch is unit-tested. Step 1 pads every answer to 1.2 s.                                                                                                                                                                                      |
| `src/features/portal/auth/actions.ts`                          | Server actions wiring the real backend (anon client for the functions, session client for verify and complete) or the e2e fake. Only Postgres error codes are reported to Sentry.                                                                                                                                                                       |
| `src/features/portal/auth/session-marker.ts`                   | The 30-day limit. Supabase's time-boxed sessions are Pro-only, so sign-in sets an HMAC-signed, user-bound marker that is never refreshed; without it the session counts as signed out.                                                                                                                                                                  |
| `src/features/portal/auth/access.ts`                           | `getPortalViewer()` (signed in / signed out / anonymous) and the client's projects, read under RLS.                                                                                                                                                                                                                                                     |
| `src/lib/supabase/auth.ts`                                     | `getPortalSupabase()`: the anon key plus the user's session in cookies. The marketing site keeps the session-less `getSupabase()`.                                                                                                                                                                                                                      |
| `src/proxy.ts`                                                 | Locale negotiation on `/` (unchanged) and session refresh on `/en                                                                                                                                                                                                                                                                                       | pt/portal…`. |
| `components/auth-card.tsx`, `brand-panel.tsx`                  | The split card: 520 + 520 on desktop with the mini stage tracker, a stacked card on tablet, a full-width dark header on mobile. Shared with team sign-in (#132).                                                                                                                                                                                        |
| `components/client-sign-in.tsx`                                | The step machine (details → code → signed in; expired; signed out). Strings arrive as props; templates are filled in the browser (`copy.ts`). Quick validation uses `client-validation.ts`, which has no zod (no zod in client bundles, #105).                                                                                                          |
| `components/code-input.tsx`                                    | Radix's one-time-password field: paste, Backspace, arrows, `autocomplete="one-time-code"`. It submits the form natively on the sixth digit; the form reads the code from its hidden input and ignores a second submit while one is in flight.                                                                                                           |
| `components/sign-out-button.tsx`                               | Clears the session, then loads the sign-in page in full, so the router can't restore the signed-in page.                                                                                                                                                                                                                                                |
| `emails/portal-code.tsx`, `emails/render-template.tsx`         | The code email in React Email, rendered with Supabase's `{{ .Token }}` into `supabase/templates/portal-code.html`, with EN and PT branches on `user_metadata.locale`. The file is a vitest file snapshot.                                                                                                                                               |
| `e2e-backend.ts`                                               | Playwright's fake backend: NB-1234, emails `client…@e2e.example`, code 123456.                                                                                                                                                                                                                                                                          |
| `src/app/[locale]/(site)/portal/page.tsx`                      | The sign-in page: static card and brand panel; the gate (redirect if signed in, signed-out screen) streams in. Noindex, no canonical, no Referer, disallowed in robots.txt.                                                                                                                                                                             |
| `src/app/[locale]/portal/[projectId]/page.tsx`                 | The guard and placeholder; outside the site chrome, ready for the portal shell.                                                                                                                                                                                                                                                                         |

## 4. Decisions and trade-offs

- **Email codes, not magic links.** Mail scanners open links; a code needs the person.
- **One message for every non-match** (wrong email, wrong ID, closed project, removed
  client) and the same response time, so the page can't be used to test Project IDs.
- **The 3-tries rule is ours.** Supabase can't count per project, so the database counts
  and the action refuses to verify a locked or expired code. Supabase's verify endpoint is
  public, so its own limit is lowered to 10 per 5 minutes per IP (tech debt records the
  rest).
- **Sessions end after 30 days in the app,** with the signed marker, because the Free plan
  can't time-box them.
- **The form never sits inside Suspense.** First the form was the boundary's fallback
  (two forms in the page while the session streamed in), then a skeleton was. In CI the
  boundary sometimes switched to client rendering before its content arrived (something
  above it updated first), and the server's copy of the form stayed in the page, hidden,
  next to the browser's. Now the form is static and the boundary renders nothing: a
  signed-out visitor sees the form for a moment before "You've been signed out".
- **Wrong code:** the boxes clear and turn red, shake once, and focus returns to the
  first box, so the next code can be typed straight away.
- **Motion** (14 Portal — Motion): digits pop 0.96 → 1 in 100 ms; a wrong code shakes the
  row once in 300 ms; success turns the boxes green and fades the form in 150 ms (ease-in)
  before the project opens; steps swap instantly. Reduced motion: no pop, no shake.
- **Rendering:** portal pages are ◐ in the build (static shell, per-request content).
  `GoogleAnalytics` in the root layout now sits in its own Suspense boundary: it reads the
  pathname, which is request data on routes with unknown params.

## 5. Tests

| File                                                       | Covers                                                                                                                                                                                                                                                                              |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `supabase/tests/06_portal_sign_in.test.sql`                | Grants; one answer for every non-match; normalisation; 3 tries → lock → expiry; fresh tries after a new code; 10-minute lifetime; both rate limits; completion only for the user's own row (closed project, stranger); activation of invited clients; logging; attempts unreachable |
| `src/features/portal/auth/sign-in.test.ts`                 | Validation, normalisation, timing pad on every outcome, no code on no_match or lock, rate limits, wrong code, lock, sign-out of a verified non-client                                                                                                                               |
| `src/features/portal/auth/session-marker.test.ts`          | Fresh, expired, other user, moved date, other secret, junk, future                                                                                                                                                                                                                  |
| `src/features/portal/auth/emails/render-template.test.tsx` | The committed template matches the component; both languages carry `{{ .Token }}`; the subject matches `config.toml`                                                                                                                                                                |
| `src/proxy.test.ts`                                        | Locale negotiation unchanged; portal URLs never locale-redirected                                                                                                                                                                                                                   |
| `tests/e2e/portal-sign-in.spec.ts`                         | Nav entry and active state; validation; one no-match message; wrong code → right code → project → sign out; 3 wrong codes → expired; locked; rate limited; guard redirect; signed-out screen; PT copy; axe on the code step                                                         |
| `tests/e2e/routes.ts`                                      | Track Project runs through the page harness (EN/PT, axe, one H1, overflow, tap targets)                                                                                                                                                                                             |

## 6. Day-to-day

- **Change the code email:** edit `portal-code.tsx` or `Emails.portalCode`, run
  `pnpm test -- -u`, commit `supabase/templates/portal-code.html`, and paste it into each
  hosted project's Magic Link template (environments guide § 2).
- **Sign in locally against the database:** `pnpm db:reset` seeds `joao@example.com` on
  `NB-4821`. Codes arrive in Mailpit at <http://127.0.0.1:54324>.
- **Never** read portal data with `getSupabase()` or the service-role key; use
  `getPortalSupabase()` so RLS sees the user.

## 7. Team sign-in and roles (#132)

**What.** `/team/sign-in` (TM-14) and a guarded `/team` page with the team list, invite
and remove. English only, outside the locale routes (its own root layout, like
`/studio`), noindex, disallowed in robots.txt. The portal shell (#133) and the full Team
page (TM-12, the My tickets / Team / Settings ticket) build on it.

**Access model (lead's decision, 2026-11-13).** Invite-only by any email. An optional
allowed domain (`portal_settings.allowed_team_domain`, off) limits invites; a trigger on
`team_members` enforces it on every write, so neither a function nor a direct RLS write
can skip it. Roles: `admin` (projects, client access, team, settings) and `member`
(their projects only).

### How it works at runtime

```
/team/sign-in   email ──► requestTeamCode ──► portal_begin_team_sign_in (rate limit shared
                                              with clients; ok / no_match / locked)
                code  ──► verifyTeamCode  ──► portal_team_code_state → verifyOtp →
                                              portal_register_team_wrong_code (3 tries) →
                                              portal_complete_team_sign_in (role or null)
                                              → 30-day marker → /team
/team           getTeamViewer(): valid session + marker + an *active* team_members row
                (read under RLS). A removed teammate is refused on the next request.
Invite (admin)  inviteTeammateAction → viewer is admin? → portal_check_team_invite (admin,
                domain, duplicate; returns an existing auth user) → createAuthUser (service
                role, auth admin only) or unblock → portal_add_team_member (admin's
                session; trigger checks email + domain). A failed add deletes the user it
                created.
Remove (admin)  removeTeammateAction → viewer is admin? not yourself? →
                portal_remove_team_member (PT403 yourself, PT409 lead of an active
                project; reassigns tickets and updates to each project's lead; leaves the
                project teams; active = false) → ban the auth user (blocks sign-in).
```

### Files

| File                                                        | What and why                                                                                                                                                                    |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `supabase/migrations/20261115120000_portal_team_access.sql` | Team attempts table, the domain trigger, sign-in functions, invite/add/remove (admins only, 42501 otherwise), and `private.portal_bootstrap_first_admin` (no grants).           |
| `src/features/portal/auth/sign-in.ts`                       | The rules are generic over the identity: `requestCode`/`verifyCode` (email + Project ID) and `requestTeamCode`/`verifyTeamCode` (email).                                        |
| `src/features/portal/auth/components/sign-in-flow.tsx`      | The shared flow (steps, code input, CP-08 states). `client-sign-in.tsx` and `team/components/team-sign-in.tsx` are thin wrappers: actions, router, help line, Project ID field. |
| `src/features/portal/auth/server.ts`                        | Helpers both sign-ins share (Sentry with error codes only, the marker cookie).                                                                                                  |
| `src/features/portal/team/team-admin.ts`                    | Invite and remove rules with injected dependencies; the role check comes first. Unit-tested.                                                                                    |
| `src/features/portal/team/actions.ts`                       | Server actions: team sign-in, sign-out, invite, remove.                                                                                                                         |
| `src/features/portal/team/access.ts`                        | `getTeamViewer()`, `listTeammates()` (RLS).                                                                                                                                     |
| `src/features/portal/team/copy.ts`                          | English-only strings (typed here, not in `messages/`, which must match in EN and PT).                                                                                           |
| `src/lib/supabase/admin.ts`                                 | The only holder of the service-role key: create, delete and ban auth users. Never table access.                                                                                 |
| `scripts/check-client-bundles.mts`                          | `pnpm check:bundles`, after every CI build: fails if the key's name (or value, when set) is in `.next/static`.                                                                  |
| `scripts/portal-bootstrap-admin.mts`                        | `pnpm portal:bootstrap-admin`: the first admin (below).                                                                                                                         |
| `src/app/team/`                                             | Root layout (no marketing chrome), `sign-in/page.tsx`, `page.tsx`.                                                                                                              |

### The first admin (once per Supabase project)

1. Put that project's URL and secret key in the environment (or `.env.local`):
   `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
2. `pnpm portal:bootstrap-admin --email ana@example.com --name "Ana Costa"`. It creates
   (or finds) the auth user and prints one SQL line.
3. Run that line in the project's SQL editor. The function has no grants, so nothing else
   can call it, and it refuses once an active admin exists.
4. Sign in at `/team/sign-in`. Invite everyone else from `/team`.

### Decisions and trade-offs

- **Roles twice.** Every action checks the viewer first; every SQL function checks again
  (42501). The pgTAP and unit tests both prove a member is refused.
- **The domain rule is a trigger,** because admins may also write `team_members` directly
  under RLS. It also requires the row's email to be the auth user's.
- **Removing a project lead is refused** until an admin picks a new lead, so no active
  project is left without one. (A direct `active = false` update by an admin skips the
  reassignment; use the action.)
- **Blocking sign-in is best effort** after the database change: the database is the
  source of truth, and every team page checks the active row.
- **The key stays on the server three ways:** `import "server-only"` in `admin.ts` (the
  build fails if client code imports it), `getServerEnv()` throws in a browser, and CI
  scans the client bundles (`pnpm check:bundles`).
- **Fake backend:** `admin@e2e.example` (admin), `member@e2e.example`, code 123456;
  invites to `…@outside.example` fall outside the allowed domain. Fake user ids are UUIDs
  derived from the email, so they pass the same validation as real ones.

## 8. The portal shells and states (#133)

**What.** The frame every portal screen sits in, for clients (`/[locale]/portal/[projectId]/…`,
EN/PT) and the team (`/team/…`, EN), and the states every screen can be in. Page content
comes with #134 onwards; until then each section shows the designed day-one state.

### Layout at each width (Figma CP-03, CP-T03, CP-M03, TM-01, TM-T01, TM-M01; rules 560:2243)

|            | Desktop ≥ 1024                                                                                                   | Tablet 768–1023        | Mobile < 768                    |
| ---------- | ---------------------------------------------------------------------------------------------------------------- | ---------------------- | ------------------------------- |
| Top bar    | 64 px: logo, project switcher, Project ID, "Message your team", account (team: TEAM, search)                     | 64 px, "Message"       | 56 px: logo, mail icon, account |
| Navigation | 232 px sidebar with counts ("Your team" at the bottom for clients); team boards use the icon rail (`nav="rail"`) | tabs under the top bar | bottom tab bar                  |

`PortalNav` (`src/features/portal/shell/portal-nav.tsx`) draws all four variants from one
list; the shell renders the one each breakpoint needs (the others are `display: none`, so
one nav is in the accessibility tree). The active item comes from the URL.

### Runtime

```
/[locale]/portal/NB-4821/tasks
  layout.tsx  Suspense(fallback: ShellSkeleton after 300 ms)
    ShellGate  getPortalViewer() → signed out? → /portal?reason=signed-out
               getClientShell(id) (React cache, RLS) → null? → notFound()
               → ClientShell (top bar, nav, "Your team")
  tasks/page.tsx  Suspense(fallback: PageSkeleton) → H1 + day-one EmptyState
/team/settings
  (workspace)/layout.tsx  getTeamShell() (viewer + counts) → null? → /team/sign-in
  settings/page.tsx  member → ReadOnlyNotice; admin → the settings (#142)
```

- `getClientShell` reads the project, the client's other projects (switcher), the counts
  (client-visible tickets, shared files), the project team and its lead (the
  `mailto:` for "Message your team"; the studio address if the lead is hidden), all under
  RLS with the client's session. It is wrapped in React `cache()`, so the layout and the
  page share one read per request.
- A Project ID the client can't read renders the not-found page. Inside a streamed layout
  Next answers 200 (the response has started); the page still looks missing.

### States (`src/features/portal/states/`; live at `/team/states`, team only)

| Component                                  | Figma                              | Behaviour                                                        |
| ------------------------------------------ | ---------------------------------- | ---------------------------------------------------------------- |
| `Delayed`, `PageSkeleton`, `ShellSkeleton` | CP-08 loading                      | Final layout, only after 300 ms (CSS), no shimmer, no spinner    |
| `EmptyState`                               | CP-08 new project, TM-09 first run | One sentence on what happens next, at most one action            |
| `SaveFailedNotice`                         | TM-09 save failed                  | Keeps the typed values; Retry repeats the save; `role="alert"`   |
| `EditConflictNotice`                       | TM-09 edited by someone else       | "See their change" / "Keep mine"; nothing silently overwritten   |
| `ConfirmDialog`                            | TM-09 delete                       | Says what's lost; focus starts on Cancel; bottom sheet on mobile |
| `NoResults`                                | TM-09 search                       | Says what search covers                                          |
| `ReadOnlyNotice`                           | TM-09 settings · members           | The page exists; changing it doesn't (the server agrees)         |
| Session ended                              | CP-08                              | The sign-in pages (`?reason=signed-out`)                         |

Toasts use the existing Sonner `Toaster`, mounted in the team shell.

### Motion (14 Portal — Motion)

- **Tab change:** one marker element moves on `motionTokens.spring.portalTab` (400/30,
  Figma's value); content swaps instantly. Measured from the active link, so it needs
  only `domAnimation` (no shared-layout bundle). Reduced motion: it jumps.
- **Loading:** static skeleton after 300 ms, then the content.
- **Modals:** the dialog's scale and fade (250 ms in, 150 ms out); bottom sheet on mobile.
- **Never:** page transitions, counting numbers, hover lifts on rows.

### Extending it

- A new client section: add it to `clientNavItems` and its copy under `Portal.shell.nav`
  (EN and PT), then a page that renders inside the layout.
- A team board page: render `TeamShell` with `nav="rail"` from that page's own layout.

## 9. Client overview and tasks (#134)

**What.** The client's Overview (CP-03) and Tasks with the detail panel (CP-04), at 1440 /
768 / 390, EN and PT. Everything is a server component reading under RLS; the only client
components are the progress ring, the stage track (their motion) and the detail frame.

### Data and rules

- `src/features/portal/overview/data.ts`: `getProjectView(publicId)` (React `cache`)
  reads the project, stages, tickets (client-visible only, by RLS), the latest 20
  undeleted updates with their linked tickets, and the names of the teammates the client
  may see (anyone hidden reads as "NortBrand team"). `getChecklist(ticketId)` for the
  open task. The fake backend returns `e2e-fixture.ts`.
- `domain.ts` (unit-tested): `progress` (counts **client-visible tickets only**, the
  acceptance criterion), `currentStage`, `stageState`, `weekSummary`, `daysUntil`,
  `lisbonToday`, `stageElapsed`, `workingOn` (open tasks in the current stage, most urgent
  first: waiting on the client, blocked, then by due date), status filters and
  `groupByStage`.
- `format.ts` (unit-tested): calendar days with fixed EN/PT month and weekday names (ICU
  builds disagree on Portuguese short months), update times in Lisbon ("Today 10:20",
  "Yesterday 17:45", "Mon 09:12", "3 Nov"). No date library.

### Pages

| Route                         | What                                                                                                                                                                                                                                                              |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/[locale]/portal/[id]`       | Date eyebrow, name + health badge, summary, staging link; KPIs 4 across → 2 × 2 → progress + "We're waiting on you" card on mobile; the stage track (horizontal → vertical stepper); "What we're working on" (rows open the task); latest updates (one on mobile) |
| `/[locale]/portal/[id]/tasks` | `?status=` filter (tabs / chip row), groups per stage as native `<details>` (current stage open, finished stages "Done"); `?task=N` opens the detail                                                                                                              |

The filter and the open task live in the URL, so they're shareable, survive a refresh and
need no client state. The detail (status, due, stage, owner, start, description,
checklist, linked updates) is server-rendered; `TaskDetailFrame` shows it as a right
column from 1280 px, a 440 px right sheet from 768 px and a bottom sheet below. Closing
replaces the URL without `task`.

**Error state:** a failed read is reported to Sentry (error code only) and the page renders
`LoadFailed` inside the shell. **Empty states:** no open tasks in the stage, no updates,
no tasks at all, a filter with no matches, an unknown task.

### Motion (14 Portal — Motion)

- **Stage track draw-on** (once a session): the line draws to the current stage in 900 ms
  (`motionTokens.duration.draw`), each node pops 0.6 → 1 as the line reaches it.
- **Progress ring** (with the track): fills and counts up; on a later visit it starts from
  the last value this browser saw (localStorage), so the change itself is visible.
- `useSessionMoment(key)` decides after mount (null on the server), writes the
  sessionStorage flag inside its deferred callback, and says no with reduced motion.
- **Detail panel**: slides 24 px in with a fade (250 ms); sheets slide from their edge.
- **Never**: counting on every visit, page transitions, hover lifts on rows.

## 10. Client timeline, files and updates (#135)

**What.** The client's Timeline (CP-05), Files (CP-06) and Updates (CP-07), at 1440 / 768
/ 390, EN and PT. Server components under RLS; only the Gantt's once-a-session motion
runs in the browser.

### Database (`20261116120000_portal_milestones_and_files_storage.sql`)

- **`project_milestones`** (title, body, due date, done): clients read their projects'
  milestones; the team on a project writes them (the stages editor, #138, manages them).
- **Storage bucket `portal-files`** (private; the allowed types and 50 MB match
  `project_files`). Read rule `portal_files_read`: an object is readable exactly when its
  `project_files` row is readable, so clients get shared files of their own projects and
  the team the files of projects they work on. Uploads and team write rules are #140.
- The storage part runs only where the storage schema exists (every hosted project,
  `supabase start`). Local Storage is now on in `config.toml`, and CI's database job
  starts Storage and resets, so the Storage tests run for real.
- pgTAP `08_portal_milestones_files.test.sql` (16): private bucket; milestones by role;
  shared vs unshared vs another project's file; admin; member not on the project; another
  client; anon; unsharing closes a file.

### Downloads

`/api/portal/files/<id>` (route handler): validates the id, requires a portal session (30-day
marker included), reads the `project_files` row with the reader's own session (RLS), and
redirects to a **60-second signed URL** created with that same session (so Storage's rule
applies too). Anything not readable is a plain 404, the same for "missing" and "not
yours"; no session is a 401. `Cache-Control: private, no-store`, no Referer.

### Pages

| Route       | What                                                                                                                                                               |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/timeline` | Month grid from 1024 px (stage column, bars by date, the current stage's done share, Today line); a stage list with range bars below; milestones (Done / Upcoming) |
| `/files`    | Shared files grouped Design (images, archives) / Documents (PDFs), with type, size, who and when; tablet drops "added by"; mobile stacks                           |
| `/updates`  | Newest first in Today / Yesterday / This week / Earlier (Lisbon days); "Needs you" (red border + tag), milestone posts (green), "edited", linked tasks as chips    |

Rules in `content.ts` (unit-tested): `timelineSpan`, `spanPosition`, `stageProgress`,
`fileKind`, `fileGroup`, `formatSize`, `updateDayGroup`, `groupUpdatesByDay`.

### Motion (14 Portal — Motion)

- **Gantt bars** (once a session): bars grow from their start date (scaleX, origin left),
  50 ms apart, 300 ms each (`motionTokens.duration.bar`); the Today line draws down last.
  Reduced motion: final state.
- **New update arrives** (live feed) comes with the updates ticket (#139), which adds the
  Realtime subscription.

## 11. Team projects and new project with client invite (#136)

**What.** The team's landing page lists projects (Figma TM-01, TM-T01, TM-M01), and admins
start a project and invite its client from one modal (TM-04). Code:
`src/features/portal/team/projects/`, page `src/app/team/(workspace)/page.tsx`.

### How a project is created (request flow)

```
New project (client form, lazy chunk)
  → createProjectAction (server action, actions.ts)
  → createProject (create-project.ts: rules, testable with fakes)
      1. viewer is an active admin?                 else forbidden
      2. zod: names, lead, dates, template, 1–10 emails (normalised, de-duplicated)
      3. stages = spreadStages(template, start, launch)   never from the browser
      4. portal_find_client_users(emails)           teammates refused
      5. create the missing auth users              service role, auth administration only
      6. portal_create_project(...)                 ONE transaction: project, lead, stages, clients
         fails → delete the auth users made in step 5; a Project ID collision (23505) retries once
      7. welcome email per client (their language)  a failure keeps the project
         sent → portal_log_invite_sent              Client access log (#141)
  → result: created (Project ID, sent, failed addresses) | invalid | teammate_email | forbidden | failed
```

The SQL function checks everything again: admins only (42501), the lead is an active
teammate (P0002), each client's `user_id` is the auth user **of that same email** (22023, so
a forged call can't attach someone else's account), teammates can't be clients (PT409),
stages in order and inside the project's dates. The Project ID in the modal comes from
`portal_next_project_id()`; it's a suggestion, and if it was taken meanwhile the function
generates a fresh one and returns it.

### Stage templates (`templates.ts`)

One template today, **Standard**: Discovery, Design, Development, Review (weights 2, 3,
8, 3), then Launch (the launch day) and Care (from launch, open-ended). The working
stages share the days up to the day before launch, back to back. The same function draws
the modal's preview and builds the rows on the server. At least 8 days between start
and launch (two per working stage). The team adjusts stages afterwards (#138).

### Welcome email

`src/features/portal/emails/` (React Email): the Project ID, the sign-in link for the
client's language (`/<locale>/portal`), and how sign-in works (email + Project ID, a code
each time). Copy in `Emails.portalWelcome` (EN/PT). The modal's switch can skip it;
resending is on Client access (#141).

### The list (`list.ts`, `data.ts`)

- One query under the teammate's session (RLS: members see only their projects): stages,
  ticket statuses and the newest live update per project.
- Tabs (URL state `?view=`): **Active** (open, launch ahead), **Waiting on client**,
  **Launched** (launch date passed), **Archived** (closed).
- Summary: "N launching before <Month>": launches before the first of the month after
  90 days from today.
- Progress counts every ticket (the team sees team-only tickets too); the client portal's
  counts only client-visible ones.
- Desktop: every column; tablet drops progress, lead and last update; mobile: cards and
  pill tabs. The modal is centred from tablet up and a bottom sheet on mobile.

### Fake backend (e2e)

`projects/e2e-store.ts`: NB-1234 exists; `admin@` / `member@e2e.example` are teammates
(refused as clients); a welcome email to `bounce@e2e.example` fails. Spec:
`tests/e2e/team-projects.spec.ts`.

## 12. Team board and ticket editor (#137)

**What.** A project's board (Figma TM-02, TM-T02, TM-M02) and the ticket editor (TM-02
panel, TM-T02 sheet, TM-M03 full screen), at `/team/projects/<NB-xxxx>/board`. Code:
`src/features/portal/team/board/`. The projects list links each project to its board; the
project's other tabs (Overview, Timeline, Files, Updates, Client access) arrive with
#138–#141 and show the designed 404 until then.

### Database (`20261118120000_portal_ticket_editing.sql`)

- `tickets.updated_by`: who saved last (trigger), so a refused save can name them.
- Ticket versions use the wall clock (`clock_timestamp()`), so the version changes on
  every save, even two in one transaction.
- `portal_save_ticket(...)`: creates a ticket, or saves one **only if `updated_at` still
  equals the version the editor loaded**; otherwise it changes nothing and answers
  `conflict`. Ticket and checklist are saved in one transaction. SECURITY INVOKER, so RLS
  decides (`works_on_project`); the owner must work on the project (22023). Optional
  parameters (ticket, version, owner, due) default to null and come last, so the
  generated types make them optional.
- pgTAP `10_portal_ticket_editing.test.sql` (23): create, stale save refused and nothing
  changed, "keep mine", checklist replaced, owner/teammate/client refusals, and hidden
  tickets (and their checklists) never reaching the client, including after hiding one.

### Edit conflicts (request flow)

```
editor loads ticket (version v1) ──► Save ──► saveTicketAction ──► portal_save_ticket(v1)
                                                        │
             someone saved meanwhile (v2) ◄── 'conflict'┘
                │ read the ticket as saved now + who saved it (getEditableTicket)
                ▼
  editor: describeConflict(loaded v1, current v2)  → "Ana Costa changed the due date to
          22 Nov while you were editing."   [See their change]  [Keep mine]
          · See their change: load v2 into the form
          · Keep mine: save this person's values with version v2
```

The form never loses what was typed. A failed save shows "Ticket · save failed" with
Retry. `describeConflict` lives in `conflict.ts` (no zod) because the browser runs it.

### Board

- Columns: To do, In progress, In review, Done. A **blocked** ticket stays in In progress
  with a "Blocked" marker (its status is still Blocked).
- Filters are URL state: `?stage=`, `?owner=` (`none` = unassigned), `?status=` (mobile:
  one status at a time), and the open ticket `?ticket=18` or `?ticket=new`.
- Columns show their first cards and "+N more" (a button that expands the column).
- **Moving a ticket:** drag with a mouse on desktop (native HTML drag and drop), or the
  card's status menu (Radix DropdownMenu: arrow keys, Esc, focus return) everywhere; on
  mobile the card's status pill opens that menu. A move shows at once (optimistic), is
  undone if the server refuses, and is announced in a live region. A move is one field
  and last-write-wins, but it bumps the version, so an open editor sees it before
  overwriting. No drag library: keyboard and touch never need drag.
- Motion ("Board drag"): the dragged card lifts (1.02 + shadow, 150 ms); neighbours make
  room with a layout spring (400/30). Layout animations need Motion's `domMax`, which the
  board loads in its own nested `LazyMotion` (`motion-features-max.ts`), so no other page
  pays for it. Reduced motion: no lift, instant reorder.

### Editor

Title, status, due, stage, owner, description, checklist (add, tick, remove), "Visible to
the client", delete. Delete is guarded and says what the client loses (or that they never
saw it). Below 1024 px the column is hidden before hydration, so phones never see it flash
before the full-screen editor. Esc while adding a checklist item cancels that item, not
the editor.

### Fake backend (e2e)

`board/e2e-store.ts`: NB-1234 built from the client fixture with real UUIDs and a version
per ticket (a stale save is refused there too). Spec: `tests/e2e/team-board.spec.ts`; each
test creates its own ticket because the store is shared per server. The concurrency test
uses two browser contexts (admin and member).

## 13. Stage management and the team project overview (#138)

**What.** A project's overview for the team (Figma TM-07) at `/team/projects/<NB-xxxx>`,
and its timeline with stage management (TM-05, TM-05b) at `…/timeline`. Code:
`src/features/portal/team/plan/`. The projects list now opens the overview.

### Database (`20261119120000_portal_stage_management.sql`)

All SECURITY INVOKER, so RLS decides (`works_on_project`) and updates are posted as the
teammate (`updates_team_insert` checks `author_id`).

| Function                                               | What it does                                                                                                                                                                                                                                                                              |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `portal_set_stage_dates`                               | Changes an open stage's dates; a finished stage is locked (PT409).                                                                                                                                                                                                                        |
| `portal_reopen_stage`                                  | Makes a finished stage open again.                                                                                                                                                                                                                                                        |
| `portal_complete_stage`                                | **One transaction**: only the current stage (PT409 otherwise); ends it today if planned later; starts the next stage today if planned later; moves open tickets to the next stage (keeping their status) or leaves them; posts an optional milestone update. Any failure changes nothing. |
| `portal_set_project_health` / `portal_set_launch_date` | Change the project and post an optional update in the same transaction (waiting on the client marks it "Needs you").                                                                                                                                                                      |

Today is Lisbon's date (`private.lisbon_today()`). pgTAP `11_portal_stage_management.test.sql`
(24): who may change the plan, locked stages, a failing completion leaves everything as it
was, a full completion, reopen, health and launch.

### Rules (`plan.ts`, unit-tested)

- **Progress:** every ticket for the team; only client-visible ones for the client (shown
  side by side: "The client sees 14 of 28").
- **Health suggestion:** waiting on the client (a ticket blocked on them) → at risk
  (tickets past due, or the current stage past its planned end) → on track. The team
  chooses; the suggestion only explains.
- **Attention list:** blocked on the client for N days, a client who hasn't signed in 3+
  days after the invite, a ticket in review for 3+ days. "Since" uses the ticket's last
  change (no status history yet).
- **Completion plan:** what's open in the current stage, the next stage, and whether
  completing now is early.

### Telling the client

Health, launch date and completing a stage open an editable update with "Email the
client" (on by default). The change and the update are saved together; the email
(`src/features/portal/emails/portal-update.tsx`, EN/PT, reused by #139) goes after, to
every invited or active client in their language. A failed email never undoes the change:
the result says so ("Saved, but the email didn't go out").

### Pages

- **Overview:** needs attention (with "Open ticket"), KPIs (progress ring, current
  stage, this week, launch; 4 → 2 × 2 → stacked), the stage track, open work in the
  current stage, latest updates. The ring and the track play once a session, keyed apart
  from the client portal's.
- **Timeline:** health (a radio group with arrow keys) with its suggestion, the launch
  target, and the stages table (dates save when a field is left; Reopen; Complete stage).
  Rows stack below 768 px; the Complete stage dialog is a bottom sheet on mobile.

### Fake backend (e2e)

The board's fake store holds a mutable plan (`fakePlan`); `plan/e2e-store.ts` applies the
actions. Spec: `tests/e2e/team-plan.spec.ts`; tests that change the plan run on desktop
only and put it back.

## 14. Project updates, "Needs you" emails and the daily digest (#139)

**What.** The team posts updates (Figma TM-03, TM-M04), manages them on the project's
Updates tab (TM-10), and clients hear about them: straight away for "Needs you" posts, and
once a day in a digest (TM-13 "Client digest · Daily at 18:00"). Code:
`src/features/portal/team/updates/`, `src/features/portal/digest/`,
`src/app/api/portal/digest/route.ts`.

### Database (`20261120120000_portal_updates_digest.sql`)

- `portal_post_update`, `portal_edit_update` (sets `edited_at`, replaces links),
  `portal_delete_update` (sets `deleted_at`: gone from the client feed, kept as a record).
  SECURITY INVOKER: RLS decides; linked tickets must be on the same project (composite FK).
- `private.portal_digest_log` (client, Lisbon day) and `portal_claim_digests(secret)`:
  SECURITY DEFINER, granted to `anon`, safe because it checks the cron secret in SQL (Vault
  `portal_cron_secret`). It **claims** each due client's digest for today before returning
  it, so the unique (client, day) key makes the digest at-most-once per client per day.
- pgTAP `12_portal_updates_digest.test.sql` (22).

### Posting (request flow)

```
Post update dialog → postUpdateAction → postUpdate (updates-edit.ts)
  → portal_post_update (post + links, one transaction)
  → "Needs you"? → notifyClients (team/notify.ts): one email per client, their language,
    subject "<project>: <author> needs something from you"
  → toast: posted / posted and emailed / posted but the email didn't go out
```

An edit emails only if it newly asks the client for something. Every other post reaches
the client in the evening digest. The dialog previews the post exactly as the client sees
it (Needs you red, milestone green, linked tasks).

### The daily digest

```
Vercel Cron  0 17,18 * * *  (vercel.json)  →  GET /api/portal/digest
  Authorization: Bearer <CRON_SECRET>      → 401 / 503 otherwise (constant-time compare)
  before 18:00 Lisbon                      → not_due (the winter 17:00 UTC run)
  portal_claim_digests(CRON_SECRET)        → SQL checks the secret again, claims, returns
  one email per claimed client (renderPortalDigest, Lisbon times)  → counts only
```

Two cron times cover 18:00 Lisbon in winter (UTC+0) and summer (UTC+1); the claim makes
the second run harmless. A failed send is counted and reported by code, not retried that
day. The Settings toggle (`portal_settings.daily_digest`) switches it off; the Settings
page itself is #142. Requests never wait for the digest: it runs on its own.

### New update arrives (client feed)

`overview/components/feed-refresher.tsx` refreshes the client's feed every 30 s while the
tab is visible, and at once when the client returns to the tab (lead's decision, 2026-11-15:
keep refreshing for launch, revisit Realtime after launch); new posts fade up 8 px (250 ms) and are announced. Not Supabase Realtime:
the session is in httpOnly cookies, and a Realtime socket in the browser would need the
session token exposed to page scripts. Logged as a decision for the lead.

### Setup per environment

`CRON_SECRET` (32+ characters) in Vercel, and the same value in that Supabase project's
Vault: `select vault.create_secret('<CRON_SECRET>', 'portal_cron_secret');`
(docs/guides/environments.md).
