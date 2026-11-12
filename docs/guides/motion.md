# Motion

**Covers:** #27, including the revision after the first review. **Source:** Figma 10 —
Motion Spec (`331:2`): tokens, inventory, reduced motion, implementation.

## 1. The rules

The spec's principles are **purposeful, quiet, respectful**. After the first review the team
asked for more presence ("way too subtle"), so reveal travel and stagger grew (§3), but the
rules stayed:

| Use                                              | For                                                           | Examples here                                                                 |
| ------------------------------------------------ | ------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| **CSS** (`--duration-*`, `--ease-*`, tw-animate) | hover, focus, press, first-paint entrances, simple enter/exit | button icon morphs, hero entrances, page fade, menu stagger, card hover/press |
| **Motion** (`motion/react`)                      | anything triggered by scroll position, springs, orchestration | reveals, journey line, approach accent                                        |

Every duration, easing and spring comes from `src/lib/motion.ts` (Motion) or the matching
CSS variables in `globals.css`; components define none of their own. Where the review
changed a spec value, `motion.ts` says so. `motion.test.ts` fails if a CSS duration or
easing drifts from `motion.ts`.

| Token                                                      | Used by                                        |
| ---------------------------------------------------------- | ---------------------------------------------- |
| `spring.accent` (420/32)                                   | nav underline, approach marker                 |
| `spring.pop` (260/20)                                      | `pop` reveals                                  |
| `ease.draw` / `--ease-draw`                                | mark stroke, journey line, keyword underlines  |
| `revealSpec.lineDuration`, `.underlineLag`, `.swapStagger` | journey line, underline delay, approach panels |
| `--enter-step` (110 ms)                                    | hero entrances                                 |

## 2. Setup

- **`motion` 13.4.4, pinned exactly.** 14.x was days old when this ticket started (14.0.0
  a new major, 14.1.0 one day old), so I took the newest release with more than two weeks
  in the wild.
- **`MotionProvider`** (root of `[locale]/layout.tsx`):
  - `LazyMotion` loads the `domAnimation` features on demand. `strict` means a stray
    `motion.div` throws; always use `m.*`.
  - `MotionConfig reducedMotion="user"`.
- **Imperative animations** (`animate()` from `motion/react`) check
  `prefersReducedMotion()` at the moment they start.

## 3. The reveal system

One vocabulary for every section, in these files under `src/components/motion/`:

| File                    | Role                                                                          | Runs on                              |
| ----------------------- | ----------------------------------------------------------------------------- | ------------------------------------ |
| `reveal-item.ts`        | **markers**: `revealItem(kind)` and `enterItem(index)` return data attributes | server and client (no Motion import) |
| `reveal-dom.ts`         | finding, measuring and hiding items: `hide()`, `unhide()`, `isBelowFold()`    | client (no Motion runtime)           |
| `reveal-engine.ts`      | **how** items animate: `play()`, plus Motion's `animate()`                    | client, loaded after hydration       |
| `load-reveal-engine.ts` | `loadRevealEngine()`: fetches the engine once, in its own chunk               | client                               |
| `reveal-group.tsx`      | **when**: as each item scrolls in                                             | client                               |

**Why the engine loads late (#105).** The engine pulls in Motion's `animate()`, about
17 KiB gzipped. Lighthouse counts every script requested before the first paint
([Performance](./performance.md)), so components on every page (RevealGroup,
ProcessTrack, NavLinks, the table of contents) import only `reveal-dom.ts` up front.
They hide items as before, call `loadRevealEngine()` from an effect, and play once it
resolves. If it fails to load, they `unhide()` everything, so content never stays
hidden. ApproachTabs (Services) still imports the engine directly: it places items
inside layout effects, which can't wait for a chunk.

Markup stays server-rendered. A section opts in like this:

```tsx
<RevealGroup className="container-page …">
  <div {...revealItem("left")}><MarkPanel draw /></div>   {/* first */}
  <SectionHeader … />                                      {/* eyebrow, title: marked inside */}
  <p {...revealItem()}>{body}</p>
  <CheckList items={points} reveal />                      {/* each point */}
</RevealGroup>
```

Why the markers live in their own file: Server Components spread `revealItem()`, and a
module that imports `motion/react` must not be evaluated on the server.

**Kinds** (`motion.ts › revealSpec`), all 700 ms emphasized unless noted:

| Kind             | Movement                                                         | Used for                                                                |
| ---------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `up`             | rise 32 px + fade (spec: 24)                                     | text, cards                                                             |
| `left` / `right` | slide 64 px from that side + fade                                | image panels, approach content                                          |
| `pop`            | scale 0.88 → 1 on a spring with slight overshoot                 | the CTA card                                                            |
| `draw`           | SVG stroke draws (1.2 s in-out; the path needs `pathLength={1}`) | marks in panels, the Services title squiggle (`LogoMark draw="reveal"`) |
| `underline`      | a keyword underline draws left to right, 250 ms after its turn   | highlighted words (`highlight.tsx`)                                     |
| `settle`         | scale 1.016 → 1 over 1.6 s, no fade (its panel fades); see below | photos in panels (`PhotoPanel`)                                         |

**Photo panels (#82).** When a section's placeholder becomes a photograph, `PhotoPanel`
keeps the panel's arrival (`left`/`right`) and replaces the mark's `draw` with `settle`:
the photo zooms out inside the arriving panel, 100 ms behind it. Duration and curve are
the Services hero's `--animate-hero-settle` (1.6 s, emphasized), so both photo moments
share a rhythm; the zoom is a fifth of the hero's (1.6% instead of 8%, decided by the
lead on 8 November) because a full hero zoom inside a small, already-moving panel read
as an effect. Values: `revealSpec.settleScale` / `.settleDuration`. With reduced motion
there is no scale at all. The settle and the desktop parallax sit on separate layers, so
they never compete for one element's transform.

**How a group behaves:**

- **Each item is watched on its own** (IntersectionObserver). Items that arrive together
  play in document order, **100 ms apart** (spec: 60).
  - On desktop that reads as "panel, then eyebrow, title, copy, list".
  - On a phone, a tall list reveals card by card as you scroll.
- **It never hides what the reader can already see.** The server renders everything
  visible. After mount, only items still _below the fold_ are hidden. Above the fold,
  before hydration and without JavaScript, the page is simply there.
- **No flash.** `hide()` runs synchronously before `play()`, so nothing shows at its
  final state for one frame.
- **Reduced motion:** opacity only, 150 ms, no stagger; strokes are simply drawn.

## 4. What moves, page by page

### Every page

- **Page transition.** `(site)/template.tsx` is remounted on every navigation and renders
  `PageTransition`.
  - On client-side navigations it marks the page `data-page-transition`: a 250 ms fade,
    the spec's route-change token. Opacity only, so `fixed`/`sticky` children keep
    working.
  - The first load is skipped. The server HTML must match the first client render, and
    the splash and hero entrance already cover it.
  - The nav and footer sit in the layout, so they never fade.
- **Hero entrances** (`[data-enter]`, CSS), on the Home, Services, About and Contact
  heroes. Each element rises 28 px out of a 6 px blur, 110 ms after the previous one.
  This is CSS, not Motion: the hero is on screen at first paint and must not wait for
  hydration.
- **Button icon morph** (`Button hoverIcon`, CSS):
  - **Which buttons:** every _Book a Consultation_ (`BookingButton`) turns its arrow into a
    **calendar**, and Home's _View Services_ turns it into a **grid of services**. Other
    buttons with an arrow nudge it 2 px.
  - **How it moves:** following Emil Kowalski's approach, only transform, opacity and blur
    animate. Going in takes 250 ms on an ease-out curve; coming back takes 150 ms on the
    exit curve. It answers the pointer at once and lets go quickly.
  - **Triggers:** hover and keyboard focus. Hover only applies on devices that can hover,
    so it never sticks on touch.
  - **Reduced motion:** a crossfade.
- **CTA band:** the headline and line rise, then the action card pops.
- **Keyword underlines** (`underline-draw` utility). Underlines are a background stripe
  whose width is a registered custom property, `--draw` (0–1), instead of
  `text-decoration`, so they can draw left to right and follow the words across line
  breaks.
  - In a hero they draw with CSS after the headline enters.
  - Inside a reveal group the engine draws them after the heading.
  - Anywhere else (the details dialog) they are simply drawn.
- **Nav links** (desktop): one red underline travels between links on hover and keyboard
  focus. It springs from link to link (a 1 px bar scaled to the link width) and fades
  when the pointer leaves.
- **Service cards:** lift 4 px on hover, and the icon tile scales and tilts.
- **Details dialog / drawer:** after it opens, its rows rise in 60 ms apart
  (`stagger-in`, CSS: the content mounts on every open). On desktop the red panel's
  logomark draws itself after the dialog's entrance: the `mark-draw` keyframes on the
  panel-draw timing (1.2 s, `--ease-draw`). With reduced motion it is simply drawn.
  Details in `services-page.md` (#119).

### Home

- **Hero** fills the first screen below the header, with its content centred, so _Why it
  matters_ starts below the fold. (A looping scroll cue was tried and removed after
  review: it read as a loading bar.)
  - The class is `min-h-[calc(100svh-var(--header-height))]`.
  - `--header-height` (73/77/93 px) lives in `globals.css`. Keep it in step with
    `site-nav.tsx`.
- **Why it matters / Our philosophy** (`FeatureSplit`): the panel slides in from its own
  side and its mark draws. Then the eyebrow, title, body and each point follow. The
  section clips horizontally, so the slide never adds a scrollbar. On desktop the mark
  drifts ±24 px slower than the page (`Parallax`). The wrapper is always an `m.div`:
  switching element type after hydration would remount the mark, and the reveal group
  would lose the path it hid.
- **What we do:** the heading, then the cards, row by row.
- **How it works** (`process-track.tsx`) is no longer scroll-linked:
  - **Desktop:** once 60% of the steps are on screen, the line draws over 1.6 s (in-out).
    Each card rises in as the line reaches it (`CARD_DELAYS`).
  - **Below desktop:** the cards reveal one by one. On mobile, the connector draws when
    the list arrives.

### Services

- **Hero photo** settles from 108% to 100% scale over 1.6 s while the text enters.
- **Services grid** (`service-grid.tsx`, #124; it replaced the pinned blocks and their
  dot navigation). One RevealGroup:
  1. the eyebrow and headline rise; the squiggle draws itself (`LogoMark draw="reveal"`,
     reveal kind `draw`);
  2. each card rises as it scrolls in. Cards that arrive together (row 1 on desktop) are
     staggered 100 ms apart; on mobile they reveal one by one.
  - **Hover** (hover devices only): the card lifts 4 px (`--duration-base`, emphasized),
    its shadow deepens and the icon chip scales 1.1 and tilts, the Home service cards'
    language.
  - **Press:** the card's shadow flattens (`shadow-card-pressed`). Nothing moves, see the
    bug below.
  - **Reduced motion:** opacity only; no lift, tilt or drawing.

- **Our approach** (`approach-tabs.tsx`):
  - **Left:** one red accent travels between the points. It springs to the selected one
    (`spring.accent`) and stretches up to 2.2× while it moves, like a drop. The
    selected title slides 27 px right. This is a translate, so nothing reflows.
  - **Right:** on every change, the media, title, copy and button slide in from the
    right, 60 ms apart.
  - **Before hydration:** each active point shows its own static accent until the
    travelling one has been measured.
  - **Mobile accordion:** the accent grows in from its centre.

### About and Contact

The heroes use the entrance. The story, principle, steps and FAQ sections are reveal
groups: the header first, then each paragraph, list item, card or question. The Contact
logomark draws once.

### Mobile menu

Links rise 12 px, 40 ms apart, unchanged from the first pass.

### Bugs found while building

- **Radix mounts a new panel late.** Radix Tabs render a newly selected panel's children
  one commit _after_ the value changes, so the slide-in effect found nothing to animate.
  The fix is `forceMount` on the panels; CSS already hides the inactive ones.
- **A pressed card swallowed its own click (#124).** The card's "More Details" trigger
  is stretched over the card with an absolute `::after`. Its press feedback set
  `scale` (first 0.98, then even `100%`), and any `scale` other than `none` makes the
  element the containing block of its absolute children. So mid-press the `::after`
  collapsed to the button, the `pointerup` landed on the text below, and no click fired.
  The trigger's pressed scale is now `none`, and the card shows the press with its
  shadow. Found by an e2e test that clicks the summary text.
- **The approach marker jumped instead of travelling.** Its ResizeObserver was recreated
  on every selection, and an observer always reports once when it starts observing; that
  report placed the marker instantly and cancelled the spring. Only real resizes re-place
  it now, and the e2e test checks the marker passes through the points in between.
- **Slow Services page.** It was slow (7.8 s to load, 7 fps afterwards in the test
  browser), and this also explains why its e2e tests kept timing out since #10. A trace
  showed seconds of rasterisation. Bisecting by section and then by layer pointed to
  next/image's `placeholder="blur"` on the full-bleed hero photo: an SVG Gaussian blur
  painted over 1440 × 780. It is removed on the two full-bleed photos (Services hero, CTA
  band), whose dark fill now shows until the photo arrives. Raster time went from
  6.5–59 s to 0.4 s. Small images keep their blur placeholder.
- **Rejected: pausing the hero entrance while the splash is pending.** That would also
  have held fast loads back until every image had loaded.

## 5. Not done (logged in tech debt)

- **Quote card auto-advance** (every 6 s, crossfade, pause on hover/focus) needs more than
  one quote, and there is only one. It stays a static card until the client provides
  more.
- **Card image zoom** belongs to `ArticleCard` (the blog). The Services cards have photos
  now, but hover keeps to the lift and icon tilt, the language the Home cards use.

## 6. Tests

- **`services.spec.ts`:**
  - the grid is 3 + 2 on desktop and one column on mobile
  - a click anywhere on a card (the summary text) opens its details
  - a card lifts 4 px on hover, and doesn't move with reduced motion
- **`motion.spec.ts`:**
  - the hero fills the first screen, and its content ends visible
  - below-the-fold content starts hidden and settles (opacity 1, identity transform),
    with and without reduced motion
  - client-side navigation adds the page fade, and the first load does not
  - the booking button's calendar appears on hover
  - the approach accent travels to the clicked point, and the panel content settles
  - a red underline follows the hovered nav link
- **Test-helper lesson:** `openDetails` blurs before focusing. Re-focusing an
  already-focused element fires no focus event, so a retry would do nothing.
- Every page stays static; the harness (axe, overflow, H1) runs unchanged.
