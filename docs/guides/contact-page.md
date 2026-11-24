# Contact page

**Covers:** #12 (layout), #39 (the working form). **Design source:** Figma 06 — Contact (`278:69`): desktop
`278:70`, tablet `378:107`, mobile `378:326`. The Validation, Sending, Request sent and
Send failed frames are built by the form (see [Consultation requests](./consultation-requests.md) § 7).

## 1. What we built

`/en/contact` and `/pt/contact`, both static:

```
Hero              squiggle · H1 · lead · email / phone / hours  |  consultation form card
What happens next "Three steps. / No surprises." · 3 step cards
FAQ               intro + "Send us a message"  |  5-question accordion
```

There is no CTA band and no sticky CTA: this page is where both of them lead.

## 2. Where the code lives

```
src/app/[locale]/(site)/contact/page.tsx
src/app/[locale]/(site)/contact/_components/
   contact-hero.tsx               intro, contact details, places the form card
   consultation-form-card.tsx     the card shell (server); the form inside is a client component
   contact-steps.tsx              ordered list of 3 step cards
   contact-faq.tsx                FAQ accordion
src/content/site.ts               + contact.hours (placeholder)
src/content/faq.ts                FAQ keys, in display order
src/components/site/logo.tsx      + LogoMark (the squiggle on its own)
src/components/site/highlight.tsx + indentTag() (shared with About)
```

## 3. The form card

Until #39 the card was layout only (a disabled `<fieldset>` with no `<form>`). It is now
a server-rendered shell (`consultation-form-card.tsx`) around the client
`ConsultationForm` from `src/features/consultation/`, the page's only client boundary.
The page stays static. Everything about the form's behaviour, states and tests is in
[Consultation requests](./consultation-requests.md) § 7.

## 4. Other decisions

- **Contact details come from `site.ts` only** (`CLAUDE.md`). The email is a real
  `mailto:` link; office hours are `contact.hours`. Figma's phone row is gone: there is
  no public phone number (§ 6). The day range ("Mon – Fri")
  lives in the message, so translators can localise it, and the times are interpolated.
- **`LogoMark`** reuses the logo's own mark path with a tighter view box. It is
  decorative and sized per breakpoint to Figma's 40 × 32 / 52 × 42 / 60 × 48 boxes.
- **`indentTag()`** is the `<indent>` message tag from About, now a shared helper that
  takes each page's indent classes. "No surprises." is indented at every breakpoint,
  even on mobile, as in Figma.
- **Step numbers** use red/600 on red/50 (red/500 at 18 px fails contrast), the same
  fix as the Home process badges.
- **FAQ** uses the shared Accordion (Handoff: single, collapsible, first item open).
  Open chevrons now turn red, matching Figma, which also updates Services "Our
  approach" on mobile. "Send us a message" is a `mailto:` link while the form is not live.
- **FAQ content** is typed (`src/content/faq.ts` keys + messages), as `CLAUDE.md`
  requires. `faq.test.ts` checks every key has a question and an answer. The SEO ticket
  can reuse `faqKeys` for FAQPage structured data.

## 5. Tests

- Page harness: axe, one H1, lang, canonical + hreflang, no overflow at 390, in EN and
  PT, on desktop and mobile.
- `tests/e2e/contact.spec.ts`:
  - the H1, the `studio@nortbrand.pt` mailto link and the hours, and no `tel:` link
  - **no `<form>` on the page, and every field, the select and Send Request disabled**
  - no sticky CTA after scrolling (mobile)
  - the FAQ opening one answer at a time

## 6. Contact details and the release guard (#79)

**What changed.** The lead confirmed the contact details on 24 November:

| Detail       | Value                   | Where it shows                                                                                                   |
| ------------ | ----------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Email        | `studio@nortbrand.pt`   | Contact hero, FAQ, mobile menu, legal pages, JSON-LD `email`, visitor confirmation emails (`replyTo` and footer) |
| Phone        | **none**                | removed from the hero, the type and the JSON-LD                                                                  |
| Office hours | Mon – Fri, 9:00 – 18:00 | Contact hero                                                                                                     |
| Social links | still placeholders      | footer, JSON-LD `sameAs` once confirmed                                                                          |

The address is an alias of the team's Zoho mailbox, so a reply to a visitor goes out from
the same company address it came in on ([Environments](./environments.md) § 3a).

**How a detail flows.** Every field in `src/content/site.ts` is `{ value, placeholder }`.
Components read `value`; two things read `placeholder`:

1. `organizationJsonLd` leaves unconfirmed details out of the JSON-LD, so search engines
   never index a stand-in.
2. The release guard. `unconfirmedSiteDetails()` returns names like `social.linkedin`,
   and `runSiteDetailsGuard()` (in `src/i18n/release-guard.ts`, next to the translation
   guard) acts on them:

```
                            contact.* placeholder     social.* placeholder
pnpm build                  ⚠ warns                   ⚠ warns
RELEASE_BUILD=1 pnpm build  ✖ fails                   ⚠ warns
VERCEL_ENV=production       ✖ fails (every production deployment of main)   ⚠ warns
pnpm check:release          ✖ fails                   ✖ fails
```

`unconfirmedSiteDetails(site, ["contact"])` narrows the list to one group; `next.config.ts`
calls the guard twice, strict for `contact` and warn-only for `social`.

**Why it's built this way**

- _The guard takes a list instead of importing `site.ts`._ `release-guard.ts` stays a
  pure function of its inputs, easy to test, and `next.config.ts` and the script pass in
  `unconfirmedSiteDetails()`. `site.ts` has no imports at all, so Node can load it
  straight from the script and from `next.config.ts`.
- _Contact placeholders fail production builds, not only `check:release`._ Before #79,
  `hasPlaceholders()` existed but nothing called it outside a test. A check that only
  runs when someone remembers is how stand-in data ships. A wrong email or office hours
  on the live site is a real cost, so those block a production deploy.
- _Social placeholders only warn in builds_ (lead, 2026-11-24). The profile URLs come
  later, and blocking every deploy of `main` until then would stop unrelated work from
  shipping. A stand-in social link points at the network's home page and is kept out of
  the JSON-LD, so it's harmless meanwhile. `pnpm check:release` still fails on them, so
  they remain a launch blocker (go-live checklist).
- _The phone is gone from the type, not just hidden._ `SiteConfig` no longer has
  `phone`, so no component can render one by accident, and the `phone` icon left the
  icon map with its last user. The consultation form's own optional phone field is
  unrelated and unchanged.
- _The day range stays in the messages_ ("Mon – Fri"), so translators own it; `site.ts`
  holds only the times.

**Changing a detail later:** edit `site.ts`, keep `placeholder: false` only for
confirmed values, update `tests/e2e/contact.spec.ts` if the hero changes, and run
`pnpm check:release`.
