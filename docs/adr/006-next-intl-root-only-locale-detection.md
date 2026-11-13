# ADR-006: next-intl with /[locale] routing and root-only detection

- Status: Accepted
- Date: 2026-10-05
- Source: Technical Architecture Brief, "Frontend" (Locale behaviour)
- Extended by: [ADR-009](./009-portal-auth-and-data-access.md): the proxy will also
  refresh Supabase sessions on portal paths. Locale detection stays root-only.

## Context

The site is bilingual (EN/PT), and Portugal is the primary market. URLs must be shareable
and crawlable. A link sent in one language must open in that language.

## Decision

- Use next-intl. All routes live under `/[locale]`, with `en` and `pt`. Messages live in
  `messages/en.json` and `messages/pt.json`.
- Locale negotiation runs only on the bare `/`. It checks the `NEXT_LOCALE` preference
  cookie first, then `Accept-Language`, and falls back to `pt`.
- Prefixed URLs are never redirected. `/studio` and `/api` never go through locale handling.
- Every page emits `hreflang` alternates for `en`, `pt` and `x-default`.

Implementation notes:

- Next.js 16 renamed the `middleware.ts` file convention to `proxy.ts`. `src/proxy.ts` uses
  next-intl's middleware with `matcher: ["/"]`.
- Server code reads the locale through `next/root-params`, as Cache Components requires.

## Alternatives considered

- **Detection on every URL.** Rejected: browser settings could override an explicit link,
  and crawlers would see redirects.
- **Hand-rolled i18n.** Rejected: it would need custom routing, plural rules and formatting.
- **Locale by domain.** Not the routing model. Both languages live on one domain,
  `nortbrand.pt` (ADR-008, which replaced the earlier plan of `nortbrand.com` with
  `nortbrand.pt` redirecting to `/pt`).

## Consequences

- URLs are shareable and crawlable, and detection never overrides an explicit link.
- The language switcher must set the preference cookie. next-intl's navigation APIs do this
  when the locale changes.
- The preference cookie is functional, so it needs no consent.
