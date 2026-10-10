# Motion

**Covers:** #27. **Source:** Figma 10 — Motion Spec (`331:2`): tokens, inventory, reduced
motion, implementation.

## 1. The rules

The spec's principles are **purposeful, quiet, respectful**. In code that means:

| Use                                              | For                                    | Examples here                                                       |
| ------------------------------------------------ | -------------------------------------- | ------------------------------------------------------------------- |
| **CSS** (`--duration-*`, `--ease-*`, tw-animate) | hover, focus, press, simple enter/exit | buttons, links, dialogs, the Services stage swap, menu link stagger |
| **Motion** (`motion/react`)                      | scroll-linked, springs, orchestration  | journey line, mobile connector, scroll reveals, dot navigation      |

Every value comes from the spec. `src/lib/motion.ts` holds the spec's own "Start from these
tokens" block (durations, easings, springs) for Motion, and `globals.css` holds the same
values as CSS variables.

## 2. Setup

- **`motion` 13.4.4, pinned exactly.** 14.x was days old when this ticket started (14.0.0
  a new major, 14.1.0 one day old), so I took the newest release with more than two weeks
  in the wild.
- **`MotionProvider`** (root of `[locale]/layout.tsx`):
  - `LazyMotion` loads the `domAnimation` features on demand, so the engine stays out of
    the first bundle. `strict` means a stray `motion.div` import throws; always use `m.*`.
  - `MotionConfig reducedMotion="user"`: Motion drops transforms when the OS asks for
    reduced motion.

## 3. What moves

### Scroll reveal: `<Reveal>` (Global)

Fade up on first view: opacity 0→1, y 24→0, 700 ms emphasized, siblings 60 ms apart
(`index`), once, at 25% visible. Used on `FeatureSplit`, the Home service and process
cards, About story and principle, Services "Our approach", Contact steps and FAQ intro, and
the CTA band card.

**The important design choice: it never hides content the reader can already see.** The
server renders everything visible. After mount, only elements still _below the fold_ are
"armed" (set to opacity 0 / y 24), and they reveal as they scroll in. So content is never
invisible before hydration on a slow phone, never invisible without JavaScript, and never
pops in above the fold. Reduced motion: opacity only, 150 ms. It is always a `<div>`; in a
list, put it inside the `<li>`.

### Home: journey line and connector (`process-track.tsx`)

Scroll-linked and linear. `useScroll` on the steps container gives a 0→1 progress:

- **Desktop:** the red path's `pathLength`. It still works with
  `vector-effect: non-scaling-stroke`, which keeps the stroke at 2.5 px when the SVG
  stretches (checked visually mid-scroll and at the end).
- **Mobile:** the connector's `scaleY`, from the top.

With reduced motion both are simply drawn. The step cards settle in with the reveal.

### Services: the scroll-through stage (`service-stage.tsx`)

Desktop only, and only when motion is allowed (`lg:motion-safe:` classes and the matching
media query in JS):

```
section  height = 5 × stage height          (scroll track)
  sticky stage  top 96 px, height 100dvh − 96 px
    article 1..5  stacked (absolute); data-active swaps them:
                  fade + y 24, 500 ms emphasized   (CSS transition)
    dot nav       active 7 → 12 px, red, spring "snappy"   (Motion)
```

- **Active step = scroll position.** Progress through the track is split into five
  equal steps. Wheel, touch and arrow keys all work because it is ordinary page scroll,
  and the stage unpins after block 5.
- **Nothing becomes unreachable:**
  - All five articles stay in the DOM in reading order (screen readers read them all).
  - Focusing anything in a hidden block (Tab to its "More Details") scrolls to its step.
  - `/services#content-writing` (footer, Home cards) lands on that step.
  - Dots are real buttons named after the service, with `aria-current="step"`, 24 px
    targets (WCAG 2.2 target size).
- **Below desktop, or with reduced motion,** the same markup is the plain stack from #10,
  and below desktop each block reveals on scroll (`<Reveal below="lg">`).
- **Bug found while building:** `not-first:border-t` has higher specificity than
  `lg:motion-safe:border-t-0`, so pinned blocks drew a stray hairline under the header.
  The override must use the same variant (`lg:motion-safe:not-first:border-t-0`).

### Mobile menu: link stagger (Mobile & tablet › Menu overlay)

Links rise 12 px in sequence, 40 ms apart, 250 ms standard, as a tw-animate CSS animation
with a per-link `animationDelay`. It is `motion-safe` only, so with reduced motion the
links simply appear with the sheet.

## 4. Not done in this ticket (logged in tech debt)

- **Quote card auto-advance** (every 6 s, crossfade, pause on hover/focus) needs more than
  one quote, and there is only one. It stays a static card until the client provides
  more.
- Other spec items outside this ticket's scope (`CLAUDE.md` listed five): keyword
  underline draw, Home hero entrance, logomark panel parallax, card hover lift and image
  zoom, route-change transitions. They are candidates for a follow-up ticket.
- With reduced motion the spec turns the dot navigation into an anchor list. Here it is
  simply hidden (the stack is short, and the footer and Home already link to each block).

## 5. Tests

- **`services.spec.ts`** (desktop):
  - scrolling swaps blocks and the dots follow
  - a dot jumps to its block
  - an anchor lands on its step
  - keyboard focus brings a hidden block into view
- **Reduced motion:** no dots and no scroll track, all blocks visible.
- **Mobile:** stack without dots.
- **Test helper lesson:** `openDetails` blurs before focusing. Re-focusing an
  already-focused element fires no focus event, so a retry would never move the stage.
- Every page stays static; the harness (axe, overflow, H1) runs unchanged.
