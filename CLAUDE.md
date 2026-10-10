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
- **Launch:** 10 November 2026. Week 1 starts 5 October 2026.
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
- **ADR-002, no service-role key in the app.** Public writes go only through two
  `SECURITY DEFINER` Postgres functions (`submit_consultation_request`,
  `subscribe_newsletter`). These functions are granted to `anon`, rate-limited, and
  transactional. RLS is enabled with no public read policies.
- **ADR-006, i18n.** Routes live under `/[locale]` (`en`, `pt`). Middleware handles only the
  bare `/`, in this order: preference cookie, then `Accept-Language`, then `pt`. Prefixed URLs
  are never redirected. Emit `hreflang` for `en`, `pt` and `x-default`.
- **ADR-007, GA4 loads only after analytics consent.** Declining means no Google request at all.
- No auth in the MVP. No global state library, no client data-fetching library, no date
  library.

### Rendering

- Every page under `[locale]` exports `generateStaticParams` for `en` and `pt`.
- Every page enables next-intl static rendering, so pages stay static.
- Check the build output to confirm marketing pages are static. A page that becomes dynamic
  unexpectedly is a bug.

## Repository layout

```
src/app/[locale]/        pages: home, services, about, blog, contact, legal
  (site)/                route group: pages with SiteNav + SiteFooter (404 sits outside)
src/app/studio/[[...tool]]/  embedded Sanity Studio (noindex, excluded from i18n middleware)
src/app/api/revalidate/  signed Sanity webhook
src/components/ui/       shadcn primitives restyled to tokens
src/components/site/     SiteNav, SiteFooter, CtaBand, StickyCta, Logo, shared primitives
src/features/            consultation/, newsletter/, blog/, consent/
src/content/             typed services, FAQ, site config (contact details live ONLY here)
src/i18n/                next-intl routing + request config
src/lib/                 supabase, sanity, resend, analytics clients
src/env.ts               zod-validated environment (build fails on missing vars)
messages/                en.json, pt.json
public/images/           launch assets; public/images/placeholder/ for temporary imagery
sanity/                  schemas + Studio config
supabase/                migrations/, seed.sql, tests/ (pgTAP)
emails/                  React Email templates
tests/e2e/               Playwright
docs/                    README, adr/, guides/, runbook, tech-debt.md
```

## Content, translation and assets

- **English copy:** `messages/en.json` holds the Figma copy as a draft until the final
  English copy arrives (due 21 October). Keys are namespaced by page and component.
- **Portuguese copy:** a professional translator provides it.
  - Until it arrives, `pnpm i18n:pseudo` generates `messages/pt.json` from `en.json`. Each
    string is wrapped in `[[ ]]`, padded about 30% longer, and ICU placeholders are kept
    intact.
  - `en.json` and `pt.json` must always have exactly the same keys. A unit test enforces
    this.
- **Release guard:** any remaining `[[ ]]` string fails the build when
  `VERCEL_ENV=production` or `RELEASE_BUILD=1`. Other builds only print a warning. Run
  `pnpm check:release` before launch.
  - There are no `release/*` branches; work is squash-merged to `main`.
- **Images:**
  - The sea photo is a launch asset. It needs optimized, responsive crops, and meaningful
    alt text wherever it isn't decorative.
  - Collages and logomark panels are Figma placeholders. They live in
    `public/images/placeholder/`, use `alt=""`, and are logged in `docs/tech-debt.md`.
- **Logo:** `LOGONORT` (`54:16`), exported as an optimized SVG. The wordmark is converted
  to paths, and the SVG uses `currentColor`.
- **Navigation:** Blog stays in the nav even while its page doesn't exist yet. Links to
  unbuilt pages show the designed 404 until those pages ship.

## Motion

- Page tickets use CSS transitions and the existing tw-animate styles only.
- The Motion library work comes in a dedicated ticket that follows the Motion Spec. It covers
  the pinned service blocks, scroll reveals, the journey line, the quote card and the link
  stagger.
- Below desktop, the service blocks are a plain vertical stack.

## Data model (Supabase, EU region)

- `consultation_requests`: id, created_at, name (1–120), email (lowercase), phone?,
  service (one of five slugs), message (10–5000), locale (`en`|`pt`), consent_at,
  status (`new`|`contacted`|`scheduled`|`closed`|`spam`), ip_hash (salted SHA-256),
  notified_at.
- `newsletter_subscribers`: id, email (unique, lowercase), locale, status
  (`pending`|`subscribed`|`unsubscribed`), consent_at, confirmed_at, unsubscribed_at,
  created_at. Uses **double opt-in**.
- Rate limit: 5 writes per `ip_hash` per hour. Length and enum rules are mirrored as
  `CHECK` constraints.
- All schema changes go in `supabase/migrations`. Seed data is for development only.

## Consultation request flow

Client validation → server action → honeypot and minimum-fill-time check → zod → RPC insert →
Resend team alert (EN) + visitor confirmation (visitor locale) → success state.

- Insert fails: show the designed _Send failed_ state and send no email.
- Insert succeeds but email fails: keep the request, log the error (no personal data), and
  still show success.

## Environment variables

Public: `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET`, `NEXT_PUBLIC_GA_MEASUREMENT_ID`.

Server-only: `SANITY_API_READ_TOKEN`, `SANITY_REVALIDATE_SECRET`, `RESEND_API_KEY`,
`RESEND_AUDIENCE_ID`, `NOTIFY_TO_EMAIL`, `IP_HASH_SALT`.

Build flags: `RELEASE_BUILD=1` makes the release guard strict outside Vercel production.

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
  links inside body copy are exempt from this check.
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
supabase start / supabase db reset / supabase test db
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
