# ADR-002: Supabase for requests and subscribers, writes through SECURITY DEFINER functions

- Status: Accepted
- Date: 2026-10-05
- Source: Technical Architecture Brief, "Backend and data", "Architecture decisions"

## Context

The site collects consultation requests and newsletter subscribers. This is relational,
personal data (GDPR, classified Private), written by anonymous visitors. The team needs a
dashboard to read requests without an admin UI. Auth, Storage and Realtime are not needed.

## Decision

- Use Supabase (Postgres only), with one production and one development project, both in an
  EU region. Schema changes live in `supabase/migrations`.
- Enable RLS on both tables with **no** select, update or delete policies for `anon` or
  `authenticated`, so the public API can read nothing.
- Public writes go only through two `SECURITY DEFINER` functions,
  `submit_consultation_request` and `subscribe_newsletter`, granted to `anon` only. Each
  function enforces the rate limit (5 writes per `ip_hash` per hour) and inserts in a single
  transaction. Length and enum rules are mirrored as `CHECK` constraints.
- Server actions call these functions with the anon key. The service-role key is never used
  by the website. It stays in the Supabase dashboard and the developer's CLI session.

### Amendment, 2026-10-15 (#36)

- The anon key is public, so anyone can call the functions directly, without the server
  action. Each function is therefore safe on its own:
  - `confirm_newsletter` and `unsubscribe_newsletter` verify the signed token in SQL
    (HMAC-SHA256 with a secret in Supabase Vault, equal to `NEWSLETTER_TOKEN_SECRET`).
  - A global ceiling of 100 public writes per hour backs up the per-`ip_hash` limit,
    because a direct caller can invent `ip_hash` values.
- The public functions are `submit_consultation_request`, `mark_consultation_notified`,
  `subscribe_newsletter`, `confirm_newsletter` and `unsubscribe_newsletter`. Helpers and the
  rate-limit log live in a `private` schema that the API does not expose.

## Alternatives considered

- **Service-role inserts from server actions.** Rejected: it puts a key that bypasses RLS
  into the app runtime, so one leak or bug exposes all personal data.
- **A separate API or a different database service.** Rejected: more moving parts and no
  ready-made dashboard for the team.

## Consequences

- Least privilege: a leaked anon key exposes nothing readable.
- Validation runs twice: zod on the server and constraints in the database.
- Some business rules live in SQL, so they need pgTAP tests in `supabase/tests`.
- Changing the rate limit or the columns requires a migration.
