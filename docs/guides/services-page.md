# Services page

**Covers:** #10, #124 (card grid). **Design source:** Figma 04 — Services (`129:2`): desktop `129:3`, tablet
`359:150`, mobile `359:438`, desktop modals `317:33`–`317:298`, tablet dialog `362:365`,
mobile sheet `362:307`. Services grid: desktop `467:1148`, tablet `468:410`, mobile
`468:679`.

## 1. What we built

`/en/services` and `/pt/services`, both static:

```
Photo hero        transparent nav over a photo · H1 · lead · quote card
Services grid     header (eyebrow · H2 · squiggle) · 5 cards (illustration · eyebrow · H3 ·
                  summary · What's included): 3 + 2 desktop, 2 + 2 + 1 tablet, 1 column mobile
                  a card → Dialog (tablet, desktop) or Drawer (mobile)
Our approach      tab list + panel (tablet, desktop) · accordion (mobile)
CTA band          Services headline override
```

Nav, footer and the mobile sticky CTA come from the `(site)` layout, as on Home.

## 2. Where the code lives

```
src/app/[locale]/(site)/services/
   page.tsx                          composes the sections, metadata
   _components/services-hero.tsx     server
   _components/hero-video.tsx        CLIENT: the looping hero video
   _components/service-grid.tsx      server: the header and one card per service (#124)
   _components/service-illustrations.tsx  server: the five drawings, parts marked with timings
   _components/illustration-parts.ts  the part kinds, drawPart(), PENCIL_RIDE (plain data)
   _components/illustration-player.tsx  CLIENT: plays a card's drawing as it scrolls in
   _components/service-details.tsx   CLIENT: the Dialog / Drawer
   _components/services-approach.tsx server, composing client Tabs + Accordion
src/content/services.ts              serviceSlugs, services, includedKeys
src/components/ui/tabs.tsx           new shadcn primitive (Radix)
src/components/ui/accordion.tsx      new shadcn primitive (Radix)
src/lib/use-media-query.ts           useMediaQuery + MEDIA_MD
```

Only `service-details.tsx` and the two new primitives ship component JavaScript. Everything
else renders on the server.

## 3. Runtime flow

### Rendering

`page.tsx` is a server component. Each section calls `getTranslations`, so every string
is resolved at build time for `en` and `pt`. The build output shows `○ /en/services` and
`○ /pt/services` (static).

### Opening a service

```
ServiceGrid (server)
  ├─ translates name, "01 / 05", rich title, details, 3 included items, labels
  └─ <ServiceDetails {...props}>               ← crosses into the client here
        useMediaQuery("(min-width: 48rem)")
          true  → <Dialog>  trigger + DialogContent (visual panel from lg)
          false → <Drawer>  trigger + DrawerContent (bottom sheet)
        one useState(open) shared by both
```

- **Why the server passes strings, not keys:** the client component never loads the
  message catalogue. It receives exactly the five strings it shows, and the title as
  already-rendered JSX (`t.rich(..., highlightTags)`). React can serialise JSX across the
  server→client boundary.
- **Why one `open` state for both containers:** if the window crosses 768 px while the
  details are open, the Dialog unmounts and the Drawer mounts, and both read the same
  `open`. The details stay open in the new container.
- **Server render and hydration:** `useMediaQuery` returns `false` on the server, so the
  HTML contains the Drawer's trigger button. Right after hydration, React re-reads the real
  media query and swaps to the Dialog on tablet and desktop. Both triggers are the same
  `<Button>`, so nothing visible changes.

### Accessibility behaviour (acceptance criteria)

| Requirement                      | Who provides it                                                                                        |
| -------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Trap focus                       | Radix Dialog `FocusScope` (vaul is built on Radix Dialog)                                              |
| Close on Esc                     | Radix `DismissableLayer`                                                                               |
| Return focus to the trigger      | Radix, because the trigger is a `DialogTrigger` / `DrawerTrigger`                                      |
| Each trigger has a distinct name | `aria-label="What’s included: Web Design"`: it contains the visible text, so voice control still works |
| Title and description announced  | `DialogTitle` / `DrawerTitle` and `…Description`                                                       |
| Sticky CTA hides while open      | Radix scroll lock sets `body[data-scroll-locked]` (rule in `globals.css`)                              |

**Bug found and fixed: the drawer did not trap focus.** vaul's `autoFocus` defaults to
`false`, which cancels Radix's "focus the first element on open". With nothing focused
inside the sheet, the focus trap has no element to return to, so Tab walked the page
behind it. `ui/drawer.tsx` now defaults `autoFocus` to `true` for every drawer. The
mobile e2e test tabs six times and asserts focus never leaves.

## 4. Files one by one

### `src/content/services.ts`

- `serviceSlugs` is a `const` tuple. It is declared first, and `services` is checked
  against it, so a typo in a slug fails the type check. The consultation form will
  validate with `z.enum(serviceSlugs)`; `services.test.ts` proves that works and that both
  lists stay in the same order.
- Copy lives in messages, not here: `Services.items.<key>.title | details | included.*`.
  `includedKeys` names the three included items, so components loop over keys instead of
  hard-coding them.

### `services-hero.tsx`

- The header is `position: fixed` and transparent on `/services` (`overlayNavRoutes`,
  built in #6). The hero starts at the top of the page and pads its own content below
  the nav: `pt-55` mobile, `pt-76` tablet, and bottom alignment inside `min-h-195`
  (780 px) on desktop.
- **Full first screen (#68):** the section is at least `100svh` tall at every size, with
  its content at the bottom, so no white from the next section shows on first view.
  780 px stays the desktop minimum.
- **Video (#68):** a looping clip plays over the photo (`hero-video.tsx`).
  - Sources: `services-hero-720.mp4` for phones (`media="(max-width: 767px)"`) and
    `services-hero.mp4` (1080p) above. Both are H.264 with no audio and fast start,
    encoded with ffmpeg (commands below).
  - The photo is still the first paint (`next/image`, priority). The video fades in
    over it once its first frame plays.
  - It is muted and `aria-hidden`. With `preload="none"` it downloads only when it
    plays.
  - **No pause control**, by the lead's decision at review. This is an exception to
    WCAG 2.2.2, recorded in tech debt.
  - Reduced motion and Data Saver still never start it; the photo stays.
  - Playwright's Chromium cannot decode H.264. The e2e tests check the attributes, the
    full-screen height and reduced motion, not playback. Check playback in Chrome,
    Edge or Safari.
- **Headline (#68 review):** the display size (40 / 48 / 64 px) with an 18–22 px lead.
  It sits higher than Figma (`lg:pb-28`, `md:pb-16`) and 48 px further in on desktop,
  so it holds its own over moving footage.
- **Re-encoding the clip** (from the original export, `ffmpeg` on the PATH):

  ```bash
  # 1080p for tablet and desktop
  ffmpeg -i source.mp4 -an -c:v libx264 -preset slow -crf 26 -vf "scale=1920:-2" \
    -pix_fmt yuv420p -movflags +faststart public/videos/services-hero.mp4
  # 720p for phones
  ffmpeg -i source.mp4 -an -c:v libx264 -preset slow -crf 24 -vf "scale=1280:-2" \
    -pix_fmt yuv420p -movflags +faststart public/videos/services-hero-720.mp4
  ```

- **Accessibility override:** the eyebrow is white at 85%, not green. Green fails
  contrast on the photo (Handoff, "Green eyebrow over the Services photo hero").
- `hero-scrim` (`globals.css`) is the Figma tint plus gradient: top-down below desktop,
  where text and quote stack over the photo; left-to-right on desktop.
- The quote is a `<figure>` with `<blockquote>` and `<figcaption>`, the semantic markup
  for a quote with its source.

### `service-grid.tsx` (#124)

It replaced the pinned "service blocks" (a collage beside text, a desktop scroll-through
stage with dot navigation). One server component renders the section; the only client
code is still `ServiceDetails`.

**Layout**

|                 | Desktop                                 | Tablet                                 | Mobile   |
| --------------- | --------------------------------------- | -------------------------------------- | -------- |
| Section padding | `--section-y` (120)                     | 88                                     | 72       |
| Header → grid   | 56                                      | 40                                     | 28       |
| Headline        | 44 px, second line indented 53 px       | 32 px                                  | 28 px    |
| Grid            | 6 columns: cards span 2, then 3 (3 + 2) | 2 columns, the last card spans both    | 1 column |
| Card media      | 232 tall; the wide row 272 wide, left   | 216 tall; the last card 272 wide, left | 200 tall |
| Card title      | 28 px (wide row 24)                     | 24 px                                  | 24 px    |

- The headline is `text-h2` (already 28 / 32) with `lg:text-[44px]`, the same override
  the Blog headline uses; no token is 44 px. The 53 px indent is `indentTag` with
  `lg:block lg:pl-13.25`: the message wraps the second line in `<indent>`, so the
  sentence stays whole for translators.
- Cards in a row share a height (grid stretch), and "What's included" sits at the bottom
  (`mt-auto`). Figma's frames are a few pixels taller (fixed heights with slack); the
  paddings and gaps are Figma's.
- Each card keeps `id={slug}` and `scroll-mt-24`, so `/services#content-writing` from the
  Home cards, the footer and the JSON-LD still lands on it, clear of the fixed header.
- The title message contains `<greenUnderline>`: the card renders it with `plainTags`,
  the dialog with `highlightTags`. One translation, two presentations.

**One interactive element per card.** The "What's included" trigger is stretched over the
card: `static` (so its `::after` anchors to the card, not the button) plus
`after:absolute after:inset-0`. A click anywhere opens the details, while keyboard and
screen-reader users meet one clearly named button ("What’s included: Web Design"). The
focus ring stays on the button. Because the `::after` belongs to the button, hovering
anywhere on the card hovers the button: the grid cancels the secondary button's tint
(`hover:bg-bg-surface`) and nudges its arrow 4 px instead of 2.

**The press bug.** The trigger's pressed scale must be `none`. Any `scale` value (the
button's usual 0.98, or even 100%) makes it the containing block of its `::after`, so
mid-press the stretched area collapsed to the button and the `pointerup` landed on the
text below: no click. The card shows the press by flattening its shadow instead
(`has-[button:active]:shadow-card-pressed`). The e2e test "a click anywhere on a card
opens its details" clicks the summary text, which would fail if this regressed.

**Two card shapes** (`cardLayout`). Vertical: the illustration panel on top (200 /
216 / 232 px tall, hairline below). Horizontal: the panel on the left (272 px wide, full
height, hairline on the right), with the eyebrow at 12 px / 0.04em and the title at
24 px. The wide cards are horizontal: cards 4 and 5 on desktop, the full-width fifth on
tablet. Mobile is all vertical.

**Illustrations** (`service-illustrations.tsx`, Figma `486:265`–`486:335`). They
replaced the card photos (lead's design change, 12 November), so the five
`service-<slug>.jpg` files and `service-photos.ts` are gone. Each drawing is inline SVG,
240 × 160, exported from Figma with its paths unchanged: inline because its parts
animate, which an `<img>` can't. Red is `text-action-primary` through `currentColor`;
the white underlays are `fill-bg-surface`, the check `stroke-icon-on-accent`. They are
decorative (`aria-hidden`); the copy carries the meaning.

**How a drawing plays** (Motion Spec › Service illustrations; timelines `494:476`,
`494:547`, `494:595`, `494:652`, `494:715`):

```
server   <path {...drawPart("trace", 0.35, { duration: 0.3 })} />   data-draw, -at, -for
client   IllustrationPlayer (the card's media panel)
           mount: below the fold and motion allowed? → hide every part
           IntersectionObserver (same margin as RevealGroup) → card in view
           loadRevealEngine() → animate() each part at its own time:
             trace   opacity on, stroke-dashoffset 1 → 0
             pop     opacity on, scale 0.6 → 1
             appear  opacity on
             ride    the pencil follows PENCIL_RIDE while the line writes (linear)
```

- The cards have no entrance of their own: the drawing is the reveal. The whole drawing
  runs 0–1.9 s; `service-illustrations.test.tsx` fails if a part ends later or a trimmed
  stroke lacks `pathLength="1"`.
- Same safety rules as RevealGroup: above the fold, before hydration, without
  JavaScript, with reduced motion, or if the engine fails to load, the drawing is simply
  complete.
- The timings live on the parts themselves (one place to change), read off the Figma
  timelines: a 4.6 s demo loop whose drawing occupies the first 1.9 s.

**Hover accents** (CSS transitions on the card's hover, hover devices only,
`motion-safe`): the cursor presses the button, the brackets spread 6 px, the pencil
tilts 5°, the heart swells to 112%, the update ring turns half a revolution. Held while
the pointer stays, sprung back when it leaves, so they can be interrupted at any point.
They use the individual `translate` / `scale` / `rotate` properties, which combine
with the `transform` the draw-on leaves on the same element.

**Motion summary** (details in [Motion](./motion.md)): the header rises and the
squiggle draws itself; each illustration draws as its card scrolls in; hover deepens the
shadow, nudges the arrow and plays the accent. No lift and no button tint. Press
flattens the shadow. Reduced motion: drawings complete, hover keeps only the shadow.

**Adding a service's illustration:** export the Figma component's SVG, copy its paths
into a component in `service-illustrations.tsx` (pen strokes through `<Trace>`), mark
each part with its timeline values, add it to `serviceIllustrations`, and check it on a
production build (the dev server can serve stale CSS for new classes).

### `service-details.tsx`

- Tablet and desktop share one `DialogContent`. From `lg` it becomes a two-column grid
  with the `VisualPanel` (position, 120 px icon tile, logomark watermark). Below `lg`,
  the panel is hidden and the small icon tile and "01 / 05" show in the header instead
  (Figma `362:383`).
- **The panel is primary red** (`bg-action-primary-fill`, #DC2626, the primary
  button's fill), not Figma's dark panel (`317:58`). That's the lead's decision (#119).
  The small icon tile below `lg` stands in for the panel, so it is red too.
  - The position label is full white: white at 70% on red is below 4.5:1, and full
    white is 4.83:1.
  - `data-surface="dark"` stays: it makes the focus ring white, which red needs as
    well.
- **The watermark draws itself on open** (#119). It uses the `mark-draw` keyframes with
  `DRAW_TIMING`:
  - after `--duration-base` (the dialog's own entrance), the stroke draws over
    `revealSpec.drawDuration` (1.2 s) on `--ease-draw`, the same timing as a mark
    drawing in a panel (reveal kind `draw`).
  - The content mounts on every open, so the draw replays each time, with no
    JavaScript.
  - **Why not the logo's 900 ms emphasized curve:** only the first ~40% of the path
    shows inside the panel, and that front-loaded curve drew it in about 100 ms. On
    the in-out curve the visible stretch draws over about half a second.
  - **Why inline styles:** Tailwind emits `motion-safe:animate-*` after plain
    utilities, and its `animation` shorthand resets any delay or timing class. Inline
    longhands always win.
  - **Reduced motion:** no animation; the mark is simply drawn.
  - Measured on a production build: hidden until 250 ms, about 70% drawn by 1.0 s,
    complete at about 1.45 s.
- `DetailsBody` is shared by the Dialog and the Drawer. It receives `Title`,
  `Description` and `Close` as components, so the same markup uses Radix parts in one
  container and vaul parts in the other.
- The watermark reuses `MARK_PATH` from `mark-panel.tsx` instead of a second copy of the
  logomark.

### `services-approach.tsx`

- Handoff: _"Talking Points (mobile): shadcn Accordion, type=single, collapsible."_
  Figma shows a list with one selected point beside a panel on tablet and desktop. That
  is the tabs pattern, so it uses Radix Tabs (vertical: ↑/↓ move between points).
- **One `Tabs` root holds both layouts.** The section heading renders once inside it.
  `TabsList` and `TabsContent` show from `md`; the `Accordion` shows below `md`. Rendering
  both is cheaper than a media-query hook here: no hydration swap, no layout shift.
  Display-none images are not downloaded.
- Figma designs only "Brand Identity". The other three points use draft copy (logged in
  tech debt).
- **Photos (#82):** every point has the lead's photo in `points` (1600 px, metadata
  stripped), so `image` is required and the old `MarkPanel` fallback is gone.
  - Each point can set `position`, an object-position class that keeps its subject in
    the landscape panel (480 × 320 desktop, about 364 × 260 tablet, 350 × 220 mobile).
    The photos are 3:2 like the desktop panel, so crops are slight; a portrait photo
    would show only a band, and its anchor would need checking at every width.
  - Decorative (`alt=""`): the point's title and copy carry the meaning.
  - `sizes` follows the panel: 480 px, about half the viewport on tablet, and the
    container (`100vw - 40px`) on mobile.
  - Check crops on a production build (`pnpm build && pnpm start`): the dev server
    can serve stale CSS that lacks a newly added `object-[…]` class, so every crop
    falls back to centred.

### `ui/tabs.tsx`, `ui/accordion.tsx`

shadcn-style wrappers over `radix-ui`, which is already a dependency, so nothing new was
installed. The accordion animates with the tw-animate `accordion-down/up` keyframes at
`--duration-base`; reduced motion shortens it to the global 150 ms rule.

**Tab panels keep the focus ring (#93).** Radix gives each panel `tabindex="0"`, so after
the selected tab, **Tab** moves into the panel. Keyboard users need to see where focus
went (WCAG 2.4.7). The shadcn default `outline-none` on `TabsContent` hid it, so it was
removed; the global `:focus-visible` rule in `globals.css` (2 px, 2 px offset) now draws
the ring. Clicking a tab focuses the trigger, not the panel, so mouse users never see it.
Don't add `outline-none` to a focusable element; if a design needs a different ring,
change the `:focus-visible` style instead.

### `lib/use-media-query.ts`

`useSyncExternalStore` subscribes to `matchMedia` without effects or extra renders, and
its third argument gives the server value, so hydration never mismatches. Use it only
when two branches need **different components**. If CSS can do it, use responsive
classes.

### `lib/utils.ts` (`cn`)

`tailwind-merge` now knows the named spacing tokens (`xs`…`2xl`). Before this,
`cn("p-xl", "p-0")` kept **both** classes, and the stylesheet order decided which one won.
That is why the first dialog render had an inset dark panel. Overrides like `p-0` or
`gap-0` on a primitive now win, as you'd expect.

## 5. Tests

- `src/content/services.test.ts`: slug order, `z.enum(serviceSlugs)`, and that every
  service has its title (with the `<greenUnderline>` keyword), details and three included
  items.
- `tests/e2e/routes.ts`: Services joins the page harness (axe, one H1, lang, canonical,
  hreflang, no overflow at 390 px), in EN and PT, on desktop and mobile.
- `tests/e2e/services.spec.ts`: hero; five blocks with slug ids; anchor below the header;
  open → title, items, Book link → focus stays inside → Esc closes → focus returns (Dialog
  on desktop, Drawer on mobile); Close button; tabs on desktop, accordion on mobile; Tab
  from the selected tab focuses its panel, which draws the 2 px ring (#93).
- **Hydration in tests:** a click on server-rendered HTML before React hydrates it does
  nothing, and `networkidle` does not guarantee hydration on a busy machine.
  `untilHydrated()` retries the action until its effect is visible. Use the same pattern
  for any new interactive e2e test.

## 6. Day-to-day rules

- **Add or rename a service:** change `serviceSlugs` and `services` together, add
  `ServiceNames`, `ServiceSummaries` and `Services.items.<key>`, run `pnpm i18n:pseudo`.
  Renaming a slug also needs a database migration (consultation requests store it).
- **Change dialog copy:** edit `messages/en.json`. Keep exactly one `<greenUnderline>`
  keyword in each title.
- **Swap a photo:** approach points in `points` in
  `services-approach.tsx`. Export at 1600 px with metadata stripped, set a crop anchor,
  check 1440 / 768 / 390 on a production build, and update the register in
  [Images](./images.md).
