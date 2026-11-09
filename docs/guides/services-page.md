# Services page

**Covers:** #10. **Design source:** Figma 04 — Services (`129:2`): desktop `129:3`, tablet
`359:150`, mobile `359:438`, desktop modals `317:33`–`317:298`, tablet dialog `362:365`,
mobile sheet `362:307`.

## 1. What we built

`/en/services` and `/pt/services`, both static:

```
Photo hero        transparent nav over a photo · H1 · lead · quote card
Service blocks    5 × (collage | eyebrow · H2 · summary · More Details)
                  More Details → Dialog (tablet, desktop) or Drawer (mobile)
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
   _components/service-blocks.tsx    server: one <article id={slug}> per service
   _components/service-collage.tsx   server: two photos, or the Figma placeholder
   _components/service-photos.ts     each service's collage photos, by slug (#82)
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
ServiceBlocks (server)
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

| Requirement                      | Who provides it                                                                                     |
| -------------------------------- | --------------------------------------------------------------------------------------------------- |
| Trap focus                       | Radix Dialog `FocusScope` (vaul is built on Radix Dialog)                                           |
| Close on Esc                     | Radix `DismissableLayer`                                                                            |
| Return focus to the trigger      | Radix, because the trigger is a `DialogTrigger` / `DrawerTrigger`                                   |
| Each trigger has a distinct name | `aria-label="More Details: Web Design"`: it contains the visible text, so voice control still works |
| Title and description announced  | `DialogTitle` / `DrawerTitle` and `…Description`                                                    |
| Sticky CTA hides while open      | Radix scroll lock sets `body[data-scroll-locked]` (rule in `globals.css`)                           |

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

### `service-blocks.tsx`

- Each block is `<article id={slug} aria-labelledby="<slug>-title">`, so the Home cards
  and the footer links (`/services#content-writing`) land on it. `scroll-mt-24` stops the
  fixed header covering the heading. An e2e test checks this.
- The title message contains `<greenUnderline>`. The block renders it with `plainTags`
  (no emphasis); the dialog renders the same message with `highlightTags`. One
  translation, two presentations.
- Odd blocks put the collage last from tablet up (`md:order-last`). DOM order stays
  collage then text, which is the mobile order.
- **The empty column on desktop:** `lg:pr-[calc(var(--gutter)+--spacing(19))]` keeps
  76 px free on the right. Figma's dot navigation (`173:2`) sits there, and the Motion
  ticket adds it with the pinned blocks. Until then, text and collage are exactly where
  Figma puts them.

### `service-collage.tsx` and `service-photos.ts`

Every position is a percentage of the Figma 555 × 449 frame (`aspect-555/449`), so one
component scales to every breakpoint's collage width (350 / 312 / 556 px): a large panel,
with a square overlapping its top-right corner.

- **With photos (#82):** `servicePhotos[slug]` gives a `main` and a `detail` photo, each
  with an optional object-position class to keep its subject in the crop. Both render
  through `PhotoPanel`, the same component as the Home photos (blur placeholder,
  hairline ring). The square keeps its surface-coloured border. It clips with
  `overflow-hidden`, so the photo follows the border's inner radius.
- **Without:** the Figma placeholder, with the glyphs in `public/images/placeholder/`
  and `data-placeholder="image"` (tech debt).
- **Decorative either way.** The collage is `aria-hidden` and the photos have `alt=""`.
  The text beside the collage carries the meaning.
- **Why the photos live in `service-photos.ts`, not `src/content/services.ts`:** the
  consultation form and analytics also import `services.ts`. Image imports there would
  add the photos' data (including blur placeholders) to those client bundles.
- **`sizes` is computed, not written by hand.** `object-cover` scales a 3:2 photo to the
  height of the 1.1:1 main panel, so the photo is drawn about 1.36× wider than the panel.
  With `sizes` describing only the panel, desktop browsers picked the 1080 px file for a
  photo drawn about 1150 device pixels wide. `coverSizes()` multiplies each piece's
  share of the collage by `max(1, photo aspect ÷ panel aspect)`, so a photo with a
  different shape still gets the right file. A portrait photo (Web Development's detail)
  is drawn at its panel's width, so its factor is 1, and the crop anchor picks which
  band of it shows. If the collage widths in
  `service-blocks.tsx` change, update the `COLLAGE_*` constants.
- **No `settle`, unlike Home.** On Home the panel slides, so the photo's 1.6% zoom is
  the only scale movement. Here the `pop` already scales each panel from 0.88 to 1, photo
  included, so a settle would not be visible. As two more reveal items it would also
  delay the square and the copy by 100–200 ms on every stage step, because the engine
  staggers items by DOM order.
- **Adding a service's photos:** export at 1600 px wide with metadata stripped, put the
  files in `src/assets/images/service-<slug>.jpg` and `service-<slug>-detail.jpg`, add
  an entry to `servicePhotos`, check the crop at 1440 / 768 / 390, and record the
  licence in `docs/tech-debt.md`.

### `service-details.tsx`

- Tablet and desktop share one `DialogContent`. From `lg` it becomes a two-column grid
  with the dark `VisualPanel` (position, 120 px icon tile, logomark watermark). Below
  `lg`, the panel is hidden and the small icon tile and "01 / 05" show in the header
  instead (Figma `362:383`).
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
- Figma designs only "Brand Identity". The other three points use draft copy and
  `MarkPanel` (logged in tech debt).

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
- **Real photography:** replace `ServiceCollage` per service, and the `MarkPanel` points
  in `services-approach.tsx`, with `next/image` and meaningful alt text. Then remove the
  tech-debt entries.
