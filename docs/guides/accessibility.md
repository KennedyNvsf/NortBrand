# Accessibility: touch targets

**Covers:** #95 (44 px touch targets and the harness check), found by the pre-launch
audit (#84). **Rules:** CLAUDE.md › Accessibility decisions ("44 pt minimum tap targets on
touch for buttons, nav items and form controls. Inline text links inside body copy are
exempt").

## 1. What we built

- A `touch-target` utility (`src/app/globals.css`) that grows an element's **hit area** to
  at least 44 × 44 px below desktop, without changing its size, position or look.
- It is applied to the elements the audit measured as too small at 390 px: the header,
  footer and mobile-menu logo links (104 × 21), the narrow footer links ("Blog", 33 px
  wide), the post breadcrumb links ("Blog", 29 px), the blog category chips ("All",
  33 px; "Marca", 41 px) and the post's tag chip.
- A check in the shared page harness that hit-tests every control on every route, in both
  languages, at 390 px. Blog posts run the same check in `blog-post.spec.ts`. A control
  that loses its 44 px area fails CI, so the problem can't come back unnoticed.

## 2. How it works at runtime

The browser decides what a tap hits by **hit-testing**: it finds the topmost box under the
finger. A pseudo-element belongs to its element, so a tap on a link's `::after` is a tap on
the link. The utility adds an invisible, absolutely positioned `::after`:

```
          ┌──────────────── 44 px ───────────────┐
          │              ::after                 │   ← hit area (invisible)
          │     ┌────────────────────────┐       │
          │     │  NortBrand  (104 × 21) │       │   ← the link as designed
          │     └────────────────────────┘       │
          └──────────────────────────────────────┘
```

- It's centred on the element (`top/left: 50%` plus `translate: -50% -50%`), and each side
  is `max(100%, 44px)`. A wide element only grows in height, a narrow one only in
  width, and one that is already big enough doesn't change at all.
- It's absolutely positioned, so it takes no space in the layout and nothing moves. The
  element gets `position: relative` to anchor it.
- It applies **below `lg` (1024 px)** only, like every other touch size in the project
  (`min-h-11 … lg:min-h-0`). On desktop the element is exactly as before.

**Proof that nothing visible changed:** the PR compared full-page screenshots of Home, the
blog listing and a post at 1440, 768 and 390, in EN and PT, before and after. All 18 were
byte-identical. An earlier version kept `position: relative` on desktop, and that alone
changed the text anti-aliasing in the post page's footer at 1440. That's why the whole
utility now sits inside the media query.

## 3. The files

| File                                                                     | What changed and why                                                                                                                                               |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/app/globals.css`                                                    | `@utility touch-target`. A utility, not a component, because the targets are links, chips and Radix slots that already have their own markup.                      |
| `src/components/site/site-nav.tsx`, `site-footer.tsx`, `mobile-menu.tsx` | Logo links get `touch-target`. In the footer, the shared `linkClassName` gets it too, so every footer link is covered, including short PT or EN words added later. |
| `blog/[slug]/_components/post-header.tsx`                                | Both breadcrumb links. The category name comes from the CMS and can be short ("UX").                                                                               |
| `blog/_components/category-chips.tsx`, `no-results.tsx`                  | Every chip. At tablet the chips are 36 px tall (`md:min-h-9`), and the utility brings them to 44 as well.                                                          |
| `blog/[slug]/_components/post-article.tsx`                               | The tag chip used an ad-hoc `after:-inset-2.5` for the same job. It now uses the utility, so there is one pattern.                                                 |
| `tests/e2e/touch-targets.ts`                                             | `findSmallTouchTargets(page)`, the shared check (§ 4).                                                                                                             |
| `tests/e2e/pages.spec.ts`, `blog-post.spec.ts`                           | Run the check at 390 px on every route and on a translated post, in both languages.                                                                                |

## 4. How the test protects it

`getBoundingClientRect()` can't see a pseudo-element, so measuring boxes would fail every
element we fixed (it is how the audit got 90 × 26 for a chip that already had a hit area).
The check asks the browser instead:

1. It collects the controls: links, buttons, form fields, `summary` and the ARIA widget
   roles. It skips hidden elements, anything inside `aria-hidden` or `inert`, inline links
   (`display: inline`, which means text links in prose), and sr-only elements (the skip
   link until it is focused).
2. It scrolls each one to the centre of the screen and calls `document.elementFromPoint`
   on a grid of points across a 44 px circle centred on it.
3. Every point must land on the element or inside it. A point that lands on a neighbour
   fails, so two hit areas can't overlap and steal each other's taps.
4. A point covered by a fixed or sticky layer that the element isn't part of (the header
   or the sticky CTA) is skipped. That's occlusion during scrolling, not target size.

Why a circle: Chrome hit-tests `border-radius`, so a round 44 px button misses at its
square corners even though it is a 44 × 44 target. Reduced motion is emulated so scroll
reveals don't slide elements around while they're being probed.

A failure tells you which element failed, its box, and where the first miss landed:

```
"target": "<a> \"Blog\"", "box": "33×44",
"missed": "2 points, first (-21, 0) from centre hits <div>"
```

## 5. Day-to-day rules

- **New small control?** Add `touch-target` to it. Use `min-h-11` or `size-11` instead when
  the design really is 44 px, as most buttons are.
- `touch-target` owns `::after` below desktop. Don't use `after:` utilities on the same
  element. Use `before:` instead, or wrap the element.
- If a parent clips its overflow (`overflow-hidden` or `overflow-x-auto`), the hit area is
  clipped too. The chip row works because the chips are already 44 px tall and only grow
  sideways into the 10 px gap.
- Leave at least 44 px between the centres of neighbouring small controls, or their hit
  areas overlap and the harness fails.
- Text links inside paragraphs are exempt. Keep them `display: inline` so the check
  recognises them.

The pre-launch audit report, with results for every page and check, is in
[`docs/accessibility-audit.md`](../accessibility-audit.md) (#84).
