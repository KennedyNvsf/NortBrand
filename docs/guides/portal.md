# Client portal

**Covers:** #131 (client sign-in), #132 (team sign-in and roles), #133 (shells and
states), #134 (overview and tasks), #135 (timeline, files and updates), #136 (team projects and new project), #137 (team board and ticket editor), #138 (stage management and the team overview), #139 (updates, Needs you emails and the digest), #140 (files with private storage), #141 (client access). Later portal tickets
extend this guide. **Source:**
ADR-009, Figma 12 Portal — Client (`516:2`), 14 Portal — Motion (`566:127`). The data model
is in the [Database guide](./database.md) § 7.

## 1. What we built

- **Client Portal** ("Track Project" until #77) in the site navigation (desktop nav and the tablet/mobile menu, not
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
  can't time-box them. Since #159 a client's length is Settings › "Stay signed in for",
  signed into the marker at sign-in (§ 18).
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
| `tests/e2e/routes.ts`                                      | Client Portal runs through the page harness (EN/PT, axe, one H1, overflow, tap targets)                                                                                                                                                                                             |

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
page (TM-12, #142, § 17) build on it.

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
  settings/page.tsx  member → ReadOnlyNotice; admin → the settings (#159)
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

One template, **Standard**, stored in `portal_stage_template` and edited in Settings
since #159 (§ 18): Discovery, Design, Development, Review (2, 3, 6 and 3 weeks, used as
weights), then Launch (the launch day) and Support (from launch, open-ended; "Care" until #77). The working
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

## 15. Portal files with private storage (#140)

**What.** The team uploads, shares, renames and deletes a project's files on its Files tab
(Figma TM-08); clients see shared files on theirs (#135). Code: `src/features/portal/team/files/`,
page `src/app/team/(workspace)/projects/[projectId]/files/`.

### Upload (request flow)

```
browser: Upload file / drop
  → prepareUploadAction   name, declared size (≤ 50 MB) and type checked → new file id
                          → signed upload URL for projects/<project>/<file id>
                            (team session; Storage refuses any other folder)
  → PUT the bytes straight to Storage   (Vercel functions take at most 4.5 MB)
  → finishUploadAction    read the object's first 16 bytes and true size (signed URL +
                          Range); not really PDF/PNG/JPEG/WebP/GIF/ZIP, or over 50 MB
                          → delete it, refuse; else portal_register_file → team-only
```

The upload's name and declared type are never trusted: `magic.ts` decides from the bytes.
SVG is not accepted (it can't be checked by its first bytes and can carry script); it is
also removed from the bucket's allowed types. The bucket's own 50 MB limit backs this up.

### Database and Storage (`20261121120000_portal_files_upload.sql`)

- Storage rules by path (`private.portal_file_project(name)`): the team working on a
  project may read, upload and delete under `projects/<that project>/`. The read rule is
  what lets the server check an upload before it has a row. Clients still read only
  through `portal_files_read` (#135): shared files of their own projects.
- `portal_register_file` (SECURITY INVOKER): registers an existing, checked object as a
  team-only file by the signed-in teammate.
- pgTAP `13_portal_files_upload.test.sql` (18): team upload only into its own projects'
  folders and only in the exact path shape, reading unregistered uploads, registration
  needs the object, SVG refused, clients can't upload, list, read or delete team-only or
  other projects' files, delete only by the project's team.

### Manage

The file menu shares or makes team-only, renames, and deletes after saying what the
client loses. Delete removes the row first (the client loses access at once), then the
object; a stuck object is reported as an orphan. Downloads go through
`/api/portal/files/<id>` (60-second signed URL, #135) for the team as for clients.

### Fake backend (e2e)

`files/e2e-store.ts` keeps each "upload"'s first bytes and size; the browser PUTs to
`/api/portal/files/fake-upload` (404 outside the fake backend). Spec:
`tests/e2e/team-files.spec.ts` (real PDF uploaded team-only, shared, renamed, deleted; a
text file named .pdf refused; a client refused a team-only file).

## 16. Client access (#141)

**What.** The project's Client access tab (Figma TM-06 `543:369`, guarded states TM-09
`547:612`) at `/team/projects/<NB-xxxx>/access`: the people who can sign in, the Project
ID, and the last 30 days of sign-in activity. Admins add people, resend invites, lift a
sign-in pause, remove people and regenerate the Project ID; members see the page
read-only. Code: `src/features/portal/team/client-access/`.

### Rotating the Project ID (the important part)

```
admin: Regenerate ID → confirm
  → portal_rotate_project_id   new NB-xxxx, projects.clients_signed_out_at = now(),
                               access_events 'project_id_rotated', returns the people
  → every person gets the welcome email in its "new Project ID" form (newId: true)
client, next request:
  → private.is_project_client  accepts only a session (JWT session_id → auth.sessions)
                               created after clients_signed_out_at
  → RLS returns nothing → the client layout sees no readable project at all
  → /portal?reason=signed-out  ("You've been signed out"); they sign in with the new ID
```

Why a cut-off and not deleting sessions: deleting `auth.sessions` would sign the same
person out of their _other_ projects too, and the access token would keep working until
it expires (up to an hour). The cut-off is checked by RLS on every query, so it applies at
once and only to this project. A refreshed token keeps its session, so it stays refused.
Projects that were never rotated have no cut-off and skip the session lookup.

### People

- **Add** (`add-person.ts`, tested): admin only → email checked → the existing auth user
  is reused, or one is created (service role, auth administration only, ADR-009) →
  `portal_add_client` (a removed person comes back as invited) → welcome email →
  `portal_log_invite_sent`. If adding fails, a newly created auth user is deleted again.
  A failed email keeps the person and says "use Resend invite".
- **Remove**: `portal_remove_client`. A trigger (`private.keep_one_client`) refuses to
  remove, or delete, the last person who can sign in (invited or active), so a direct
  update by an admin is refused too. The page mirrors it (`canRemove`): the dialog says
  why and offers "Add someone first" instead of "Remove anyway" (deviation from TM-09,
  following the ticket; in tech debt).
- **Unlock now**: `portal_clear_lockout` deletes the pause; the person asks for a new code.
  `portal_client_lockouts` lists who is paused for the project's team.

### Activity

`access_events` for the last 30 days (at most 100), newest first, with the teammate who
acted. Sign-in trouble ("too many wrong codes") is shown in red with its text.

### Tests

- pgTAP `14_portal_client_access.test.sql` (22): roles, add/re-add/duplicate, the last
  person (function and direct update), lockouts, and rotation: the old session loses the
  project, the person's other project is unaffected, a token without a session id is
  refused, and a new session gets access back.
- Unit: `access-rules.test.ts`, `add-person.test.ts`, the new-ID email in `render.test.ts`.
- e2e `team-access.spec.ts` (fake backend, `client-access/e2e-store.ts`): the page, add
  with inline errors, duplicate refused, remove, regenerate after a warning, members
  read-only, axe, 390 px and touch targets. The fake rotation changes only the ID the
  page shows, so other specs keep using NB-1234.

## 17. My tickets, Team and search (#142)

**What.** Three team-workspace pieces (Figma 13 Portal — Team `528:188`): **My tickets**
(TM-11 `545:541`, phones TM-M05 `560:871`) at `/team/my-tickets`, the full **Team** page
(TM-12 `545:850`) at `/team/team`, and **search** (⌘K / Ctrl+K) from the top bar, with the
"what search covers" empty state from TM-09 (`547:612`). Settings is #159 and View as
client is #160 (lead's decision, 2026-11-21). Code: `src/features/portal/team/my-tickets/`,
`people/` and `search/`; SQL in `20261123120000_portal_team_workspace.sql`.

### My tickets (request flow)

```
/team/my-tickets  (workspace layout: getTeamShell → signed in?)
  getMyTickets(viewer.userId)   tickets owned by me, not done, on active projects,
                                read under my session (RLS: only projects I work on), ≤ 200
  groupMyTickets(rows, today)   my-tickets.ts (pure, unit-tested), Lisbon dates:
                                  Overdue    due before today
                                  This week  today … Sunday of this week
                                  Later      after Sunday, or no due date (last)
  MyTicketsView                 summary line, one section per group; each row shows
                                status, project, "Team only" and the due date and links
                                to /team/projects/<NB-xxxx>/board?ticket=N
```

Only Later folds: it shows 5 and a "Show N more" button (client state, no fetch).
Empty groups are left out; with no tickets at all the page shows the shared EmptyState.

### Team page

- **Read:** `getTeamOverview()` (`people/data.ts`) calls `portal_team_overview()`
  (SECURITY DEFINER, teammates only, `42501` otherwise). It returns each active teammate's
  role, the active projects they work on (admins: all), open tickets and **last active**,
  which is `auth.users.last_sign_in_at`: only a definer function can read `auth`. The
  label ("Now", "12 min ago", "Today, 10:02", a date) is `last-active.ts` (tested).
- **Role cards and table** (`people/components/team-table.tsx`): the role cards count
  admins and members; below 1024 the table drops the secondary columns (projects, last
  active), and below 768 each row becomes a card (Portal responsive rules `560:2243`).
- **Invite and remove** are the #132 flows (`team-roster.tsx`); the invite form now opens
  from "Invite teammate", as in TM-12. Members see everything read-only.
- **Role change** (admins only):

```
admin picks a role → setTeamRoleAction (people/actions.ts)
  → setTeamRole (roles.ts, tested)   viewer is admin? zod (uuid, admin|member)
  → portal_set_team_role             require_team_admin(); advisory lock, so two admins
                                     can't demote each other at the same moment;
                                     refuses to demote the last active admin (PT409
                                     last_admin)
  → "saved" → router.refresh()  |  refused: forbidden / lastAdmin / notFound / failed
```

The check is in the action and in SQL; the SQL one is the one that counts.

### Search

```
⌘K, or the top-bar field (tablet+) / icon (phones)
  SearchLauncher   the dialog is a next/dynamic chunk, prefetched when the browser is idle
                   or on hover/focus, mounted the first time it opens
  SearchDialog     debounced; under 2 characters nothing is sent; no hits → "No results
                   for …" with what search covers (TM-09)
  searchAction     signed-in teammate? zod (2–80 chars) → rpc portal_search
  portal_search    SECURITY INVOKER: projects (name, Project ID, client) ≤ 8 and ticket
                   titles ≤ 12, read through RLS, so a member never finds a project
                   they aren't on. Typed % and _ are literal. Clients get nothing.
  results          projects → /team/projects/<NB-xxxx>; tickets → …/board?ticket=N;
                   Enter opens the first one
```

Why INVOKER and not a definer function with its own checks: the RLS policies already say
who may read a project or ticket. Running as the caller reuses them, so search can never
drift from what the board and overview show.

### Tests

- pgTAP `15_portal_team_workspace.test.sql` (14): search finds a member's own project
  (Project ID in any case) and its tickets, team-only ones included, never another
  project by name or ID, treats `%` as a literal and gives clients nothing; the overview
  is teammates only (admins first, done tickets not counted, last sign-in); role change
  is admin only, the last admin can't step down, and can once there is a second admin.
- Unit: `my-tickets.test.ts` (groups, Sunday edge, sorting), `last-active.test.ts`,
  `roles.test.ts` (forbidden, last admin, error mapping).
- e2e `team-workspace.spec.ts` (fake backend): My tickets groups and opening a ticket on
  its board, the Team table and an invited teammate's role change, members read-only,
  search with ⌘K by ticket title and Project ID, the no-results state, Enter opening the
  first hit, axe, 390 px and touch targets. `team-sign-in.spec.ts`
  follows the new invite button and the table.

### Extending

- A new searchable thing: add a branch to `portal_search` (keep it INVOKER), a `kind` in
  `search.ts` (`toHits`), and a row in the dialog. Add a pgTAP case for a user who must
  not see it.
- Settings (#159) adds its own route; the role rules stay in `portal_set_team_role`.

## 18. Workspace Settings (#159)

**What.** The team's Settings page (Figma TM-13 `546:583`) at `/team/settings`, and the
members' state (TM-09 "Settings · members" `547:612`). Admins edit; members see the same
values read-only under the TM-09 notice, and the server refuses their saves. Code:
`src/features/portal/team/settings/`; SQL in `20261124120000_portal_workspace_settings.sql`.
Split from #142; View as client is #160.

### Where each setting takes effect

| Setting (TM-13)                    | Stored in                                     | Read by                                                        |
| ---------------------------------- | --------------------------------------------- | -------------------------------------------------------------- |
| Codes expire after                 | Supabase Auth (OTP expiry, `config.toml`)     | Shown read-only (lead's decision, 2026-11-21)                  |
| Wrong codes allowed                | `portal_settings.code_max_tries`              | `portal_register_wrong_code` (client and team, SQL)            |
| Pause after too many tries         | `portal_settings.lockout_minutes`             | `private.portal_is_locked` and the team equivalent (SQL)       |
| Stay signed in for                 | `portal_settings.session_days`                | Client sign-in → the session marker (below)                    |
| Client digest                      | `portal_settings.daily_digest`                | `portal_claim_digests` returns nothing while off (SQL, #139)   |
| "Needs you" posts email right away | Always on                                     | `team/notify.ts` (#139); shown locked as in Figma              |
| Tell me when a client signs in …   | `portal_settings.notify_first_client_sign_in` | `portal_complete_client_sign_in` → the project lead's email    |
| Allowed team domain (not in TM-13) | `portal_settings.allowed_team_domain`         | The `team_members` trigger and the invite check (#132)         |
| Stage template                     | `portal_stage_template`                       | New projects (`create-project.ts`) and the new-project preview |

### Saving (request flow)

```
SettingsForm (client)  values as Selects/Switches/Input; "Edit template" opens the editor
  checkSettings()      rules.ts (zod-free, shared with the server): domain, names, weeks,
                       one or more working stages then Launch then Support, unique names
  saveSettingsAction   settings.ts: admin? → zod → rpc portal_save_settings
  portal_save_settings SECURITY DEFINER, require_team_admin(); locks the settings row,
                       refuses a stale save (PT409 stale_settings: the updated_at the
                       page loaded no longer matches); validates the template; updates
                       every setting and replaces the template in one transaction
  saved → toast "Settings saved" → router.refresh(); the page keys the form by updatedAt,
          so it remounts clean from what's stored
  refused → field errors inline (template errors open the editor), or the form error:
            forbidden / stale ("Discard to load theirs") / failed
```

Discard resets the form and refreshes, which also loads another admin's newer save.

### Session length

Clients' sessions last `session_days` from their next sign-in.
`portal_complete_client_sign_in` (SECURITY DEFINER, run with the client's new session)
now returns a row: the project, the session length, and the first sign-in notice. The
action signs the length into the marker: `<issued at>.<days>.<HMAC over
user|issued|days>` (`session-marker.ts`), so it can't be stretched. Markers from before
#159 (`<issued>.<signature>`) still count for 30 days. Teammates keep 30 days: the
setting sits under "Client sign-in".

A shorter setting doesn't cut sessions that already exist; they end at the length they
were signed with (at most 90 days). Rotating a project's Project ID (#141) is the way to
sign a project's clients out at once.

### First client sign-in email

```
client verifies their code → portal_complete_client_sign_in
  reads the client row before updating it: last_sign_in_at is null → first sign-in
  setting on and the project lead active → notify_email / notify_name in the result
parseCompletion (completion.ts, tested)  also accepts the pre-#159 answer (a bare uuid),
                                          so sign-in works while a deploy waits for its
                                          migration
after() → notifyFirstSignIn (first-sign-in.ts) → renderPortalFirstSignIn → Resend
```

The email goes to the **project lead** (lead's decision, 2026-11-22), in English (team
emails), and links the project's Client access page. It runs after the response, so a
failed email never affects sign-in; only Resend's error code is reported. The lead's
address stays on the server. A client re-added after removal (#141) counts as new.

### Stage template

`portal_stage_template` (position, name, kind `work`/`launch`/`after`, weeks for working
stages only), seeded with Figma's Standard: Discovery 2, Design 3, Development 6, Review 3
weeks, Launch, Support (renamed from Care by migration 20261126130000, #77). Weeks are **weights**: `spreadStages` (`templates.ts`) shares the
days between start and launch in proportion, as before. Launch stays the launch day and
Support has no end (lead's decision, 2026-11-22; Figma showed "Launch · 1 week").
Teammates read it through RLS; nobody writes it except `portal_save_settings`. The page
and the create action read it with `getStageTemplate()` (`settings/data.ts`), which falls
back to `DEFAULT_STAGE_TEMPLATE` if the stored one can't be read. Existing projects keep
their stages.

The editor (not drawn in TM-13): rename any stage; weeks (1–52) for working stages; add a
working stage (inserted before Launch, up to 12 stages), remove (at least one working
stage stays), move up or down among the working stages.

### Layout

TM-13 has no tablet or phone frames; the Portal responsive rules apply: one column (at
most 768 px), each row's label on the left and control on the right, the domain field
under its label on phones, Save and Discard stacked full width on phones. Members'
controls are disabled (one `fieldset`), so the values are readable but not operable.

### Tests

- pgTAP `16_portal_workspace_settings.test.sql` (23): members, clients and the public key
  can't save, nobody writes the template directly; stale saves, bad orders, repeated
  names, zero weeks and out-of-range values are refused and change nothing; a save stores
  everything (domain trimmed and lower-cased) and replaces the template in order; **each
  value takes effect:** two tries pause on the second miss, the pause length decides
  whether sign-in is still paused, a client's first sign-in returns the saved session
  length and the lead to tell, later sign-ins and the setting off tell nobody. Test 06
  follows the new return shape. The digest switch stays in test 12.
- Unit: `settings.test.ts` (save flow, error mapping, rules, `toTemplate`),
  `session-marker.test.ts` (length signed in, can't be stretched, legacy markers),
  `completion.test.ts`, `templates.test.ts` (weeks as weights, an edited template),
  `render.test.ts` (the lead's email).
- e2e `team-settings.spec.ts` (fake backend): every TM-13 setting shown, the template
  editor's checks and Discard, a save that survives a reload (desktop only, undone at the
  end; the template is never saved there because the fake store is shared), members
  read-only under the notice, axe, 390 px and touch targets.

### Extending

- A new setting: a column on `portal_settings` (with a check constraint), a parameter on
  `portal_save_settings`, the field in `settings.ts` (zod) and `rules.ts`, a row in the
  form, and a pgTAP case proving it takes effect.
- Several templates later: add a template key column to `portal_stage_template` and map
  `STAGE_TEMPLATE_IDS` to it; the new-project select already sends an id.

## 19. View as client (#160)

**What.** "View as client" on every team project page (Figma TM-07 `544:402`, a ghost
button before Post update and New ticket) opens a read-only preview of that project's
client portal: overview, tasks (with the task detail), timeline, files and updates, in
the client portal's own frame, under a banner that reads "Previewing as the client ·
read-only", with an EN/PT switch and "Back to project". Lead's decision 2026-11-15; split
from #142 on 2026-11-21. Code: `src/features/portal/preview/`; SQL in
`20261125120000_portal_client_preview.sql`.

### Why the filter lives in SQL

RLS shows the team everything, so a teammate reading the tables gets team-only tickets,
unshared files and deleted posts. The preview can't impersonate a client (no client
accounts for the team, ADR-009), so the client's view is computed in the database by
`portal_client_preview(public_id)`, which applies the same rules as the client policies:

| Data                  | Client policy (#130, #135)         | In the preview                                      |
| --------------------- | ---------------------------------- | --------------------------------------------------- |
| tickets               | `client_visible`                   | `client_visible` only                               |
| checklist items       | of a client-visible ticket         | of client-visible tickets only                      |
| updates               | `deleted_at is null`               | live only, newest 20 (like the client's read)       |
| update ↔ ticket links | live update, client-visible ticket | links to client-visible tickets only                |
| files                 | `shared`                           | shared only (and the count)                         |
| stages, milestones    | all of the project                 | all of the project                                  |
| teammates (names)     | the project's team                 | the project's team; anyone else reads as the studio |

It is **SECURITY INVOKER**: the caller's own RLS still applies on top, and it returns
null unless `private.works_on_project` (admins: every project; members: their projects).
A client, or a member who isn't on the project, gets nothing. It writes nothing.

### Request flow

```
"View as client"  → /team/projects/<NB-xxxx>/preview
  page.tsx         team session? → portal_client_preview → redirect to /preview/<lang>,
                   the language most of the project's clients use (pt if none)
/preview/<en|pt>/… layout: PreviewGate (preview/gate.tsx)
  getTeamShell()   no team session → /team/sign-in
  getPreviewBundle (preview/data.ts, cached per request) → rpc → zod → the client
                   screens' own types (ProjectView, checklists, milestones, files, shell)
  null → 404; a read error → "We couldn't load the preview" (Sentry, code only)
  MotionProvider + <div lang> + ClientShell(preview: base, banner) → the page
pages              the client views themselves (OverviewView, TasksView, TimelineView,
                   FilesView, UpdatesView) with preview={{ base, publicId }}
```

The client views take an optional `preview` target (`overview/scope.ts`): their data
functions (`getProjectView`, `getChecklist`, `getMilestones`, `getProjectFiles`) read the
preview bundle instead of the client's RLS tables, and their links start from the
preview's base (`portalBase`). They always pass the locale to `getTranslations`, so the
same screens render in EN or PT outside the `/[locale]` routes. The client shell's copy
comes from `getClientShellCopy(locale)` (`shell/shell-copy.ts`), shared with the client
layout. In preview the shell has no account menu (nobody is signed in as the client)
and its project switcher holds only this project; "Message your team" stays a mailto:
to the lead, as the client sees it.

The language is a path segment, so every link inside the screens keeps it; the switch
(`language-switch.tsx`, a small client component) swaps the segment in the current URL
and keeps the section and its query (`?task=3`). The banner is team UI, so English.

### Read-only

The client screens have no actions (the client portal is read-only). Downloads still go
through `/api/portal/files/<id>` with the teammate's session; only shared files are
listed. Nothing in the preview calls a write, and the SQL function can't write.

### Also in the migration

`portal_stage_template` (#159) had kept Supabase's default table grants (including
`anon` SELECT); RLS already refused every read and write outside the team, but the
grants now match the other portal tables: `revoke all` from `anon` and `authenticated`,
then `select` for `authenticated`.

### Tests

- pgTAP `17_portal_client_preview.test.sql` (22): the public key can't call it; a
  client, a member off the project and an unknown ID get nothing; an admin previews any
  project; for the lead, the preview holds the client-visible tickets, their checklist,
  the live updates (newest first) with links only to visible tickets, the shared files
  and count, every stage and milestone, the project's team, and no team-only text
  anywhere. **The same rows are then read under a client's session** (tickets,
  checklist, updates, links, files, teammates), so the preview equals what the client
  policies return. The opening language comes from the clients.
- Unit `preview.test.ts`: reshaping (names only for the project's team, the shell's
  lead and counts, the language), a malformed answer is refused, the language swap
  keeps section and query, `portalBase`.
- e2e `team-preview.spec.ts` (fake backend): from the project page to `/preview/pt`,
  the banner and `lang`, no team actions, account or forms, EN/PT keeps the section,
  every section opens, Back to project, sign-in required, an unknown project or
  language is the not-found page, axe, 390 px and touch targets. The client portal
  specs still pass on the shared views.

### Extending

- A new client screen: take `preview?: PreviewTarget` in its view, read through a data
  function that checks it, add the data to `portal_client_preview` with the same rule as
  its client policy, and a pgTAP pair (preview vs a client's session).
- If a client policy changes, change `portal_client_preview` in the same migration;
  test 17 compares the two.

## 20. Archive and delete a project (#165)

**What.** Admins can **archive** a client project (and restore it) or **delete it
permanently**, from a "Manage project" card at the bottom of the team project overview.
Lead's decisions, 2026-11-22: both actions; on delete, a client's sign-in account goes
only when this was their only project. Not drawn in Figma: the card follows the
overview's cards, the dialogs follow TM-09 "Ticket · delete" (`547:664`). Code:
`src/features/portal/team/projects/lifecycle.ts` (rules), `lifecycle-actions.ts`,
`components/manage-project.tsx`; SQL in `20261126120000_portal_archive_delete_projects.sql`.

### Archive and restore

```
"Archive project" → ConfirmDialog (focus on Cancel) → setProjectStatusAction
  setProjectStatus (lifecycle.ts)  admin? zod (uuid, active|closed)
  portal_set_project_status        SECURITY DEFINER, require_team_admin(); P0002 if gone
  → toast, router.refresh()
```

An archived project (`status = 'closed'`):

- **disappears for its clients**: `private.is_project_client` already required an active
  project (#141), so RLS hides it everywhere and the client portal treats them as
  signed out of it;
- **is read-only for the team**: every team write policy (projects, stages, tickets,
  checklist items, updates, update links, files, milestones) now checks
  `private.can_edit_project` = works on the project **and** it's active. The header
  shows "Archived · read-only" instead of View as client, Post update and New ticket;
- moves to the Archived tab of the projects list (#133 already sorted it there);
- keeps everything. Restoring is the same function with `active`.

The status column is no longer updatable directly (`revoke update (status)`), so only
the admin-only function changes it.

### Delete permanently

```
"Delete permanently" → ConfirmDialog with "Type NB-xxxx to confirm" (confirm held
until it matches, any case) → deleteProjectAction → deleteProject (lifecycle.ts):
  admin? zod
  listFiles      Storage list of projects/<id>/ (the admin's session; the Storage read
                 rule lets admins read any project's folder). A failed list doesn't
                 block the delete; the files are reported as left over.
  remove         portal_delete_project (SECURITY DEFINER, require_team_admin()): locks
                 the project, checks the typed ID (22023 confirm_mismatch), lists the
                 clients on no other project (any state but removed) who aren't
                 teammates, deletes the project (every child by ON DELETE CASCADE), and
                 returns those user ids
  removeFiles    Storage remove of the listed paths
  deleteAccount  removeAuthUser per returned id (service role, auth administration
                 only, ADR-009)
  → toast ("… was deleted", or a warning when cleanup didn't finish) → /team
```

Once the row is gone there is no undo, so Storage and account cleanup never turn the
result into a failure: they're reported (codes only) and returned as leftovers. A
client on another project keeps their account and that project.

### Tests

- pgTAP `18_portal_archive_delete_projects.test.sql` (22): the public key and members
  (even the lead) can't archive, change the status directly or delete; an archived
  project is invisible to its client and its tickets too; the team still reads it but
  can't change a ticket or post an update; restored, the client sees it again; delete
  refuses a wrong Project ID and an unknown project (and deletes nothing), accepts the
  ID in any case, returns only the client whose only project it was, removes every
  child row, keeps the other client's other project and leaves other projects alone.
  Every earlier test still passes with the new write policies.
- Unit `lifecycle.test.ts`: role, zod, error mapping, the order of the delete, and
  leftovers when Storage or an account can't be removed.
- e2e `team-lifecycle.spec.ts` (fake backend): an admin creates a project, archives it
  (badge, Archived tab), restores it, and deletes it once the ID is typed (wrong ID
  holds the button; afterwards the page is not found); members get no card. axe, 390 px,
  touch targets. `team-projects.spec.ts` no longer expects an empty Archived tab.

### Extending

- A new project table: give it `project_id … on delete cascade` and a team write
  policy through `private.can_edit_project`, so archive and delete cover it.
- New Storage folders for a project: list and remove them in `deleteProjectAction`.

## 21. Security review before launch (#143)

**What.** The portal's pre-launch review (2026-11-22): IDOR and cross-role attempts on
every server action, route and database function; sessions; Project ID rotation; rate
limits; the service-role key; Storage. Accessibility is in
`docs/accessibility-audit.md` § 6. Result: **every cross-project and cross-role attempt
is refused**, with the tests committed; no open finding.

### Layers, and where each is proven

The portal never relies on one check. A server action checks the caller, and the
database checks again, so a forged or skipped action still can't cross a line.

| Area                     | How it's enforced                                                                                                                                                                                         | Proven by                                                         |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Team server actions (35) | Each starts by reading the team viewer (`getTeamViewer`: an active `team_members` row) and the role where needed; a client session has no row, so every team action answers `forbidden` before any work.  | Unit tests per feature (`*.test.ts`, the `forbidden` cases)       |
| Cross-project data       | RLS on every portal table (`works_on_project`, `is_project_client`); composite foreign keys keep child rows in their project; 38 portal functions check the role or run as the caller.                    | **pgTAP 19** (the sweep), and 05–18 per feature                   |
| Client vs team pages     | Client pages need a client session and marker; team pages need an active teammate; neither session opens the other side.                                                                                  | `portal-security.spec.ts`                                         |
| Sessions                 | A signed marker cookie (HMAC, bound to the user, its length signed in) ends client sessions after Settings' days and team sessions after 30; without it the session counts as signed out.                 | `session-marker.test.ts`; `portal-shell.spec.ts` (signed out)     |
| Project ID rotation      | `projects.clients_signed_out_at`; `is_project_client` accepts only sessions created after it.                                                                                                             | pgTAP 14                                                          |
| Sign-in limits           | Code requests: 10 per IP hash per hour, 200 in total (`PT429`); wrong codes: Settings' tries, then a pause; Supabase Auth: 10 verifications per 5 minutes per IP, 2 emails per hour per address.          | pgTAP 06, 07, 16; `sign-in.test.ts`                               |
| Service-role key         | Only `src/lib/supabase/admin.ts` (`server-only`), only for auth administration; never in a client bundle.                                                                                                 | `pnpm check:bundles` (CI, every PR)                               |
| Storage                  | Private `portal-files` bucket; reads by path follow `project_files` RLS; downloads only through `/api/portal/files/<id>` as a 60-second signed URL with the reader's session; uploads checked by content. | pgTAP 08, 13; `portal-content.spec.ts`, `portal-security.spec.ts` |
| Routes                   | `/api/portal/digest` needs `Bearer CRON_SECRET` (401, or 503 unset); `/api/portal/files/fake-upload` exists only on the fake backend, which is refused on Vercel production.                              | `portal-security.spec.ts`; `src/lib/e2e-backend.ts`               |
| Newer surfaces           | Settings (admin, stale saves refused), View as client (team on the project only, client filter in SQL), archive/delete (admin, typed Project ID).                                                         | pgTAP 16, 17, 18; and the sweep                                   |

### The sweep (pgTAP 19)

Two attackers against project B: a **member who works only on project A**, and a
**client of project A**. The member tries every project-scoped function (tickets,
updates, health, launch, stages, files, client access, rotation, archive, delete) on B,
direct inserts into B's tables, a ticket in A pointing at B's stage, and direct updates
and deletes on B's rows. The client tries the same on their own project and on B, plus
every team-only function (overview, roles, invites, settings, create project, account
look-ups). Every attempt raises. The one function that doesn't is
`portal_complete_team_sign_in`, which by design answers `null` (no role) to anyone who
isn't a teammate and records nothing. Finally, a checksum of all of B's rows, the
settings and the team, taken as the owner before and after, must match, so a statement
that "succeeded" while touching nothing can't hide a leak.

### Findings

| Finding                                                                                                   | Severity | Status        |
| --------------------------------------------------------------------------------------------------------- | -------- | ------------- |
| `portal_stage_template` kept Supabase's default grants (incl. `anon` select); RLS already blocked access. | Low      | Fixed in #160 |
| Members could change `projects.status` directly through a column grant.                                   | Medium   | Fixed in #165 |
| The client task detail scrolled sideways at 390 (accessibility, 1.4.10 Reflow).                           | Low      | Fixed in #143 |

No finding is open. Known limits stay in `docs/tech-debt.md` (for example, editors on an
archived project open and their saves are refused).

### Not covered

Load testing (out of scope). A person still has to do the screen-reader and real-iOS
passes (`docs/accessibility-audit.md` § 5).

### Extending

- A new team action: start with the viewer (and role) check in its domain function, add
  its `forbidden` unit case, and add it to pgTAP 19 if it reaches the database.
- A new portal table or function: add an attempt from both attackers to pgTAP 19 and,
  if it holds project data, include the table in the checksum.
