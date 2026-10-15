# Consultation requests

**Covers:** #37 (server action). Emails (#38) and the form wiring (#39) extend this guide.
**Source:** ADR-001, ADR-002, CLAUDE.md › Consultation request flow, Figma 06 Contact
(Validation, Sending, Send failed and Request sent states).

## 1. What we built

| Piece                      | File                                                                                  | Runs on        |
| -------------------------- | ------------------------------------------------------------------------------------- | -------------- |
| Shared schema + error keys | `src/features/consultation/schema.ts`                                                 | client, server |
| Fill-time token            | `src/features/consultation/form-token.ts`                                             | server         |
| The flow (testable core)   | `src/features/consultation/submit.ts`                                                 | server         |
| Server actions             | `src/features/consultation/actions.ts`                                                | server         |
| Signed tokens (shared)     | `src/lib/tokens.ts`                                                                   | server         |
| IP hashing                 | `src/lib/ip-hash.ts`                                                                  | server         |
| The app's Supabase client  | `src/lib/supabase/server.ts`                                                          | server         |
| Copy                       | `messages/*.json` › `Contact.form.errors`, `sent`, `failed`, `rateLimited`, `sending` | —              |

## 2. How a submission flows at runtime

```text
form mounts ──► getConsultationFormToken()            → "<issuedAt>.<signature>"
user submits ─► submitConsultationRequest({ …fields, locale, website, formToken })
   1. envelope    not an object                       → failed
   2. honeypot    `website` has a value               → success (fake; nothing stored)
   3. fill time   token missing/forged/future/< 3 s   → success (fake; nothing stored)
   4. zod         consultationSchema                  → validation { field: errorKey }
   5. RPC         submit_consultation_request(…, ip_hash)
                    PT429                              → rate-limited
                    any other error                    → failed (+ Sentry, code only)
                    id                                 → success
```

The result type is a discriminated union, so the form (#39) switches on `status`:

```ts
type ConsultationResult =
  | { status: "success" }
  | { status: "validation"; fieldErrors: { name?: "nameRequired" | …; … } }
  | { status: "rate-limited" }
  | { status: "failed" };
```

## 3. Decisions, file by file

**`schema.ts`: one schema, two runtimes.** The form will use it through react-hook-form
for instant feedback; the action runs it again because the browser can be bypassed. Every
rule mirrors a CHECK in Postgres, so a value that passes zod passes the database. The
schema also normalises: trims every field, lowercases the email, and turns an empty phone
into `undefined`. Error messages are **keys** (`nameRequired`), not text, so the same schema
serves both locales: the form renders `t(\`errors.${key}\`)`. `toFieldErrors` keeps the
first key per field, because the design shows one message per field, and maps zod's own
type errors (a field that is not a string at all) to the field's "required" key.

**`form-token.ts`: minimum fill time on a static page.** The Contact page is prerendered,
so the server cannot stamp the render time into the HTML. Instead the form asks for a
token when it mounts: `<ms>.<HMAC("form|consultation|<ms>")>`. On submit, the token must
verify and be at least 3 seconds old. The signature stops a bot from simply sending an old
timestamp. It is signed with `NEWSLETTER_TOKEN_SECRET`: the `form|` prefix keeps it from
ever verifying as a newsletter link, so one secret serves both without a new variable.

**`submit.ts`: bots learn nothing.** Bot checks run before validation, and a caught bot
gets the same `success` a person gets. A bot that sees "error" adapts; one that sees
"thanks" moves on. The flow takes its side effects as dependencies (`now`, `ipHash`,
`insert`, `reportFailure`), which is what lets the tests cover every branch without
Next.js, headers or a network.

**`actions.ts`: the thin, real wiring.** It reads the server env, the request headers
and the Supabase client, then delegates to `submitConsultation`. Two details:

- `p_phone: request.phone ?? ""`: generated Supabase types make every function argument
  a non-null string, so the action sends `''` and the function stores `null`
  (migration `20261015204624_consultation_empty_phone.sql`).
- Only `error.code` leaves the RPC callback. Postgres puts the submitted row (name,
  email, message) in `error.details` and `error.message`, so neither is logged or sent to
  Sentry. Rate limiting is expected behaviour and is not reported.

**`ip-hash.ts`.** The client IP is the first `x-forwarded-for` entry (Vercel), then
`x-real-ip`, then a shared `"unknown"` bucket (local requests). It is hashed as
`SHA-256(salt + ":" + ip)` straight away; the raw IP is never stored, logged or returned.

**`supabase/server.ts`.** One lazily created anon client for the whole server, with no
session persistence or token refresh (there is no auth). It is the only Supabase client in
the app; ADR-002 forbids a service-role client.

**`tokens.ts`.** HMAC-SHA256, base64url, constant-time compare. The format is identical
to `private.newsletter_token` in Postgres; the test vectors are shared with
`supabase/tests/03_newsletter.test.sql`. The newsletter ticket (#40) reuses it.

## 4. Tests

| File                       | Proves                                                                                                                    |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `schema.test.ts`           | Normalisation; every error key; one key per field; copy exists in EN and PT                                               |
| `submit.test.ts`           | Every result branch; bots and too-fast forms insert nothing; only the code is reported; nothing is written to the console |
| `src/lib/tokens.test.ts`   | The Postgres test vectors; wrong message, secret or length fails                                                          |
| `src/lib/ip-hash.test.ts`  | Header precedence; the hash is 64 hex characters and never contains the IP                                                |
| `02_consultation.test.sql` | A blank phone is accepted and stored as null                                                                              |

## 5. Using it from the form (#39)

```ts
const token = await getConsultationFormToken(); // on mount; keep it in a ref
const result = await submitConsultationRequest({
  ...values,
  locale,
  website,
  formToken: token,
});
switch (result.status) {
  case "validation":
    /* setError(field, t(`errors.${key}`)) for each field */ break;
  case "rate-limited":
    /* Contact.form.rateLimited */ break;
  case "failed":
    /* Send failed banner; keep the values */ break;
  case "success":
    /* Request sent state */ break;
}
```

The honeypot is an input named `website`, hidden from people (`aria-hidden`, off-screen,
`tabIndex={-1}`, `autoComplete="off"`), not `display: none`, which some bots skip.
