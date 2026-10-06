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

## Design source (Figma)

File key `vMnAfadw2GU8sPDU1Ol0hU`. Read page **11 — Handoff** (`389:2`) before building any UI.

| Page                                 | Node     |
| ------------------------------------ | -------- |
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

- **ADR-003, Sanity is approved for this project (nb-se section 2.1).** It holds blog posts, authors and categories only, with
  one document per language via `@sanity/document-internationalization`. Services, FAQ and
  page copy remain typed content in `src/content/`.
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

## Repository layout

```
src/app/[locale]/        pages: home, services, about, blog, contact, legal
src/app/studio/[[...tool]]/  embedded Sanity Studio (noindex, excluded from i18n middleware)
src/app/api/revalidate/  signed Sanity webhook
src/components/ui/       shadcn primitives restyled to tokens
src/components/site/     SiteNav, SiteFooter, CtaBand, StickyCta, ...
src/features/            consultation/, newsletter/, blog/, consent/
src/content/             typed services, FAQ, site config (contact details live ONLY here)
src/i18n/                next-intl routing + request config
src/lib/                 supabase, sanity, resend, analytics clients
src/env.ts               zod-validated environment (build fails on missing vars)
messages/                en.json, pt.json
sanity/                  schemas + Studio config
supabase/                migrations/, seed.sql, tests/ (pgTAP)
emails/                  React Email templates
tests/e2e/               Playwright
docs/                    README, adr/, runbook
```

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
- 44 pt minimum tap targets on touch.
- Errors always pair an icon with text.
- `prefers-reduced-motion` falls back to opacity fades of 150 ms or less.

## Confirmed assumptions

- Single office, Europe/Lisbon. Store UTC; show Lisbon time in emails.
- 3 blog posts per language at launch.
- Blog page size is 8 at every breakpoint.
- Sticky CTA on the blog listing only, not on posts.
- Contact email and phone are placeholders until provided. Read them from
  `src/content/site.ts` only.

## Commands (keep this section accurate as scripts are added)

```
pnpm dev          # local dev
pnpm typecheck    # tsc --noEmit
pnpm lint
pnpm test         # vitest
pnpm test:e2e     # playwright
pnpm build
supabase start / supabase db reset / supabase test db
```

## Workflow rules

- Work on `feat/*` or `fix/*` branches. Use Conventional Commits. `main` is production.
- Before writing code, inspect what already exists and extend it. Do not duplicate it.
- Before adding any dependency not listed in the brief, stop and explain why.
- **Ask the developer first** before running any of these: creating remote repos, cloud
  projects or accounts; pushing to GitHub; running migrations against a remote database;
  touching DNS; or anything that costs money.
- Never fabricate command output. Run typecheck, lint, tests and build, then report the
  real results.
- Record any shortcut as technical debt in `docs/tech-debt.md`, with the reason, the risk
  and the follow-up.

## Definition of done (per change)

- Typed, with no `any`.
- Validated on the server.
- Server/client boundary is minimal.
- Loading, empty and error states are present.
- Responsive at all three breakpoints.
- Keyboard and screen-reader accessible.
- Reduced motion is respected.
- Works in both EN and PT.
- Tests added where business logic changed.
- Typecheck, lint and build all pass.
