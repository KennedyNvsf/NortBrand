# ADR-008: nortbrand.pt is the primary domain

- Status: Accepted
- Date: 2026-11-02
- Supersedes: the domain part of ADR-006 ("nortbrand.pt only redirects to
  `nortbrand.com/pt`"). ADR-006's locale routing is unchanged.
- Ticket: #98

## Context

The brief assumed the site would live on `nortbrand.com`, with `nortbrand.pt` redirecting
to `nortbrand.com/pt`. When the paid services were due (#45), a registry lookup showed
`nortbrand.com` is registered by someone else (since December 2024, in active use).
`nortbrand.pt` was unregistered (DNS.pt WHOIS, 2 November 2026). Portugal is the primary
market (ADR-006).

## Decision

- The site lives on `https://nortbrand.pt`, with both languages under it: `/en/…` and
  `/pt/…`. Locale routing stays exactly as ADR-006 describes; only the host changes.
- `www.nortbrand.pt` redirects to the apex with a Vercel domain redirect (308, same path).
- Email sends from the subdomain `send.nortbrand.pt`; the studio address is on
  `nortbrand.pt`.
- The app no longer has host-based redirects: `src/lib/seo/domain-redirects.ts` (#85) is
  removed, because a single domain needs none.

## Alternatives considered

- **`nortbrand.dev`.** Rejected as the public domain: it reads as developer tooling, not
  a studio, for clients and email recipients. It stays an option for internal tools later.
- **Another `.com` spelling.** Rejected: it would not match the brand name, and visitors
  would still type the taken `nortbrand.com`.
- **Waiting for `nortbrand.com` to expire** (24 December 2026). Rejected: after launch,
  and the owner will probably renew.

## Consequences

- One domain, so no redirect rules in the app and fewer launch-day DNS steps.
- Visitors who type `nortbrand.com` by habit reach someone else's site, and mail sent to
  `@nortbrand.com` never arrives. Printed material and signatures must say `.pt`.
- English visitors land on a `.pt` domain; `hreflang` and `/en` URLs still tell search
  engines which pages are English.
