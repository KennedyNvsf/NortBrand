# About page

**Covers:** #11. **Design source:** Figma 07 — About (`300:2`): desktop `300:3`, tablet
`377:76`, mobile `377:259`.

## 1. What we built

`/en/about` and `/pt/about`, both static and entirely server-rendered (no component
JavaScript of its own):

```
Hero            centred eyebrow · H1 with "same care" underlined · intro paragraph
Our story       heading | red-bar statement · intro · 01–04 list · outro with bold words
Our principle   two-line headline (second line indented) · paragraph on the story column
CTA band        About headline ("your business" in red) + subtext
```

There is no imagery on this page in Figma, so there are no placeholders.

## 2. Where the code lives

```
src/app/[locale]/(site)/about/page.tsx                 composes sections, metadata
src/app/[locale]/(site)/about/_components/
   about-hero.tsx · about-story.tsx · about-principle.tsx
src/components/site/highlight.tsx                      + emphasisTags (<strong>)
src/app/globals.css                                    + text-intro type role
```

## 3. Decisions, file by file

### `about-hero.tsx`

- The H1 uses `text-display-xl`, whose 40 / 56 / 84 sizes are exactly Figma's.
- Figma breaks the headline after "designed" on tablet and desktop. We get the same
  break from a max width (`md:max-w-150 lg:max-w-215`), not a `<br>`. A hard break would
  be wrong in Portuguese, where the words are different.
- **New type role `text-intro`** (18 → 22 on desktop). The 22 px lead had no matching
  role. It is a Figma value, so it goes into the design system (`globals.css` and the
  `cn` font-size group) rather than an arbitrary `text-[22px]`.
- The eyebrows on this page are red in Figma. Small red text uses red/600
  (`text-text-accent`), per the accessibility decisions in `CLAUDE.md`.
- The hero is the sticky-CTA trigger, like every page except Contact, Legal and the 404.

### `about-story.tsx`

- The statement beside the red bar is a `<p>`, not a heading. It is emphasis inside the
  story, and the outline stays H1 → H2 (Story) → H2 (Principle).
- The four points are an `<ol>`. Their 01–04 numbers are `aria-hidden` because the
  list already announces "1 of 4". That is also why the e2e test uses `toContainText`:
  each item's raw text includes its hidden number.
- The heading is `text-h1` (36 / 40) below desktop and `lg:text-display-section` (58)
  on desktop. A utility with its own media queries still works behind `lg:`, so two
  existing roles combine into Figma's 36 / 40 / 56 scale.

### `about-principle.tsx`

The second headline line is indented 48 px on tablet and 90 px on desktop. Instead of
splitting the sentence into two messages, which would force translators to translate
half-sentences, the message marks the line with a tag:

```json
"title": "Minimalism, but <indent><greenUnderline>functional</greenUnderline> products.</indent>"
```

`<indent>` renders `md:block md:pl-12 lg:pl-22.5`. On mobile it stays inline, so the
sentence flows as one line, as in the mobile frame.

### `emphasisTags`

`<strong>` in messages becomes SemiBold `text-text-primary` inside muted paragraphs
(Figma: "brand", "experience", "today", "tomorrow"). It is a real `<strong>`, so the
emphasis is also semantic.

## 4. Tests

- `tests/e2e/routes.ts`: About joins the page harness (axe, one H1, lang, canonical,
  hreflang, no overflow at 390), in EN and PT, on desktop and mobile.
- `tests/e2e/about.spec.ts`: hero H1, the four story points in order, the principle
  heading and the CTA headline.
