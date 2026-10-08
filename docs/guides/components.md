# Components: primitives and cards

**Covers:** #4 (Logo), #5 (Badge, FieldError, Select, icon map, TextLink, ServiceCard,
ArticleCard). **Design source:** Figma 02 Components (`37:4`), Handoff (`389:2`).

## 1. Where components live

```
src/components/ui/     shadcn-style primitives, no project knowledge
                       (Button, Input, Textarea, Label, Select, Badge, FieldError, …)
src/components/site/   NortBrand components that know about routing, content or brand
                       (Logo, TextLink, ServiceCard, ArticleCard; nav and footer next)
src/lib/icons.ts       the Figma icon set mapped to Lucide
```

Rule of thumb: if a component imports from `@/i18n` or shows brand content, it belongs
in `site/`. `ui/` components must work in any project.

## 2. How a component is styled

Every component follows the same pattern, copied from the shadcn Button:

```ts
const badgeVariants = cva("base classes", {
  variants: { variant: { neutral: "…", accent: "…", selected: "…" } },
  defaultVariants: { variant: "neutral" },
});
```

- **`cva`** (class-variance-authority) turns Figma's variant properties
  (`Style=Accent`) into props (`variant="accent"`).
- **`cn(...)`** merges classes and resolves conflicts, so `<Logo className="w-36" />`
  replaces the default `w-26` instead of adding a second width.
- **Only tokens.** Colours, radii, spacing and shadows come from `globals.css` (`bg-bg-
surface`, `rounded-lg`, `shadow-card`). Tailwind's default palette is removed, so a
  class like `bg-red-500` does not exist and cannot slip in.
- **`data-slot`** on the root (`data-slot="badge"`) gives tests and parent styles a
  stable hook that does not depend on class names.

## 3. The primitives

### Badge (`ui/badge.tsx`)

Three variants from Figma. Two decisions worth knowing:

- **Accent text is red/600 (`text-text-accent`), not the red in Figma.** Small red text
  on the pale red fill fails contrast with red/500, so the accessibility override from
  CLAUDE.md applies.
- **`asChild`** lets the blog's filter chips reuse the styles on a real button:
  ```tsx
  <Badge asChild variant="selected">
    <button type="button" aria-pressed="true">
      All
    </button>
  </Badge>
  ```
  `asChild` uses Radix `Slot`: instead of rendering a `<span>`, it merges its classes
  onto the single child element.

### FieldError (`ui/field-error.tsx`)

The error message under a field: a decorative icon (`aria-hidden`) plus the text.
Errors must never be colour alone. Connect it to its field:

```tsx
<SelectTrigger id="service" aria-invalid aria-describedby="service-error" />
<FieldError id="service-error">Please choose a service</FieldError>
```

`aria-invalid` turns the border red (styled in `fieldClassName`), and
`aria-describedby` makes screen readers read the message when the field gets focus. On a
`data-surface="dark"` panel the error token switches to red/300 automatically.

### Select (`ui/select.tsx`)

The shadcn Select, built on Radix. Radix does the hard parts: keyboard navigation,
typeahead, focus return, a hidden native `<select>` for form submission, and positioning
the list. We only style it.

- The trigger reuses **`fieldClassName`** from `ui/input.tsx`, so Input, Textarea and
  Select share one definition of border, hover, focus halo, error and disabled. Change
  it there and all three follow.
- It is a client component (`"use client"`) because Radix needs state. It can still be
  used inside a server page; only the Select itself ships JavaScript.
- The open list is **not designed in Figma**. It uses existing tokens (surface, border,
  `shadow-card`, red/50 highlight) and is logged in `docs/tech-debt.md`.

### Icons (`lib/icons.ts`)

```ts
export const icons = { calendar: Calendar, layout: PanelLeft, gear: Cog, … };
export const ICON_STROKE = 1.75;
```

Figma names its icons (`icon/calendar`); content files can say `icon: "calendar"` and
stay free of Lucide imports. `ICON_STROKE` keeps every icon at the Figma line weight.
`satisfies Record<string, LucideIcon>` checks each entry is an icon while keeping the
exact key names for the `IconName` type.

### Logo (`site/logo.tsx`)

The Figma logo (`54:16`) inlined as an SVG component, with the wordmark already
converted to shapes, so it never depends on a font.

- The wordmark is `fill="currentColor"`: it takes the surrounding text colour, dark on
  light pages and white over the Services photo, with no prop needed.
- The squiggle mark always uses the brand red token (`stroke-action-primary`).
- It is an image named "NortBrand" by default. Pass `decorative` when a surrounding
  link already names it (for example the nav's home link), so it is not read twice.
- `src/app/icon.svg` (the browser tab icon) is the mark alone.

## 4. TextLink and the "card hover" trick

`site/text-link.tsx` exports two things:

- **`TextLink`**: a real link (next-intl `Link`, so it adds `/en` or `/pt`), with the
  label and arrow. It has a 44 pt touch target (`min-h-11`) that relaxes on desktop.
- **`TextLinkContent`**: just the label and arrow, as spans, with no link.

Why two? A card is one big link. If "Learn More" inside it were another link, we would
have a **link inside a link**, which is invalid HTML and confusing for keyboard users. So
cards render `TextLinkContent` as a visual label.

The hover effect still has to work when you hover the _card_. That is what `group/link`
does:

```
<a class="group/link …">                      ← card or TextLink root
  <span class="group-hover/link:underline">   ← label underlines when the root is hovered
  <svg  class="group-hover/link:translate-x-1"> ← arrow moves 4 px
```

Tailwind's named groups let a child react to a specific ancestor's hover. The root
exports `LINK_ROOT = "group/link"` so every card uses the same name.

The arrow moves with `translate-x-1` (a transform) instead of changing the gap from 8 to
12 px like Figma: it looks the same but does not make the browser recalculate layout.
It is wrapped in `motion-safe:` so users who ask for reduced motion do not get it.

## 5. The cards

### ServiceCard (`site/service-card.tsx`)

The whole card is one interactive element, and it can be **either** a link or a button:

```tsx
<ServiceCard href="/services" icon="calendar" title="…" … />   // renders <a>
<ServiceCard icon="calendar" title="…" … />                     // renders <button>
```

The button form exists for the Services page: there, a card opens a Dialog. Radix's
`<DialogTrigger asChild>` wraps the card and passes its props (`onClick`, `aria-expanded`,
…) to it. The card spreads unknown props onto its root, so those arrive on the button.

The TypeScript type is a **discriminated union**: `href` present → link props are
allowed; `href` absent → button props are allowed. Passing `href` and `type="submit"`
together is a type error.

Because a `<button>` may only contain phrasing content, everything inside is a `<span>`
(no `<div>`, `<p>` or headings). A unit test checks this.

States: hover deepens the shadow (`shadow-card-hover`), pressed sinks to the page
background with a flat shadow (`shadow-card-pressed`), and focus uses the global ring.
The two shadow tokens are new in `globals.css`, with their Figma node ids.

### ArticleCard (`site/article-card.tsx`)

A blog post preview. Always a link, so the title can be a real heading (`h3` by default,
`headingLevel` to change it) and screen-reader users can jump between posts.

- **Hover:** lifts 4 px, deeper shadow, image zooms to 1.03. **Pressed:** scale 0.99.
  The lift and zoom are `motion-safe:`; the shadow change always runs.
- **The thumbnail has `alt=""`.** The link's name already comes from the title. A
  descriptive alt would make screen readers read the image description too, on every card.
- **It takes ready-made values** (`byline: "NortBrand · Sep 2026"`). The blog ticket
  fetches posts from Sanity and formats the date in the page's locale; the card only
  renders. This keeps it testable and free of data fetching.
- **`ArticleCardSkeleton`** uses the same frame (`frameClassName`), so when posts load the
  grid does not jump. It is `aria-hidden`; the list around it announces "loading".

## 6. How the tests protect this

| What could go wrong                               | Test                                 |
| ------------------------------------------------- | ------------------------------------ |
| Badge accent loses the contrast override          | `ui/primitives.test.tsx`             |
| Filter chip can't reuse Badge styles              | `ui/primitives.test.tsx` (`asChild`) |
| Error message without an icon                     | `ui/primitives.test.tsx`             |
| A Figma icon missing from the map                 | `ui/primitives.test.tsx`             |
| TextLink loses its touch target                   | `site/cards.test.tsx`                |
| ServiceCard renders a nested link, or block tags  | `site/cards.test.tsx`                |
| Dialog trigger props not reaching the card button | `site/cards.test.tsx`                |
| Article thumbnail gets a duplicate alt            | `site/cards.test.tsx`                |
| Contrast, labels, names on the real page          | e2e page harness (axe), both locales |

The tests render to static HTML with `react-dom/server` (no extra testing library) and
mock `@/i18n/navigation`'s `Link` with a plain `<a>`, because the real one needs a
request locale.

## 7. Day-to-day rules

1. **Need a variant?** Add it to the component's `cva` config, not a one-off class at the
   call site.
2. **Need an icon?** Add it to `lib/icons.ts` with its Figma name.
3. **Clickable card?** Make the card the link or button and use `TextLinkContent` inside.
   Never put a link inside it.
4. **Form field?** `Label` with `htmlFor`, the field with `id`, and on error
   `aria-invalid` + `aria-describedby` pointing at a `FieldError`.
5. **New value not in the tokens?** Add a token to `globals.css` with its Figma source;
   never hard-code it in the component.
