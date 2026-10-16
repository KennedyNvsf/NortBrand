# Calls to action: CtaBand and StickyCta

**Covers:** #8. **Design source:** Figma 02 Components › CTA Band (`337:146`), Sticky CTA
(`357:150`), Handoff › Sticky CTA.

## 1. What we built

Two ways to push visitors toward booking a consultation:

- **CtaBand**: a large photo card that ends most pages: headline with one red keyword,
  a supporting line, and a white "Book a Consultation" card. Side by side on desktop,
  stacked on tablet and mobile.
- **StickyCta**: a small bar that floats at the bottom of the screen on **mobile only**,
  once the visitor has scrolled past the hero. It hides again over the CTA band and
  whenever a menu or dialog is open. Per CLAUDE.md it goes on the blog listing only.

## 2. CtaBand

### Per-page copy with a red keyword, in any language

The Handoff says pages override the headline "but keep the red keyword". The keyword
can't be a separate prop: in Portuguese it may be a different word, in a different
position. So the message marks it with a tag:

```json
"headline": "Got a project in mind? Let’s <highlight>talk</highlight>."
```

and the component renders the tag with `t.rich`:

```tsx
t.rich("headline", {
  highlight: (chunks) => <CtaHighlight>{chunks}</CtaHighlight>,
});
```

A page overrides it by passing its own rich headline:

```tsx
<CtaBand
  headline={t.rich("ctaHeadline", {
    highlight: (c) => <CtaHighlight>{c}</CtaHighlight>,
  })}
  subtext={t("ctaSubtext")}
/>
```

The translator moves the tag with the word, and the pseudo-localizer keeps the tag
intact, because it never changes the English inside `[[ ]]`.

### The photo

- `src/assets/images/sea-coast.jpg` is a 2400 px, 566 KB export of the original
  (6960 px, 4.4 MB) uploaded to `src/assets/sea.jpg`. The original stays out of git; the
  export also **strips EXIF metadata**, which can include GPS location.
- It's imported statically (`import seaCoast from "@/assets/images/sea-coast.jpg"`), so
  Next.js knows its size, generates every responsive width, and creates a tiny blurred
  preview (`placeholder="blur"`) shown while it loads.
- `sizes="(min-width: 1440px) 1344px, 100vw"` tells the browser how wide the image will
  be, so a phone downloads a phone-sized file.
- `alt=""`: the photo is decorative here; the text carries the message.

### Readable text on a photo

White text on a photo needs a dark layer behind it. Figma uses a 7% tint plus a gradient,
vertical on mobile and horizontal on desktop, matching where the text sits. That lives
in one utility in `globals.css`:

```css
@utility photo-scrim {
  /* vertical gradient + tint */
  @media (width >= 64rem) {
    /* horizontal gradient + tint */
  }
}
```

The image and scrim use `-z-10` inside a card with `isolate`. `isolate` starts a new
stacking context, so the negative z-index stays _inside_ the card instead of slipping
behind the page.

### Tokens added

- `--radius-xl: 24px` for photo cards (Figma CTA card). Mobile Figma uses 20 px; we use
  one token everywhere (logged in tech debt).
- `photo-scrim` utility (above).

## 3. StickyCta

### When it shows

```
hero on screen            → hidden
hero scrolled away        → visible
a CtaBand on screen       → hidden   (no point showing two CTAs)
menu / dialog open        → hidden
```

The page tells the bar what the "hero" is with a data attribute:

```tsx
<section data-sticky-cta-trigger> …hero… </section>
```

and anything that should hide it gets `data-sticky-cta-hide`. The CtaBand adds that
itself. No marker means the bar never shows, which is the safe default.

### Why IntersectionObserver, not scroll events

A scroll listener runs on every scroll frame and has to measure elements, which can
make scrolling janky on phones. An **IntersectionObserver** asks the browser to call us
only when an element enters or leaves the screen. Two observers: one for the hero, one
for all "hide" elements (a `Set` tracks which of them are currently on screen).

### Hiding without breaking keyboard users

When hidden, the bar is faded out **and** `inert`. `inert` makes the browser skip it for
Tab and screen readers, so nobody lands on an invisible button.

For menus and dialogs, there's a CSS rule rather than more JavaScript. Radix locks page
scrolling when a dialog opens and marks `<body data-scroll-locked>`:

```css
body[data-scroll-locked] [data-slot="sticky-cta"] {
  visibility: hidden;
}
```

### Motion

Show and hide fade over 250 ms with a 16 px slide. The slide is `motion-safe:`, so with
reduced motion it only fades. Opacity and transform are cheap for the browser to
animate. The position uses `env(safe-area-inset-bottom)`, so it sits 12 px above the
iPhone home indicator, as in Figma.

## 4. How the tests protect this

| What could go wrong                                   | Test                                 |
| ----------------------------------------------------- | ------------------------------------ |
| Sticky bar visible over the hero or over the CTA band | `site/sticky-cta.test.tsx` (jsdom)   |
| Hidden bar still focusable                            | `site/sticky-cta.test.tsx` (`inert`) |
| Keyword not red, or CTA link wrong                    | `e2e/cta.spec.ts`                    |
| Contrast, landmarks, overflow at 390                  | page harness (axe)                   |
| **The nav rendered twice on a page**                  | page harness: exactly one `banner`   |

The jsdom test replaces `IntersectionObserver` with a small fake, so the test decides
what is "on screen" and checks the result, with no real scrolling and no flakiness.

## 5. Day-to-day rules

1. **Ending a page with the band?** Pass a `headline` built with `t.rich` and
   `<CtaHighlight>`, or omit it for the default copy.
2. **Mounting StickyCta?** Mark the hero with `data-sticky-cta-trigger`. Only on the blog
   listing (CLAUDE.md).
3. **Something else should hide the bar?** Give it `data-sticky-cta-hide`. The bar also
   stays hidden until a cookie choice is made (`useConsent()`, #42), so it never sits
   under the cookie banner ([Cookie consent](./consent.md)).
4. **New photo?** Export it at most 2400 px wide with metadata stripped, put it in
   `src/assets/images/`, and import it statically.
