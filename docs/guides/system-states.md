# System states: 404 and loading splash

**Covers:** #14. **Design source:** Figma 08 — System / States (`320:2`): 404 desktop
`320:3`, tablet `380:77`, mobile `380:129`; splash `320:73`, mobile `380:174`. Motion Spec
› System (`331:268`, `331:278`).

## 1. The 404

### What visitors see

"4 · squiggle · 4", the H1 "We couldn't find that page.", a lead and two actions (Back
to home, Contact us). It has the nav, but no footer and no sticky CTA. The squiggle
draws once (900 ms, emphasized), and stays static with reduced motion.

### Which URLs get it, and how

```
/en/blog, /pt/blog          [locale]/[...rest]/page.tsx → notFound()   (prerendered)
/en/anything/else           [locale]/[...rest]/page.tsx → notFound()   (first request)
/blog, /xyz (no locale)     [locale] = "blog" → (site)/layout.tsx → notFound()
                                                   ↓
                            [locale]/not-found.tsx   (one localized 404, status 404, noindex)
```

- **Why the catch-all exists.** Without it, a path like `/en/blog` matches no route,
  and Next.js would show its built-in, unstyled 404. `[...rest]` catches every
  unmatched path under a locale and calls `notFound()`, so our boundary renders.
- **Why `/blog` lands in the same place.** `[locale]` is a dynamic segment, so _any_ first
  segment reaches `[locale]/layout.tsx`, including "blog". The layout used to call
  `notFound()` for an unknown locale. A not-found boundary can't sit above the root
  layout, though, so that showed the framework default. Now the layout renders in the
  default locale (`pt`, ADR-006), and `(site)/layout.tsx` rejects the bad locale, inside
  the `[locale]/not-found.tsx` boundary.
- **`ensureStatic = "navigation"` + `generateStaticParams` on the catch-all.** Under
  Partial Prefetching, an unlisted path would get a generic fallback shell.
  `navigation` makes Next.js render the complete route on the server, and it requires the
  params to be listed. `/blog`, the one known unbuilt page (it stays in the nav), is
  prerendered for both locales. Any other path renders on its first request and is then
  cached.

- **`SystemState` (#41).** The 404's layout (visual, one H1, lead, actions) is now
  `src/components/site/system-state.tsx`. `NotFoundContent` passes the "4 · mark · 4"
  visual to it, and the newsletter link pages reuse it ([Newsletter](./newsletter.md)).
  An optional `titleRef` makes the H1 focusable for pages whose state changes.

### What I tried first, and why it changed

1. **A root `app/layout.tsx` + `app/not-found.tsx`** (next-intl's classic recipe).
   With a layout at `app/`, `[locale]` stops being a _root param_, and `next/root-params`
   no longer types `locale`. Lint failed in 16 places. Reverted.
2. **`app/global-not-found.tsx`** (experimental flag). It is server-rendered, but it
   only handles URLs that match _no_ route, and every first segment matches `[locale]`.
   It would also have been in one language only. Removed, with the flag.

### Known limitation: the 404 body renders in the browser

With Cache Components on Next.js 16.4, a `notFound()` boundary is not server-rendered.
The HTML is a minimal document, and React renders the 404 from the RSC payload once
JavaScript runs. This happens even for a bare `<h1>` (checked with and without Partial
Prefetching, and with the boundary moved one level down). What still holds:

- **Status 404** and `<meta name="robots" content="noindex">` are in the server response.
- The localized 404 renders with JavaScript, at the right `lang`.

Consequences: the tab title stays the site default, and without JavaScript the page is
blank. Both are logged in `docs/tech-debt.md`, with the follow-up to re-test on the
next Next.js release.

## 2. The loading splash

### Behaviour (Motion Spec)

"The squiggle draws itself in a loop while the progress bar fills. Skip if the load
takes under 400 ms." The splash appears only on the first load of the document, never on
client navigation.

### How it works: no React state, no client component

```
<head> inline script (runs before first paint)
   html[data-splash="pending"]    unless the document already finished loading
CSS
   .splash                        display: none
   [data-splash=pending] .splash  display: flex, pointer-events: none,
                                  fade in 150 ms after a 400 ms delay
window "load" (or a 6 s failsafe)
   html[data-splash="done"]       → display: none at once
```

- **Fast loads never see it.** `load` fires before the 400 ms delay ends, and the splash is
  hidden before its first visible frame.
- **No JavaScript, no splash.** The attribute is never set, so it can't cover the page
  forever.
- **`pointer-events: none`.** It is a transparent, full-screen layer during its delay. The
  first version swallowed clicks: the full e2e run caught a Services dialog test whose
  "More Details" click landed on the invisible splash.
- **`suppressHydrationWarning` on `<html>`.** The script adds an attribute React didn't
  render. This silences only that element; its children are still checked.
- **`aria-hidden`.** The content underneath is already in the document; the splash is a
  visual cover only.
- **Reduced motion.** Its animations are `motion-safe:` only, so the mark is simply drawn
  and the bar sits at Figma's partial fill.

### Shared pieces

- **`LogoMark draw="once" | "loop"`.** The path gets `pathLength={1}` with
  `stroke-dasharray: 1`, and the keyframes animate `stroke-dashoffset`. The loop runs
  1 → 0 → −1, so the line draws and then leaves from its start, with no jump at the
  restart.
- **Keyframes in the theme** (`--animate-mark-draw`, `--animate-mark-draw-loop`,
  `--animate-splash-progress`) and a new type role, **`text-numeral`** (120 / 200 / 280),
  for the 404 figures.
- **`src/app/fonts.ts`** keeps the font in its own module. It was split out for the
  global-not-found attempt and kept because it is tidier.

## 3. Tests

- **Page harness.** Routes can be marked `notFound`. The harness then expects status 404
  and `noindex` instead of canonical and hreflang. Every audit now waits for the H1, so
  axe never runs on a not-yet-rendered page. Status and `noindex` are also asserted for
  every real page (200, no robots tag).
- **`tests/e2e/system.spec.ts`:**
  - **404:** `/en/blog`, `/pt/blog`, `/en/no/such/page` and `/blog` each give status 404,
    the right `lang`, one header, no footer, no sticky CTA, and a home link to the right
    locale.
  - **Splash:**
    - it never appears on a fast load
    - with images held back, it is pending with the delayed fade and `pointer-events: none`
    - it is gone after `load`
    - it never shows without JavaScript
    - its animations are off with reduced motion
- **Testing lesson:** Playwright treats `opacity: 0` as visible, so
  `toBeVisible()` can't prove the splash showed. The test reads the attribute and the
  computed CSS in one synchronous browser call instead.
