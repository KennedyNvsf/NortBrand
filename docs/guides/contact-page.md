# Contact page

**Covers:** #12 (layout only). **Design source:** Figma 06 — Contact (`278:69`): desktop
`278:70`, tablet `378:107`, mobile `378:326`. The Validation, Sending, Request sent and
Send failed frames belong to the consultation form ticket.

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
   consultation-form-layout.tsx   the form card: layout only, cannot submit
   contact-steps.tsx              ordered list of 3 step cards
   contact-faq.tsx                FAQ accordion
src/content/site.ts               + contact.hours (placeholder)
src/content/faq.ts                FAQ keys, in display order
src/components/site/logo.tsx      + LogoMark (the squiggle on its own)
src/components/site/highlight.tsx + indentTag() (shared with About)
```

## 3. The form card without a backend

The ticket's acceptance criterion: **no control on the page appears submittable while
the backend is absent.** Three layers make sure of it:

1. **No `<form>` element.** Without one, there is nothing for the browser to submit,
   even if someone re-enables a field in DevTools and presses Enter.
2. **`<fieldset disabled>`** around every control. HTML disables every descendant
   field and button, so they can't be focused, typed into or clicked, and assistive tech
   announces them as dimmed. Our primitives already style `:disabled` (the designed
   Disabled state), so the card looks clearly inactive. Radix Select also gets
   `disabled` on its root, because its trigger and state live in React.
3. **An honest note.** The line under the button says requests open soon and gives the
   email address as a working alternative. The fieldset points at it with
   `aria-describedby`, so a screen reader hears why the fields are disabled.

Everything the real form needs is already in place: field `name`s, `type`s,
`autoComplete`, label/`id` pairs, and service options whose values are the
consultation slugs (`serviceSlugs`). The form ticket should:

- replace the `<div>` with `<form action={…}>`
- remove `disabled`
- add validation and the four states
- delete the `unavailable` note

`data-form-slot="consultation"` marks the card for that work.

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
