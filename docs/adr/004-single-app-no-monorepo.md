# ADR-004: Single Next.js app, no monorepo

- Status: Accepted
- Date: 2026-10-05
- Source: Technical Architecture Brief, "Repository and workflow"

## Context

The product is one website. There is no mobile app and no shared package. A booking engine
might be extracted later.

## Decision

Use one private repository, `nortbrand/nortbrand-website`, containing a single Next.js app
managed with pnpm. Keep the code free of repository-root assumptions so it can move into
`apps/web` later without code changes.

## Alternatives considered

- **Turborepo with `apps/web`.** Rejected: it adds workspace tooling, task pipelines and
  cache configuration with nothing to share yet.

## Consequences

- Less tooling and faster setup now.
- The extraction path stays clear because path aliases (`@/*`) and config are app-local.
- Sharing code with another app later means introducing a workspace at that point.
