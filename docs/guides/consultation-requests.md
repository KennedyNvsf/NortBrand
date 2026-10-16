# Consultation requests

**Covers:** #37 (server action), #38 (emails), #39 (the form).
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
                    id                                 → success, then after the response:
   6. emails      after(() => sendConsultationEmails(…))
                    team alert (EN) ──► NOTIFY_TO_EMAIL, reply-to: visitor
                    confirmation (visitor locale) ──► visitor, reply-to: studio
                    alert sent ──► mark_consultation_notified(id)
                    any failure ──► Sentry (step + code only); the visitor already saw success
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
serves both locales: the form renders ``t(`errors.${key}`)``. `toFieldErrors` keeps the
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

## 5. Calling the action

`ConsultationForm` (§ 7) is the only caller. Any other caller needs the same envelope:
the fields plus `locale`, the honeypot `website` (empty) and a `formToken` from
`getConsultationFormToken()` issued at least 3 seconds earlier.

## 6. Emails (#38)

| Piece                     | File                                                                              |
| ------------------------- | --------------------------------------------------------------------------------- |
| Team alert template       | `src/features/consultation/emails/consultation-alert.tsx`                         |
| Visitor confirmation      | `src/features/consultation/emails/consultation-confirmation.tsx`                  |
| Brand tokens, inline      | `src/lib/email/styles.ts` (shared with the newsletter email)                      |
| Copy + render (HTML/text) | `src/features/consultation/emails/render.tsx`                                     |
| Send, mark, report        | `src/features/consultation/notify.ts`                                             |
| Resend wrapper            | `src/lib/resend.ts`                                                               |
| Copy                      | `messages/*.json` › `Emails.consultationAlert`, `Emails.consultationConfirmation` |

**Why `after()`.** The action stores the request, returns `success`, and only then
sends the emails (`after` from `next/server`). The visitor never waits on Resend, and no
email problem can turn a stored request into an error on screen. The flip side: an email
failure is invisible to the visitor, so `sendConsultationEmails` reports every failed step
to Sentry, and the team can spot unnotified requests (`notified_at is null`) in the
dashboard.

**What `notified_at` means.** "The team was told." Only a sent alert sets it. If the
visitor's confirmation fails, the alert is still recorded and the failure is reported. If
the alert fails, `notified_at` stays null: the request is safe in the table, just not
announced.

**Templates.** React Email components (`react-email`), with every colour and radius
copied from the tokens in `globals.css` into `styles.ts`, because mail clients ignore CSS
variables. No images and no web font, so opening an email loads nothing remote. React
escapes everything the visitor typed; `white-space: pre-wrap` keeps their line breaks.
Subjects collapse whitespace, so a name with a line break cannot add a header line.

**Copy.** Both emails read their copy from `messages/*.json` with next-intl's
`createTranslator`, imported directly rather than through the request config, because
`after()` runs outside the request context. The alert is always English; the
confirmation follows `request.locale`. Times are formatted in Europe/Lisbon with `Intl`
(no date library), e.g. "Thursday, 15 October 2026 at 21:46 (Lisbon time)".

**Sender.** `EMAIL_FROM` (required). Until the domain is verified (#45) it is
`NortBrand <onboarding@resend.dev>`, and Resend delivers only to the account's own
address, so test with `NOTIFY_TO_EMAIL` and the form's email set to that address.

**Tests.** `notify.test.ts` covers every outcome (both sent; alert fails; confirmation
fails; a template throws; marking fails or updates nothing) and checks that no report
contains personal data. `emails/render.test.ts` checks every alert field and the Lisbon
time (across the daylight-saving change), escaping, the one-line subject, no images, the
locale of the confirmation, and snapshots of the EN alert and the EN and PT confirmations.

## 7. The form (#39)

| Piece                   | File                                                                     |
| ----------------------- | ------------------------------------------------------------------------ |
| The form and its states | `src/features/consultation/components/consultation-form.tsx`             |
| Request sent            | `src/features/consultation/components/consultation-sent.tsx`             |
| Card shell (server)     | `src/app/[locale]/(site)/contact/_components/consultation-form-card.tsx` |
| Fake backend for e2e    | `src/features/consultation/e2e-backend.ts`                               |
| e2e                     | `tests/e2e/consultation-form.spec.ts`                                    |

**States** (Figma 06 Contact): Default `278:114`, Validation `400:331`, Sending
`400:522`, Send failed `400:694`, Request sent `321:73` (tablet `379:310`, mobile
`379:386`). Rate limited reuses the Send failed banner with its own copy.

```text
idle ──submit──► client zod ──errors──► Validation (focus first invalid field)
                    │ ok
                    ▼
                 Sending: <fieldset disabled>, button loading + aria-busy, note changes
                    │
   success ─► Request sent (focus heading, recap of the email we'll reply to)
   validation ─► server field errors, focus first one
   rate-limited / failed / network error ─► banner (focused), answers kept, Try again
```

**How it works.**

- **react-hook-form + `zodResolver(consultationSchema)`.** The same schema as the server.
  Messages are error keys; `toErrorKey` turns any message (ours or zod's own) into a key,
  rendered as ``t(`errors.${key}`)`` with `FieldError` (icon + text), linked through
  `aria-describedby`, with `aria-invalid` on the field.
- **No double submission.** While sending, the `<fieldset>` is disabled (every field
  shows the designed Disabled look), the button is `loading` (disabled, `aria-busy`,
  spinner), and `onSubmit` returns early if a send is already running.
- **Announcements.** A polite `role="status"` region speaks "Sending…", "Request sent."
  or the banner title. Focus moves to the banner or the success heading; for field
  errors it moves to the first invalid field, whose message is read with it.
- **Bots.** The form fetches the signed start time on mount and again on the first
  focus if that failed. The honeypot `website` is off-screen, unlabelled for people,
  out of the tab order and `autoComplete="off"`.
- **`?service=<slug>`.** Read after mount (the page is static), validated against
  `serviceSlugs`, unknown values ignored. Radix mirrors the value into a hidden native
  `<select>` that reports `""` when the value arrives before its options exist, so the
  form ignores empty changes (no option is empty).
- **Layout.** Sending keeps the form's exact height. Validation messages and the banner
  add height, and Request sent is shorter, as designed; these happen only in response
  to the visitor's own submit, which browsers exclude from layout-shift scoring.
- **Privacy line.** Figma has no consent checkbox, so `consent_at` is the submission
  time; a caption under the button links the Privacy Policy (draft copy, decided
  2026-10-15).

**e2e without a backend.** Playwright starts the server with `E2E_FAKE_BACKEND=1`. The
action then swaps only the insert and the emails for `fakeInsert`, which picks the
outcome from the name: `e2e:failed`, `e2e:rate-limited`, `e2e:slow` (1.5 s, to see
Sending), anything else succeeds. The flag is refused when `VERCEL_ENV=production`, and
a unit test pins that. Bot checks stay real, so each test waits 3 seconds before
submitting. If you reuse a running server for e2e, start it with
`E2E_FAKE_BACKEND=1 pnpm start`, or submissions will write to Supabase and send email.
