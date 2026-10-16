# Newsletter

The newsletter: signup, double opt-in, the Resend segment and unsubscribe (backend, #40),
and the Newsletter card with the confirm and unsubscribe pages (interface, #41).
Newsletters themselves are written and sent from Resend Broadcasts.

## 1. What we built

- A `subscribeNewsletter` server action. It stores a `pending` row and emails a
  confirmation link in the visitor's language.
- A `confirmNewsletter` server action. The confirm page calls it when the visitor presses
  **Confirm**. It marks the row `subscribed` and adds the address to the Resend segment.
- An `unsubscribeNewsletter` server action, for the unsubscribe page's button, and
  `POST /api/newsletter/unsubscribe`, for mail clients' one-click unsubscribe (RFC 8058).
  Both mark the row `unsubscribed` and delete the Resend contact.
- `GET /api/health/newsletter`. It checks that the app's `NEWSLETTER_TOKEN_SECRET` matches
  the copy in Supabase Vault.

The database side (the table, the three `SECURITY DEFINER` functions, rate limits and
token checks in SQL) is in [Database](./database.md).

## 2. How it works at runtime

```text
Signup form (#41) ── subscribeNewsletter({ email, locale, website })
  honeypot filled?         → fake success, nothing stored
  zod (subscribeSchema)    → { validation, fieldErrors: { email: "emailInvalid" } }
  rpc subscribe_newsletter(email, locale, ip_hash)
      PT429                → { rate-limited }
      other error          → Sentry (code only) → { failed }
      issued_at            → { success }
  after(): email with /<locale>/newsletter/confirm?email=&issued=&token=

Confirm page (#41) ── the visitor presses Confirm ── confirmNewsletter({ email, issued, token, locale })
  zod (confirmLinkSchema)  → { invalid }
  checkConfirmToken        → { invalid } forged or future · { expired } older than 7 days
  rpc confirm_newsletter   → false: { invalid } (replaced by a newer signup, or already used up)
                           → true:  { confirmed }
  after(): Resend contact created in the segment, properties locale + unsubscribe_url

Unsubscribe page (#41) or a mail client's one-click POST ── { email, token }
  zod + checkUnsubscribeToken → { invalid }
  rpc unsubscribe_newsletter  → { unsubscribed }
  after(): Resend contact deleted
```

There is no enumeration. A new, pending or already subscribed address gets the same
`success` and the same email. The function returns an issue time in every case, so the app
itself cannot tell them apart. For an address that is already subscribed, the link in that
email simply confirms nothing new.

## 3. Files, one by one

**`schema.ts`.** The zod schemas. The `email` rules mirror the CHECK on
`newsletter_subscribers`: trimmed, lowercased, at most 254 characters, a valid address.
`confirmLinkSchema` and `unsubscribeLinkSchema` parse a link's query string. Signed tokens
are always 43 base64url characters, so anything else is rejected before any HMAC work or
database call. Error messages are keys under `Newsletter.errors`. The form has one field,
so there is one key, `emailInvalid`.

**`links.ts`.** Signs and checks tokens with the shared `src/lib/tokens.ts`, in the
exact format Postgres uses: `confirm|<email>|<issued_at>` and `unsubscribe|<email>`. The
unit tests pin the SQL test vectors from #36, so a drift between the app and SQL fails CI.
`checkConfirmToken` applies the same rules as `confirm_newsletter`:

- a bad signature, or an issue time in the future, is `invalid`;
- a link older than 7 days is `expired`.

The comparison runs in constant time. The app checks first so a bad link never reaches the
database. The database checks again because its functions are callable with the public
anon key (ADR-002). Only the database knows whether a link is the latest one.

The URL builders:

- `confirmUrl`: the confirm page.
- `unsubscribeUrl`: the unsubscribe page, stored on the Resend contact.
- `oneClickUnsubscribeUrl`: the POST endpoint, for a `List-Unsubscribe` header.

**`subscribe.ts`, `confirm.ts`, `unsubscribe.ts`.** The three flows as pure functions with
injected dependencies, like `consultation/submit.ts`. That makes every branch unit-testable
without Supabase or Resend. Each returns a small discriminated union for the page to render.
Two details:

- `expired` is kept separate from `invalid`, so the page can suggest subscribing again.
- When `unsubscribe_newsletter` rejects a token the app accepted, that means the app and
  Vault secrets differ. It is reported to Sentry as `token_rejected`.

**`notify.ts`.** The work that runs after the response: send the confirmation email, add a
contact to the segment, or delete one. Each step reports a failure (step plus code) and
never throws, so the visitor's result is never affected. The database is the source of
truth, and Resend only mirrors it.

**`emails/`.** `newsletter-confirmation.tsx` is the template: heading, intro, a button,
expiry, the plain link as a fallback, and an "ignore this" line. `render.tsx` resolves the
copy (`Emails.newsletterConfirmation`) in the visitor's locale. The shared pieces live in
`src/lib/email/`:

- `styles.ts`: brand tokens as inline styles, now including the primary button fill and
  `--radius-md`.
- `render.ts`: `toEmail`, `emailMessages`, `oneLine`.

The consultation emails use the same files.

**`actions.ts`.** Wires the flows to the real services: the anon Supabase client, Resend,
Sentry and `after()`. Only Postgres error codes and Resend error names are reported. Never
`error.details`, which echoes the row, email included.

**`src/lib/resend.ts`.** `upsertSegmentContact` creates the contact in the segment
(`RESEND_SEGMENT_ID`). If the contact already exists, it updates it and adds it to the
segment instead. `removeContact` deletes the contact, so Resend keeps no data for an
unsubscribed address. A contact that is already gone counts as removed.

**`src/app/api/newsletter/unsubscribe/route.ts`.** One-click unsubscribe. It is POST only:
a link scanner that opens the URL with a GET gets 405 and unsubscribes no one. It returns
200 for a valid link, 400 for an invalid one and 500 on failure.

**`src/app/api/health/newsletter/route.ts`.** Signs an unsubscribe token for
`healthcheck@nortbrand.invalid` and asks `unsubscribe_newsletter` to verify it. The
function returns true for any valid token. No row can match that address, so the check
writes nothing. `await connection()` keeps the check from being prerendered at build time
(`cacheComponents` forbids `export const dynamic`).

### The interface (#41)

**`components/newsletter-card.tsx`** is Figma's Newsletter component (02 Components
337:161, 346:130, 346:148). It is a server shell with a dark card, the headline (its red
keyword comes through `highlightTags`), the intro, and a mark panel shown on desktop
only. The breakpoint variants are design states, so it is one component with responsive
classes. `data-surface="dark"` switches the focus ring to white and error text to red/300.
Placement follows Figma: the Blog listing and every post (M4). Until then, the
link-expired page shows it.

**`components/newsletter-form.tsx`** is the only client part. It covers the states from
Newsletter States (408:182):

| State        | What the visitor sees                                                         |
| ------------ | ----------------------------------------------------------------------------- |
| Default      | Field (screen-reader label, placeholder only as in Figma), Subscribe, consent |
| Error        | Red border, icon and text in red/300; focus returns to the field              |
| Sending      | Field disabled, button "Subscribing…" with a spinner and `aria-busy`          |
| Success      | Form replaced by the green check, "You're in." (focused) and the address      |
| Rate limited | Not in Figma: the error style under the row, the answer kept                  |
| Failed       | Not in Figma: the same, so the visitor can press Subscribe again              |

A polite live region announces each change. The field and button stack on mobile and
share a row from tablet up. The consent line links the Privacy Policy.

**`components/confirm-subscription.tsx`, `unsubscribe-newsletter.tsx`** are the link
pages, `/[locale]/newsletter/confirm` and `/unsubscribe`. Figma has no frames for them, so
they use the 404's layout, now shared as `SystemState` (`src/components/site/`): the mark,
one H1, a lead and the actions. Opening a page does nothing until the visitor presses
the button. Each result replaces the H1 and moves focus to it.

- A link that is malformed (missing or bad parameters) shows **invalid** straight away.
- Expired and invalid confirm links show the Newsletter card. The page renders it on the
  server and passes it in as `newsletterCard`.

**`use-link-params.ts`** reads the query string in the browser (`useSyncExternalStore`,
`null` during hydration). That keeps both pages static: they never read `searchParams`
on the server.

**`page-metadata.ts`** gives both pages a title, `noindex, nofollow`, no canonical or
hreflang, and `referrer: no-referrer`, so the address in the link never reaches another
site. They are not in `sitePages`, so they are not in the sitemap.

**`e2e-backend.ts`** fakes the three database calls for Playwright. The address picks the
outcome: `e2e-failed@`, `e2e-rate-limited@`, `e2e-slow@` or `e2e-used@`. The switch,
`isFakeBackendEnabled`, moved to `src/lib/e2e-backend.ts` so both features share it.

## 4. Decisions and trade-offs

- **Confirm needs a button press (decided 2026-10-16).** Mail security scanners (Outlook
  Safe Links and others) open every link. If opening the link confirmed the subscription,
  a scanner could subscribe someone without their consent. The cost is one extra click.
- **Our signed unsubscribe link (decided 2026-10-16).** Resend's built-in unsubscribe
  updates only Resend. Templates use the contact property `unsubscribe_url` instead, so
  the database learns about every unsubscribe. The gap is that Resend's own
  `List-Unsubscribe` header on broadcasts still goes to Resend (tech debt: a
  `contact.updated` webhook).
- **Segments, not Audiences (decided 2026-10-16).** Resend replaced Audiences with
  Segments, and `audienceId` is deprecated in the SDK. The variable is
  `RESEND_SEGMENT_ID`.
- **No minimum-fill-time token.** The signup form sits in the footer of every page. A form
  token would cost a server action call on every page view. The honeypot and the Postgres
  rate limits (5 per IP per hour, 100 in total) are enough for one email field.
- **Link pages follow the 404 layout (decided 2026-10-16).** Figma has no frames for them.
  The draft is logged in tech debt for design to review.
- **The card waits for the blog (decided 2026-10-16).** Figma shows it only on the Blog
  listing and posts. Adding it to other pages would mean inventing a placement.
- **Every signup gets an email.** This includes addresses that are already subscribed,
  because the app cannot tell them apart. The rate limits cap how often someone can make
  the site email a third party.

## 5. Tests

| File                                    | Covers                                                                                |
| --------------------------------------- | ------------------------------------------------------------------------------------- |
| `newsletter/links.test.ts`              | SQL token vectors, purpose separation, the 7-day boundary, tampering, URL encoding    |
| `newsletter/subscribe.test.ts`          | Normalising, no enumeration, honeypot, validation, PT429, errors by code              |
| `newsletter/confirm.test.ts`            | Confirmed, expired, tampered, malformed, refused by the database, errors              |
| `newsletter/unsubscribe.test.ts`        | Valid, tampered, mismatched secrets, errors                                           |
| `newsletter/notify.test.ts`             | Email in the visitor's locale, segment properties, failures reported by code          |
| `newsletter/emails/render.test.ts`      | The link as a button and as text, locale, no images or scripts                        |
| `lib/resend.test.ts`                    | Create, update-and-add fallback, delete, `not_found`, error names only                |
| `tests/e2e/newsletter.spec.ts`          | Card states, axe on the dark card, mobile stacking, PT; confirm and unsubscribe flows |
| `tests/e2e/pages.spec.ts` (routes.ts)   | Both link pages in both locales: one H1, axe, 200 + noindex, no canonical             |
| `supabase/tests/03_newsletter.test.sql` | The same rules in SQL (#36)                                                           |

## 6. Setup and day-to-day

1. **Resend:** create the "Newsletter" segment and the text properties `locale` and
   `unsubscribe_url` ([Environments](./environments.md) § 3). Put the segment id in
   `RESEND_SEGMENT_ID`. Until then, confirming works but `segment_add` reports
   `not_found`.
2. **Vault:** `newsletter_token_secret` must equal `NEWSLETTER_TOKEN_SECRET` in each
   Supabase project. Check it by opening `/api/health/newsletter`.
3. **Writing a broadcast:** send to the segment, filtered by the `locale` property for
   each language. Use the contact's `unsubscribe_url` property as the unsubscribe link.
4. **Until the domain is verified (#45):** Resend delivers only to the account's own
   address, so test with that address.
