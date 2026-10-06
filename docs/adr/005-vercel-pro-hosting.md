# ADR-005: Vercel Pro hosting

- Status: Accepted
- Date: 2026-10-05
- Source: Technical Architecture Brief, "Hosting and environments"

## Context

The app uses these Next.js App Router features:

- the proxy (formerly called middleware)
- static generation with tag revalidation
- server actions

The workflow also expects a preview deployment per branch, and the site is commercial.

## Decision

Host on Vercel Pro under a NortBrand team account. The Hobby plan is for non-commercial use
only, so Pro is required. The app uses no Vercel-only APIs.

## Alternatives considered

- **Netlify.** Rejected: its Next.js support runs through an adapter, which tends to lag new
  App Router features.
- **Self-hosted Node.** Rejected: the team would own servers, TLS, scaling, preview
  environments and cache invalidation.

## Consequences

- Native App Router support and a preview deployment per branch. Playwright and Lighthouse
  can run against the previews.
- A small monthly cost per seat.
- The site stays portable to another Next.js host because no Vercel-only APIs are used.
- Node 24 LTS is pinned in the repository. Confirm it matches the Vercel project setting
  when the project is created.
