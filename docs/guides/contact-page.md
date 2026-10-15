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

- **Contact details come from `site.ts` only** (`CLAUDE.md`). Email and phone are real
  `mailto:` / `tel:` links. Office hours are new in `site.ts` as `contact.hours`. Like
  the email and phone, they are `placeholder: true` with a `TODO(client)`, so
  `hasPlaceholders()` still reports them before launch. The day range ("Mon – Fri")
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
  - the H1, and the mailto/tel links and hours
  - **no `<form>` on the page, and every field, the select and Send Request disabled**
  - no sticky CTA after scrolling (mobile)
  - the FAQ opening one answer at a time
