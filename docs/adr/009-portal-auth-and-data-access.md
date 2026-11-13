# ADR-009: Portal sign-in with Supabase Auth, and project-scoped data access

- Status: Accepted
- Date: 2026-11-13
- Ticket: #129 (milestone M6 — Client portal)
- Amends: ADR-002 (portal tables use RLS policies; a service-role key exists, for auth
  administration only). Replaces CLAUDE.md's "No auth in the MVP".
- Adds to: ADR-006 (the proxy also refreshes portal sessions; locale behaviour is
  unchanged).

## Context

The lead approved a Client and Team Portal on 2026-11-13 (Figma 12 Portal — Client
`516:2`, 13 Portal — Team `528:188`). The launch moved to 10 December 2026 to include it.

- **Clients** follow their project: stages, tasks, files and updates. Each person signs in
  with their own email and the project's Project ID (`NB-4821`), then a 6-digit code. A
  code lasts 10 minutes; 3 wrong tries cancel it and pause sign-in for 15 minutes.
  Sessions last 30 days on a device. Errors never say whether the email or the ID was
  wrong.
- **The team** manages projects, tickets, stages, files, updates and client access, as an
  admin or a member.
- Until now the site had no logins: RLS with no policies, and no service-role key in the
  app (ADR-002). Client project data is private and per project, so the project is the
  tenant boundary.

## Decision

1. **Supabase Auth, email one-time codes, for both audiences.** No passwords and no magic
   links: mail scanners open links, and the newsletter already acts only on a button press
   for the same reason. **Sign-ups stay off** in every Supabase project; users are created
   only by invitation (point 5).
2. **Client sign-in.** A server action validates the email and Project ID with zod, then a
   `SECURITY DEFINER` function checks that the email is an active client of an open
   project. It returns only yes or no, and every failure gets one message. On yes, the
   action asks Supabase for a code with `shouldCreateUser: false`. Wrong tries and pauses
   are counted in SQL, logged in the project's activity log, and enforced on the server.
   The code lifetime (10 min) and session length (30 days) are Supabase Auth settings
   (environments guide § 2).
3. **Team sign-in is invite-only.** An admin invites a teammate by any email (lead's
   decision, 2026-11-13). An optional allowed-domain setting, off by default, can restrict
   invites once NortBrand has mailboxes on `nortbrand.pt` (`nortbrand.com` is not ours,
   ADR-008). Roles (`admin`, `member`) live in a `team_members` table and are enforced in
   RLS and SQL functions, and checked again in every server action.
4. **Data access.** Portal tables have RLS **on, with policies**, written through stable
   `SECURITY DEFINER` helpers on `auth.uid()` (`is_project_client`, `is_team_member`,
   `is_team_admin`). A client reads only their projects, and within them only
   client-visible tickets, shared files and live updates. Composite foreign keys keep every
   child row in its project. Nothing is granted to `anon`. The marketing tables are
   unchanged and keep ADR-002's functions.
5. **The service-role key exists, for auth administration only.** Creating or inviting an
   auth user, deactivating one, and signing out every session of a project's clients (when
   its Project ID is rotated) need Supabase's admin API, which only that key can call.
   - It lives in one module, `src/lib/supabase/admin.ts`, marked `server-only`, so a
     client import fails the build.
   - It is never used to read or write portal tables: those go through the signed-in
     user's session and RLS, or a `SECURITY DEFINER` function.
   - The variable is `SUPABASE_SERVICE_ROLE_KEY`, server-only and validated in
     `src/env.ts` from the ticket that first uses it (#132). The production value is set by
     the lead.
6. **Sessions and rendering.** Sessions are `httpOnly` cookies managed by `@supabase/ssr`.
   The proxy refreshes them on portal paths only; ADR-006's locale handling of the bare `/`
   is unchanged. Portal routes are dynamic and per user: no shared caching of portal
   data, `noindex`, out of the sitemap, and disallowed in `robots.txt`. Marketing pages
   stay static.
7. **Routes and languages.** The client portal is under `/[locale]/portal/…` in English
   and Portuguese; the team portal is under `/team/…` in English only, outside the locale
   middleware like `/studio`.
8. **Email.** Supabase sends the sign-in codes through custom SMTP on Resend
   (`send.nortbrand.pt`), because its built-in sender allows only a few messages an hour.
   Welcome, "Needs you" and digest emails use the app's existing Resend client.
9. **Files.** A private Storage bucket with one folder per project, Storage policies by
   membership, content-type checks on upload, and short-lived signed URLs for downloads.

## Alternatives considered

- **A separate portal app or Supabase project.** It would keep the marketing site free of
  auth, but duplicates the design system, deploys and environments. The lead chose the
  single app (ADR-004).
- **Magic links.** Rejected: link scanners in mail systems can use a single-use link
  before the person does.
- **Service-role reads and writes from server actions.** Rejected for the same reason as
  in ADR-002: one bug or leak would expose every client's data. RLS keeps a mistake in one
  query inside one project.
- **A third-party identity provider** (Clerk, Auth0). Outside the stack, an extra
  processor of personal data, and no better fit for "email plus Project ID".

## Consequences

- The site now has authenticated users. Security reviews and pgTAP policy tests become a
  standing part of portal work (#130, #143).
- One secret can bypass RLS. Its use is confined to one server-only module, reviewed in
  each pull request that touches it.
- Before launch, each Supabase project needs its Auth settings and custom SMTP
  (environments guide § 2).
- The Free plan's limits apply: 50,000 monthly active users (ample) and 1 GB of file
  storage (watch, #140).
- Portal pages are dynamic, so the "every page is static" rule now applies to marketing
  pages only.
