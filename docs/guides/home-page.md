# Home page

**Covers:** #9. **Design source:** Figma 03 — Home (`49:2`): desktop `49:3`, tablet
`347:444`, mobile `347:155`.

## 1. What we built

The first real page, replacing the Phase 1 placeholder at `/en` and `/pt`:

```
Hero              eyebrow · H1 with a green keyword · lead · Book + View Services
Why it matters    mark panel | right-aligned copy + 3 checks
What we do        5 ServiceCards → /services#<slug>
Our philosophy    left copy + 3 checks | mark panel   (mirror of "Why it matters")
How it works      4 steps: journey line (desktop), 2×2 (tablet), connector (mobile)
CTA band          from #8
```

Nav, footer and the mobile sticky CTA come from the `(site)` layout.

## 2. Where the code lives

```
src/app/[locale]/(site)/page.tsx              composes the sections, metadata
src/app/[locale]/(site)/_components/          Home-only sections
   home-hero.tsx · home-services.tsx · home-process.tsx
src/components/site/                          reusable across pages
   feature-split.tsx · section-header.tsx · check-list.tsx
   mark-panel.tsx · highlight.tsx
```

A folder starting with `_` is a **private folder** in the App Router: Next.js never
turns it into a route. That makes it a safe place to keep components next to the one
page that uses them. Anything another page will need (About will reuse `FeatureSplit`
and `SectionHeader`) goes in `src/components/site/` instead.

## 3. Reusable pieces

### `highlightTags`: emphasis that survives translation

Figma headlines colour one or two words: red, green, or a green underline. The words
are marked in the messages:

```json
"title": "The <red>businesses</red> that grow fastest … They’re <underline>the clearest</underline>."
```

and every heading renders them with the same tag set:

```tsx
t.rich("title", highlightTags);
```

The translator keeps the tags around the right Portuguese words. Red and green are only
used in large headlines, where those colours pass contrast.

### `SectionHeader`

The "eyebrow + H2" pair. Two details:

- The eyebrow is a `<p>`, never a heading (Handoff: "Eyebrows are not headings").
- It's written in sentence case in the messages ("What we do"); `text-overline` makes it
  uppercase. Translators then work with normal text, and screen readers don't spell out
  capitals.

`align="center" | "end"` only applies from desktop; on tablet and mobile Figma
left-aligns every header.

### `FeatureSplit`

"Why it matters" and "Our philosophy" are mirror images, so one component takes
`panel="start" | "end"`:

- **Mobile:** copy first, panel below (`order-last`).
- **Tablet/desktop:** side by side; `md:flex-row-reverse` puts the panel on the right
  for `panel="end"`.
- `align="end"` right-aligns the copy on desktop only, like "Why it matters".
- `panelClassName` sets the desktop panel size, which differs between the two sections
  in Figma (520×600 vs 480×560).

### `MarkPanel`

The dark panel with the white NortBrand mark. `CLAUDE.md` calls these placeholders for
future photography, so the panel is `aria-hidden` and marked `data-placeholder="image"`,
which makes them easy to find when real images arrive. The mark is the exact Figma
vector, inlined with `currentColor`.

## 4. The sections

### Hero

- The page's **only H1**. Every other section heading is an H2, and the steps are H3.
- `data-sticky-cta-trigger`: the mobile sticky CTA appears once the hero scrolls away.
- Buttons are `Button asChild` around next-intl `Link`s: button styling, link
  semantics, and the locale is added automatically.

### What we do

- A `<ul>` of `ServiceCard` links to `/services#<slug>`, from `services.ts`, which now
  also holds each service's Figma icon.
- Grid: 3 columns on desktop, 2 on tablet (`md:last:col-span-2` makes the fifth card
  full width, as in Figma), 1 on mobile.

### How it works

- An **ordered list** (`<ol>`): the order is the content.
- The "01–04" badges are `aria-hidden`, because the list already announces "1 of 4".
  Their numbers use red/600: Figma's red/500 on the pale red tile was 3.9:1, which axe
  flagged as failing contrast at 18 px.
- **Desktop:** the cards sit at Figma's staggered heights (`lg:mt-10/19/3/10`) over the
  red journey line, an inline SVG drawn static. Its draw-on animation is part of the
  Motion ticket. `vectorEffect="non-scaling-stroke"` keeps the line 2.5 px thick even
  though the SVG stretches to the container width.
- **Mobile:** a thin connector runs behind the cards; the white cards cover it except
  in the gaps, which gives Figma's "joined steps" look with one element.

## 5. The sticky CTA moved to the layout

After review, the sticky CTA appears on every page except Contact, Legal, the 404 and
blog posts (Figma shows it on Home; Handoff lists where it's hidden). It's now mounted
once in `(site)/layout.tsx`. A page opts in by marking its hero with
`data-sticky-cta-trigger`. Pages that should never show it just don't mark one, so
there are no route rules.

## 6. How the tests protect this

| What could go wrong                               | Test                        |
| ------------------------------------------------- | --------------------------- |
| H1 missing or CTAs pointing to the wrong pages    | `e2e/home.spec.ts`          |
| A service card missing or losing its anchor       | `e2e/home.spec.ts` (PT)     |
| Steps out of order                                | `e2e/home.spec.ts`          |
| Sticky CTA showing over the hero or the CTA band  | `e2e/home.spec.ts` (mobile) |
| Contrast (caught the step badges), landmarks, 390 | page harness (axe), EN + PT |

The mobile menu tests now open the menu with `openMenu()`, which retries the tap until
the dialog is open. On the larger Home page a tap could land before React had hydrated
the button.

## 7. Day-to-day rules

1. **Coloured words in a headline:** mark them in the message with `<red>`, `<green>`
   or `<underline>`, and render with `t.rich(key, highlightTags)`.
2. **Page-only section:** put it in that page's `_components/`. If a second page needs
   it, move it to `src/components/site/`.
3. **New page with a hero:** add `data-sticky-cta-trigger` to show the sticky CTA on
   mobile, or leave it off to hide it.
4. **Replacing a mark panel with a photo:** search for `data-placeholder="image"`.
