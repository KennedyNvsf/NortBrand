# Client portal

**Covers:** #131 (client sign-in), #132 (team sign-in and roles). Later portal tickets
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
