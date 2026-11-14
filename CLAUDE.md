# NortBrand Website — Project Context for Claude Code

This file is the standing context for every session in this repository. The approved
Technical Architecture Brief is the source of truth:
https://claude.ai/code/artifact/32b7a60b-6b4d-4e38-9e16-6f6c70a283d7

If anything here conflicts with a later instruction from the developer, ask before acting.

## Project

- **Client:** NortBrand (internal project). **Product:** bilingual (EN/PT) studio website.
- **Booking** means a _consultation request form_. Visitors submit a request, and the team
  replies within one business day with call times. There is no self-service scheduling
  in this release (ADR-001).
- **Launch:** Thursday 10 December 2026 (moved from 30 November on 13 November 2026, to
  include the portal; earlier, from 10 November on 13 October). Week 1 started 5 October 2026. Paid services (Vercel Pro, the domain, DNS) were bought by 9 November (#45).
  Milestones: M3 due 31 October; M5 (launch) and M6 (Client portal) due by 10 December.
- **Portal (M6, ADR-009):** a Client Portal and a Team Portal behind sign-in. See the
  Portal section below.
- **Platforms:** web only, responsive. Breakpoints: desktop ≥ 1024, tablet 768–1023,
  mobile < 768.

## Skills

Skills live in `.claude/skills/`. Use them as follows:

- **nb-se** — all engineering work, including section **100.1 Delivery Workflow** for every
  change.
- **nb-de, emil, motion** — UI polish, component feel and animation. Motion values must
  follow Figma page 10 — Motion Spec.
- **design-engineer** — Figma-to-code and frontend review. Its library suggestions are
  options, not rules. This project's brief has already decided: no client data-fetching
  library and no global store.
- **nb-brandguideline** — Figma design-system work only.

Project decisions in this file take precedence over any skill default. If a skill conflicts
with this file, flag the conflict instead of resolving it silently.

## Design source (Figma)

File key `vMnAfadw2GU8sPDU1Ol0hU`. Read page **11 — Handoff** (`389:2`) before building any UI.

| Page                                 | Node     |
| ------------------------------------ | -------- |
| 00 Cover (logo `LOGONORT`: `54:16`)  | `37:2`   |
| 01 Foundations (tokens, type, color) | `37:3`   |
| 02 Components                        | `37:4`   |
| 03 Home                              | `49:2`   |
| 04 Services                          | `129:2`  |
| 05 Blog                              | `204:2`  |
| 06 Contact                           | `278:69` |
| 07 About                             | `300:2`  |
| 08 System / States                   | `320:2`  |
| 09 Legal                             | `323:2`  |
| 10 Motion Spec                       | `331:2`  |
| 11 Handoff                           | `389:2`  |

Never invent colors, type sizes, spacing, radii or shadows. Use the semantic CSS variables
from the handover. Nav, Footer, CTA Band and Newsletter breakpoint variants are _design states_:
build each one once, using responsive classes.

## Stack

Next.js App Router · React · TypeScript (strict) · Tailwind CSS · shadcn/ui + Radix · Lucide ·
Motion · Sonner · react-hook-form + zod · next-intl · Supabase (Postgres only) · Resend +
React Email · Sanity (blog only) · Sentry · Vitest · Playwright · pnpm · Node 24 LTS.

### Project-specific decisions (approved in the brief)

- **ADR-003, Sanity is approved for this project (nb-se section 2.1).** Sanity holds blog
  posts, authors and categories only, with one document per language via
  `@sanity/document-internationalization`. Services, FAQ and page copy remain typed content
  in `src/content/`.
- **ADR-004, single app, no monorepo.** There is no mobile app and no shared package yet.
  Keep the code extractable to `apps/web` later.
- **ADR-002, no service-role key in the app.** Public writes go only through
  `SECURITY DEFINER` Postgres functions granted to `anon`: `submit_consultation_request`,
  `mark_consultation_notified`, `subscribe_newsletter`, `confirm_newsletter`,
  `unsubscribe_newsletter`. They are rate-limited and transactional, and each is safe to call
  directly with the public anon key (tokens are verified in SQL). RLS is enabled with no
  policies.
- **ADR-006, i18n.** Routes live under `/[locale]` (`en`, `pt`). Middleware (`src/proxy.ts`)
  negotiates the locale only on the bare `/`, in this order: preference cookie, then
  `Accept-Language`, then `pt`. Prefixed URLs are never redirected. On portal paths it only
  refreshes the Supabase session (ADR-009). Emit `hreflang` for `en`, `pt` and `x-default`.
- **ADR-008, `nortbrand.pt` is the only domain** (`nortbrand.com` belongs to someone else).
  Both languages live under it; `www` redirects to the apex in Vercel, and the app has no
  host redirects. Email sends from `send.nortbrand.pt`.
- **ADR-007, GA4 loads only after analytics consent.** Declining means no Google request at all.
- **ADR-009, portal sign-in with Supabase Auth** (amends ADR-002 for portal tables).
  Email one-time codes, sign-ups off, RLS policies scoped to project membership, and a
  server-only service-role key used only for auth administration.
- Auth exists only in the portal. No global state library, no client data-fetching
  library, no date library.

### Rendering

- Every page under `[locale]` exports `generateStaticParams` for `en` and `pt`.
- Every page enables next-intl static rendering, so pages stay static.
- Exception: the blog listing reads `searchParams`, so it is a static shell with the
  results streamed per request (◐ in the build, cached data). See docs/guides/blog.md.
- Blog posts are prerendered per language from their slugs; an unlisted slug renders
  on its first request (`ensureStatic = "navigation"`), then is cached.
- Check the build output to confirm marketing pages are static. A page that becomes dynamic
  unexpectedly is a bug.
- Exception: portal pages (`/[locale]/portal/…`, `/team/…`) are dynamic and per user by
  design (ADR-009). Never cache portal data across users.
- **What loads before the first paint** (docs/guides/performance.md, #105): no `@/env` or
  zod in client components (pass values as props); widgets go in the layout only if every
  page uses them; dialogs, drawers and menus load with `next/dynamic`, prefetched when
  idle; `NextIntlClientProvider` gets only `CLIENT_MESSAGE_PATHS` (add a namespace there
  when a client component needs it; a unit test enforces it).

## Repository layout

```
src/app/[locale]/        pages: home, services, about, blog, contact, legal
  (site)/                route group: pages with SiteNav + SiteFooter (404 sits outside)
src/app/studio/[[...tool]]/  embedded Sanity Studio (noindex, excluded from i18n middleware)
src/app/api/revalidate/  signed Sanity webhook
src/app/api/newsletter/  one-click unsubscribe (RFC 8058), Resend webhook; api/health/newsletter checks the Vault secret
src/components/ui/       shadcn primitives restyled to tokens
src/components/site/     SiteNav, SiteFooter, CtaBand, StickyCta, Logo, shared primitives
src/features/            consultation/, newsletter/, blog/, consent/, promo/, portal/
src/content/             typed services, FAQ, site config (contact details live ONLY here)
src/i18n/                next-intl routing + request config
src/lib/                 supabase, sanity, resend, analytics clients
src/env.ts               zod-validated environment (build fails on missing vars)
messages/                en.json, pt.json
public/images/           launch assets; public/images/placeholder/ for temporary imagery
sanity/                  schemas + Studio config
supabase/                migrations/, seed.sql, tests/ (pgTAP)
src/features/*/emails/   React Email templates (per feature)
tests/e2e/               Playwright
docs/                    README, adr/, guides/, runbook, tech-debt.md, accessibility-audit.md (#84)
```

## Content, translation and assets

- **English copy:** `messages/en.json` holds the Figma copy as a draft until the final
  English copy arrives (due 21 October). Keys are namespaced by page and component.
- **Portuguese copy:** a professional translator provides it. The first full translation
  is in `messages/pt.json` (#76) and may change until launch.
  - When English changes, its PT value is deleted and `pnpm i18n:pseudo` marks the key
    for the translator: wrapped in `[[ ]]`, padded about 30% longer, ICU placeholders
    intact. Process: docs/guides/localization.md § 6.
  - `en.json` and `pt.json` must always have exactly the same keys, and each PT string
    the same placeholders and rich-text tags. A unit test enforces both.
- **Release guard:** any remaining `[[ ]]` string fails the build when
  `VERCEL_ENV=production` or `RELEASE_BUILD=1`. Other builds only print a warning. Run
  `pnpm check:release` before launch.
  - There are no `release/*` branches; work is squash-merged to `main`.
- **Images:**
  - The sea photo is a launch asset. It needs optimized, responsive crops, and meaningful
    alt text wherever it isn't decorative.
  - Logomark panels are Figma placeholders (the "Our approach" points have photos
    since #82; the service cards have Figma illustrations since #124). Placeholders live in `public/images/placeholder/`, use `alt=""`, and are logged in
    `docs/tech-debt.md`.
  - Replacing a panel with a photo (#82): pass `image` to `FeatureSplit` (or use
    `PhotoPanel`). Photos go in `src/assets/images/` at 1600 px wide with metadata
    stripped; they settle and drift like the mark did. Home's two are AI-generated
    (tech debt). All stock media come from Pexels: the
    register of every image, its source and licence, and how to add one is
    docs/guides/images.md. Update it with any image change.
- **Logo:** `LOGONORT` (`54:16`), exported as an optimized SVG. The wordmark is converted
  to paths, and the SVG uses `currentColor`.
- **Navigation:** links to unbuilt pages show the designed 404 until those pages ship.

## Motion

- Values come from the Motion Spec (Figma page 10): `src/lib/motion.ts` (Motion library) and
  the `--duration-*` / `--ease-*` tokens in `globals.css` (CSS). Never invent timings.
- Use CSS for hover, focus, press and simple enter/exit (tw-animate). Use Motion
  (`motion/react`, pinned 13.4.4) only for scroll-linked, spring or orchestrated motion.
- Motion components are `m.*` under the root `MotionProvider` (`LazyMotion strict`), never
  `motion.*`, so the engine stays lazy-loaded.
- Scroll reveals: mark elements with `revealItem(kind)` and wrap the section in
  `<RevealGroup>` (src/components/motion). It never hides content that is already
  visible or before hydration. Shared components use `reveal-dom.ts` up front and get
  `play()`/`animate()` from `loadRevealEngine()` after hydration (#105). Hero entrances use `enterItem(index)` (CSS). Reveal
  values were raised after the #27 review; see src/lib/motion.ts.
- Booking links use `<BookingButton>` (arrow → calendar on hover).
- Every animation has a reduced-motion path: opacity only, 150 ms or less, no path drawing.
- Services grid (#124): no card entrance; each card's illustration draws itself as it
  scrolls in (`IllustrationPlayer`, timings on the SVG parts) and plays one hover accent.
  No lift. The "What's included" trigger is stretched over the card; its pressed scale
  must stay `none`, since any `scale` value collapses the stretched `::after` mid-click
  (docs/guides/services-page.md).

## Data model (Supabase, EU region)

- `consultation_requests`: id, created_at, name (1–120), email (lowercase), phone?,
  service (one of five slugs), message (10–5000), locale (`en`|`pt`), consent_at,
  status (`new`|`contacted`|`scheduled`|`closed`|`spam`), ip_hash (salted SHA-256),
  notified_at.
- `newsletter_subscribers`: id, email (unique, lowercase), locale, status
  (`pending`|`subscribed`|`unsubscribed`), consent_at, confirmed_at, unsubscribed_at,
  created_at. Uses **double opt-in**.
- Plan: `nortbrand-prod` runs on Free as a trial (lead, 2026-11-05, #45; review by
  31 March 2027). Vercel Cron (`vercel.json`) and `.github/workflows/keepalive.yml` call
  `/api/health/newsletter` daily so it never pauses; a failed run is the alert. No backups
  on Free (accepted). Guide: docs/guides/environments.md § 2.
- Rate limit: 5 writes per `ip_hash` per hour, and 100 public writes per hour in total
  (`private.write_events`, pruned after an hour). Rejections raise SQLSTATE `PT429` (HTTP
  429). Length and enum rules are mirrored as `CHECK` constraints; zod must match them.
- Newsletter tokens: base64url HMAC-SHA256 of `confirm|<email>|<issued_at>` (7 days) or
  `unsubscribe|<email>`, keyed by `NEWSLETTER_TOKEN_SECRET`, which is also stored in Vault
  as `newsletter_token_secret` in every Supabase project.
- Never log or forward Postgres `error.details`: it echoes the submitted row.
- All schema changes go in `supabase/migrations`. Seed data is for development only.

## Consultation request flow

Client validation → server action → honeypot and minimum-fill-time check → zod → RPC insert →
Resend team alert (EN) + visitor confirmation (visitor locale) → success state.

- Code: `src/features/consultation/` (guide: docs/guides/consultation-requests.md). The
  schema's messages are keys under `Contact.form.errors`. Bots (honeypot `website`, or a
  form token younger than 3 s) get a fake success. Only `error.code` is ever logged.
- Insert fails: show the designed _Send failed_ state and send no email.
- Insert succeeds but email fails: keep the request, log the error (no personal data), and
  still show success. Emails run after the response (`after()`); only a sent team alert
  sets `notified_at`.

## Newsletter flow

Signup form → server action → honeypot → zod → `subscribe_newsletter` (rate-limited) → double
opt-in email (visitor locale) → confirm page button → `confirm_newsletter` → contact added to
the Resend segment (`RESEND_SEGMENT_ID`, properties `locale` and `unsubscribe_url`).

- Code: `src/features/newsletter/` (guide: docs/guides/newsletter.md). Every response is the
  same whether or not the address is already subscribed.
- Links are checked in the app (constant time) and again in SQL. Confirming and
  unsubscribing happen on a button press or a one-click POST, never on a GET, so mail
  scanners cannot act on anyone's behalf.
- UI: `NewsletterCard` (server shell, client form), placed on the Blog listing and posts in
  M4 and on the link-expired page. The link pages `/[locale]/newsletter/confirm` and
  `/unsubscribe` are static, noindex, out of the sitemap, and send no Referer.
- Unsubscribe deletes the Resend contact. `/api/newsletter/unsubscribe` is the RFC 8058
  one-click endpoint; `/api/health/newsletter` checks that the app and Vault secrets match.
- `/api/newsletter/resend-webhook` (signed `contact.updated`) brings unsubscribes made in
  Resend back to the database through the same `unsubscribe_newsletter` path (#86).

## Portal (M6, ADR-009)

- **Design:** Figma 12 Portal — Client (`516:2`, CP-01 to CP-08) and 13 Portal — Team
  (`528:188`, TM-01 to TM-14). Tickets #129–#143.
- **Routes:** client portal under `/[locale]/portal/…` (EN/PT); team portal under
  `/team/…` (English only, outside the locale middleware like `/studio`). All portal
  routes are dynamic, `noindex`, out of the sitemap and disallowed in `robots.txt`.
- **Entry point:** the "Track Project" nav item (Figma Nav `514:399`, between Blog and
  Contact) links to `/[locale]/portal`. It is also in the tablet/mobile menu in the same
  order (lead's decision, 2026-11-13; not yet drawn in the menu frames), and not in the
  footer. Client sign-in (CP-01/CP-02) sits inside SiteNav
  and SiteFooter with Track Project active; team sign-in (TM-14) is standalone.
- **Auth components** (drawn on the portal pages, not on 02 Components): the split
  sign-in card (form panel + dark brand panel with the mini stage tracker), the 6-box code
  input (default, focus, error with one shake, filled), the resend countdown, and the
  sign-in states in CP-08 (no match, wrong code, expired, signed out).
- **Responsive:** frames at 1440, 768 (`CP-T…`, `TM-T…`) and 390 (`CP-M…`, `TM-M…`), and
  the rules in "Portal · Responsive rules" (`560:2243`): sidebar → tabs → bottom tab bar;
  detail panel → 440 px right sheet → bottom sheet (team: full-screen editor); tables
  drop secondary columns, then become cards; the mobile board shows one status at a time
  with no drag; modals become bottom sheets on mobile. Screens without small-screen
  frames follow the rules.
- **Tenant:** the project. A client sees only their projects, and within them only
  client-visible tickets, shared files and live updates. RLS enforces it; server actions
  check again.
- **Client sign-in:** email + Project ID (`NB-xxxx`), checked in SQL with one generic error,
  then a 6-digit code: 10 minutes, 3 tries, then a 15-minute pause. Sessions last 30 days.
- **Team sign-in:** invite-only by any email (lead's decision, 2026-11-13), with an
  optional allowed-domain setting, off until NortBrand has mailboxes on `nortbrand.pt`.
  Roles: `admin`, `member`, enforced in SQL and in every server action.
- **Service-role key:** only in `src/lib/supabase/admin.ts` (`server-only`), only for auth
  administration. Never for table reads or writes.
- **Client sign-in (#131, docs/guides/portal.md):** `src/features/portal/auth/`. Pages
  `/[locale]/portal` (sign-in, inside the site chrome) and `/[locale]/portal/[projectId]`
  (placeholder until #133/#134). Portal pages read the session inside Suspense (Cache
  Components) and render per request; marketing pages stay static. The session client is
  `getPortalSupabase()` (`src/lib/supabase/auth.ts`); `getSupabase()` stays session-less.
  Sessions end after 30 days through a signed marker cookie (Supabase's time-boxed
  sessions need Pro). Sign-in strings reach the client as props, not through
  `CLIENT_MESSAGE_PATHS`. The code email is generated: `supabase/templates/portal-code.html`
  is a file snapshot (`pnpm test -- -u`), pasted into each hosted project.
- **Playwright:** `portal-sign-in.spec.ts` uses the fake backend (NB-1234, emails
  `client…@e2e.example`, code 123456). Find headings by role: Next keeps the previous page
  in the DOM, hidden, after a navigation.
- **Email:** Supabase sends codes through custom SMTP on Resend; app emails use the
  existing Resend client.
- **Schema (#130, docs/guides/database.md § 7):** the project is the tenant; RLS policies
  through `private.is_team_member()`, `is_team_admin()` and `is_project_client(project)`;
  composite foreign keys keep child rows in their project; `update` is granted per column
  only (a column `REVOKE` can't narrow a table-wide grant). Members work only on projects
  they're assigned to (`project_team`, `private.works_on_project`); admins work on every
  project and alone create projects and manage client access, the team and settings.
- **Realtime:** only `updates` is published, for the live client feed.
- **Motion:** Figma **14 Portal — Motion** (`566:127`): each moment plays once a session
  (a per-view flag in sessionStorage), on every interaction, or never. Tokens as in
  `src/lib/motion.ts`.

## Limited offer (promo)

- Code: `src/features/promo/`, offer config in `src/content/promo.ts` (guide:
  docs/guides/promo.md). Figma Promo Modal `510:732` (Home, #126) and Promo Card `510:794`
  (About and Services, #127); motion in Motion Spec › PROMO (`550:2`).
- Shows 8 s after the cookie choice, once per visitor (localStorage `nb_promo_dismissed`
  = offer id, fails closed), never after `endsAt` (checked in the browser), never over
  another open dialog. The launcher renders nothing until due, so pages stay static.
- Mount it per page, never in the layout. Playwright specs start with the offer
  dismissed (`tests/e2e/promo-state.ts`); `promo.spec.ts` does not.

## Cookie consent

- Code: `src/features/consent/` (guide: docs/guides/consent.md). One first-party cookie,
  `nb_consent` (`v1.1` / `v1.0`, 182 days); bump `CONSENT_VERSION` to ask again.
- Read the choice only through `useConsent()` (`unknown` until hydration, then
  `undecided` or `decided`).
- GA4 (`src/lib/analytics.ts`, #43) loads only when `analytics` is true. Page views carry
  the path only (never the query string); events are the typed `AnalyticsEvents` map
  with no personal data. Withdrawal sets `ga-disable-<ID>` and deletes `_ga*` cookies.
- The banner is not modal and never takes focus; Accept and Reject have equal weight.
  The StickyCta waits for a choice. "Cookie settings" in the footer reopens the panel.
- Playwright specs start with a choice made (`storageState`); `consent.spec.ts` does not.

## Sanity (blog CMS)

- Code: `sanity/` (schemas, env), `sanity.config.ts`, Studio at `src/app/studio/`
  (guide: docs/guides/cms.md; editors: docs/guides/editing-the-blog.md). Project `p4bc960d`; local work uses the `development`
  dataset. Run `pnpm sanity:types` after any schema or GROQ change.
- Blog data: only through `src/features/blog/data.ts` (cached, tagged `blog-list` /
  `blog-posts`); queries in `queries.ts`; the webhook `/api/revalidate` checks the
  signature first. Test content: `pnpm sanity:seed` (development only).
- Sanity MCP (optional): `.claude/settings.json` denies infrastructure, publish and
  image-generation tools. Claude writes only drafts, only to `development`; anything on
  `production` needs approval, like a remote migration.

## Environment variables

Public: `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET`, `NEXT_PUBLIC_GA_MEASUREMENT_ID`,
`NEXT_PUBLIC_SENTRY_DSN` (optional; Sentry is off when empty).

Server-only: `SANITY_API_READ_TOKEN`, `SANITY_REVALIDATE_SECRET`, `RESEND_API_KEY`,
`RESEND_SEGMENT_ID`, `RESEND_WEBHOOK_SECRET`, `EMAIL_FROM`, `NOTIFY_TO_EMAIL`, `IP_HASH_SALT`, `NEWSLETTER_TOKEN_SECRET`,
and from #132 `SUPABASE_SERVICE_ROLE_KEY` (portal auth administration only, ADR-009).

Build only (Vercel, optional): `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`.
Account setup and the per-environment matrix: `docs/guides/environments.md`.

Build flags: `RELEASE_BUILD=1` makes the release guard strict outside Vercel production.
`E2E_FAKE_BACKEND=1` (Playwright's server and the CI build job, which also gets blog
fixtures instead of Sanity; refused on Vercel production) swaps the
consultation and newsletter database calls and emails for fakes, so e2e never writes to
Supabase or sends email.

Rules:

- Never prefix a secret with `NEXT_PUBLIC_`.
- Never commit `.env*` files. Keep `.env.example` up to date, with no values.

## Accessibility decisions (from the handover audit)

- Primary button fill is `#DC2626` (red/500 stays for large type and decorative fills).
- Small red text uses red/600 `#C21F1F`.
- The green eyebrow on the Services hero becomes white at 85%.
- Target WCAG 2.2 AA.
- Focus ring 2 px with 2 px offset.
- One H1 per page.
- 44 pt minimum tap targets on touch for buttons, nav items and form controls. Inline text
  links inside body copy are exempt from this check. Use `min-h-11`/`size-11`, or the
  `touch-target` utility to grow a small element's hit area without changing its look.
  The page harness hit-tests every control at 390 px (docs/guides/accessibility.md).
- Errors always pair an icon with text.
- `prefers-reduced-motion` falls back to opacity fades of 150 ms or less.

## Confirmed assumptions

- Single office, Europe/Lisbon. Store UTC; show Lisbon time in emails.
- 3 blog posts per language at launch.
- Blog page size is 8 at every breakpoint.
- Sticky CTA (mobile) on every page except Contact, Legal, the 404 and blog posts (decided
  2026-10-08, following Figma Home and the Handoff). A page opts in by marking its hero with
  `data-sticky-cta-trigger`. It links to `/[locale]/contact`.
- Contact email and phone are placeholders until provided. Read them from
  `src/content/site.ts` only.

## Commands (keep this section accurate as scripts are added)

```
pnpm dev            # local dev
pnpm typecheck      # next typegen && tsc --noEmit (run before lint on a fresh clone)
pnpm lint
pnpm format         # prettier --write (format:check in CI)
pnpm test           # vitest
pnpm test:e2e       # playwright
pnpm build
pnpm i18n:pseudo    # regenerate placeholder pt.json from en.json (keeps real translations; --reset for all)
pnpm check:release  # strict guard: pseudo translations + draft legal text; must pass before launch
pnpm lhci autorun   # Lighthouse budgets (after E2E_FAKE_BACKEND=1 pnpm build); not a dependency, runs via pnpm dlx
pnpm lighthouse:summary  # score table from the last Lighthouse run
pnpm icons:generate # favicon.ico, apple-icon.png, logo-square.png from src/app/icon.svg (commit the output)
pnpm db:start / db:stop / db:reset / db:types / db:test   # local Supabase (Docker)
pnpm sanity:types   # extract the Sanity schema and regenerate src/lib/sanity/sanity.types.ts
pnpm sanity:seed    # test authors, categories and posts into the development dataset
```

## Workflow rules (nb-se 100.1)

Every change follows this lifecycle:

```
Ticket → Branch → Implement → Validate → Push → Pull Request → Walkthrough → Review → Merge → Close
```

- **Tickets**
  - Use GitHub Issues, created with the `gh` CLI. Title format: `|TAG| Imperative summary`.
  - Apply the tag as a label as well.
  - The ticket body has context, scope, out of scope, acceptance criteria, and links to the
    relevant brief section and Figma node.
  - Each phase is a milestone. At the start of a phase, propose the full ticket list and
    wait for approval before creating any issues.
- **Branches**
  - One branch per ticket, created from an up-to-date `main`.
  - Name: `<type>/<ticket-number>-<slug>`, for example `feat/23-card-components`.
  - Never commit directly to `main`. It is protected.
- **Commits**
  - Use Conventional Commits with a scope, and reference the ticket. Example:
    `feat(ui): add Card component variants (#23)`.
  - Every commit builds.
- **CI (every PR):** required: typecheck/lint/format/unit/build, e2e (desktop), e2e
  (mobile, Chromium at iPhone 14 size), Database (pgTAP), Lighthouse (mobile) (budgets in
  `lighthouserc.json`; required once added to branch protection). Informational: e2e in
  WebKit (two shards), not a merge gate because it is unstable on the runners; e2e
  (preview), the host-independent specs against the PR's own Vercel preview
  (`E2E_BASE_URL`, `tests/e2e/target.ts`), required once it has proven stable (#45).
  Guide: docs/guides/ci.md.
- **Validation before pushing**
  - Run typecheck, lint, format:check, unit tests and build. Run e2e when pages or flows
    changed.
  - Check every acceptance criterion and the definition of done below.
  - Report the real command output.
- **Pull requests**
  - One PR per ticket. The PR title matches the ticket title.
  - The PR body contains:
    - `Closes #<n>`
    - what changed and why
    - screenshots at 1440, 768 and 390, in EN and PT, for UI changes
    - how it was tested
    - any deviations or technical debt
  - CI must pass.
- **Walkthrough (after the PR is open, before I merge)**
  - Explain the ticket as if guiding a junior developer: what was built, how it works at
    runtime (request or data flow), how it was implemented file by file, why each
    decision was made, the trade-offs, and how to use or extend it.
  - Post it in the conversation, and save it in the same PR under `docs/guides/<topic>.md`.
    Guides are organised by topic, not by ticket: extend the existing guide when a ticket
    changes a topic, and keep `docs/guides/README.md` listing every guide.
- **Merging**
  - Squash-merge only after my explicit approval in the conversation.
  - After merging, delete the branch and confirm the ticket closed.
- **Narration:** always state the ticket and step, for example
  `Ticket #23 — |FRONTEND| Build card components UI · Step 3/7 · Validate`.
  Work one ticket at a time unless I approve parallel work.
- **Approvals**
  - **No separate approval needed:** pushing feature branches and opening PRs for approved
    tickets.
  - **My approval needed:**
    - the phase ticket list
    - every merge to `main`
    - creating remote repos, cloud projects or accounts
    - migrations against a remote database
    - DNS changes
    - anything that costs money
- **Before writing code:** inspect what already exists and extend it. Do not duplicate it.
- **Dependencies:** before adding any dependency not listed in the brief, stop and explain
  why.
- **Technical debt:** record every shortcut in `docs/tech-debt.md`, with the reason, the
  risk and the follow-up.

## Definition of done (per ticket)

- Acceptance criteria in the ticket are all met.
- Typed, with no `any`.
- Validated on the server.
- Server/client boundary is minimal.
- Pages stay static where intended.
- Loading, empty and error states are present.
- Responsive at all three breakpoints, with no horizontal overflow at 390 px using PT
  strings.
- Keyboard and screen-reader accessible: axe reports no violations, and each page has
  exactly one H1.
- Reduced motion is respected.
- Works in both EN and PT, with `hreflang` and canonical present on every page.
- Tests added or updated. New pages are added to the shared Playwright harness
  (`tests/e2e/routes.ts`).
- README, `docs/tech-debt.md` and this file are updated when they're affected.
- The walkthrough is posted and its guide in `docs/guides/` is added or updated.
- Typecheck, lint, format:check, tests and build all pass.
