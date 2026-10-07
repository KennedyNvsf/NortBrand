# Accessibility, Motion & Performance

Covers Parts XII–XIV. Read when finalizing a component's a11y, adding motion, or hitting performance targets.

> **Motion tokens & Framer Motion patterns live in SKILL.md** (Animation Guidelines). This file covers motion *principles and accessibility*, not token values or spring configs — use those from SKILL.md.

## Contents
- [Accessibility](#accessibility)
- [Motion](#motion)
- [Performance](#performance)

---

## Accessibility

**Checklist for every component:**

- **Semantic HTML first.** A `<button>` is a button. Don't rebuild native elements with `<div onClick>` — you lose focus, keyboard, and AT support for free.
- **WCAG 2.2 AA** as the baseline target.
- **Keyboard navigation:** every interactive element reachable via Tab in logical order and operable via Enter/Space/arrows as appropriate. No keyboard traps.
- **Focus management:** visible focus rings (never `outline: none` without a replacement). On modal open, move focus in and trap it; on close, restore focus to the trigger.
- **Screen readers:** meaningful accessible names for all controls; live regions (`aria-live`) for async updates (toasts, validation, streaming responses).
- **ARIA only when semantics fall short.** First rule of ARIA: don't use ARIA if native HTML works. When you do, follow the authoring patterns exactly (roles + states + keyboard).
- **Reduced motion:** honor `prefers-reduced-motion` — swap transforms for fades or disable non-essential motion. See SKILL.md motion section.
- **Color contrast:** text meets 4.5:1 (3:1 for large text). Never encode meaning in color alone — pair with icon/text (critical for risk indicators, error states).

---

## Motion

Principles here; **token values, durations, easings, and Framer Motion snippets are in SKILL.md.**

- **Motion must communicate.** Never animate for decoration alone — every animation clarifies a relationship, state change, or spatial transition.
- **Timing & easing:** follow SKILL.md tokens (tight durations for feedback, longer for transitions; spring for interactive, tween for reveals).
- **Layout animations & shared layout** (`layout`, `layoutId`) for elements that move or morph between states/routes — makes transitions feel physical instead of jumpy.
- **Exit animations** via `AnimatePresence` so unmounts aren't abrupt. Always pair enter with exit.
- **Stagger** for lists/grids entering — small delays (per SKILL.md) so content cascades rather than popping.
- **Gesture & scroll animations:** drag/hover/press feedback and scroll-linked reveals; keep them subtle and interruptible.
- **Performance:** animate only `transform` and `opacity` (compositor-friendly). Never animate `width`/`height`/`top`/`left` — they trigger layout. Respect reduced-motion for all of the above.

---

## Performance

Performance is a product requirement, not cleanup. **Order matters: fix high-impact problems first.** A perfectly memoized component behind a 600ms request waterfall is still slow, and shaving microseconds off a loop won't offset 300KB of extra JS. Work top-down through this list — the first two categories move real-world metrics far more than the rest.

**1. Eliminate async waterfalls (highest impact).** Requests that don't depend on each other must run in parallel, not sequentially.
- Kick off independent work together (`Promise.all` on the server, parallel Suspense on the client). Never `await` A then `await` B when B doesn't need A.
- Don't block on data a branch may not use. Check early-exit conditions *before* awaiting:
  ```ts
  // Bad — awaits userData even when we skip
  const userData = await fetchUserData(id)
  if (skip) return { skipped: true }
  // Good — only awaits when the branch needs it
  if (skip) return { skipped: true }
  const userData = await fetchUserData(id)
  ```

**2. Reduce bundle size (highest impact).** Bundle bloat is a tax on every session and compounds over time.
- Budget it and analyze before shipping. Watch what crosses the client boundary — a `"use client"` high in the tree drags its whole subtree into the bundle. Push the boundary to the leaves.
- **Code splitting & dynamic imports:** lazy-load heavy, below-the-fold, or conditionally-rendered components (`next/dynamic`, `React.lazy`). Charts, editors, and modals are prime candidates.
- **Tree shaking:** import named exports, not whole libraries. `import { debounce } from 'lodash-es'`, never `import _ from 'lodash'`.

**3. Server-side performance.** Do less work per request.
- Combine repeated passes over the same data into one (don't scan a list eight times when one pass does it).
- Cache intentionally (see Next.js caching in the react-nextjs reference) so repeat requests don't redo work.

**4. Client-side data fetching.** Prefetch on intent, dedupe requests, set sane stale times (see state-data-forms reference).

**5. Re-render & rendering optimization (lower impact — do after the above).**
- **Lazy state initialization:** pass a callback to `useState` for expensive init so it runs once, not every render: `useState(() => JSON.parse(raw))`.
- **Virtualization** for long lists/tables, when the brief confirms that volume (order books, large watchlists, transaction histories). Choose the library per project (e.g. `@tanstack/react-virtual`); don't add it for lists that pagination already keeps short.
- **Memoization:** only where measured (see React reference). Don't scatter `useMemo` prophylactically.
- **React Compiler readiness:** write clean, rule-following components so the compiler can memoize automatically. Avoid patterns that defeat it (mutation, conditional hooks).
- Animate only `transform`/`opacity` (see motion section); never properties that trigger layout.

**Assets & measurement (always).**
- **Image optimization:** `next/image` always — sizing, lazy loading, modern formats, no CLS.
- **Font loading:** `next/font` for self-hosting + `font-display: swap`; preload critical fonts; avoid layout-shift from late swaps.
- **Web Vitals:** measure LCP, INP, CLS and treat regressions as bugs. Targets: LCP < 2.5s, INP < 200ms, CLS < 0.1.

### Heavy assets ship as multiple renditions

A single full-resolution image or video is the easy path and the wrong one — it blocks LCP on slow connections and burns bandwidth on fast ones. Every heavy asset ships as a *set* of renditions so the browser can paint something immediately and upgrade to full quality as conditions allow. The two goals: never a blank box waiting on bytes, and never more bytes than the connection warrants.

**Images — placeholder + full, always through `next/image`.**
- Ship a tiny **LQIP** (low-quality image placeholder): a ~16px-wide WebP inlined as a base64 data URL. It's a fraction of a KB, rides along in the initial HTML, and paints instantly — so the frame is filled from the first render instead of showing an empty rectangle.
- Ship an **optimized full WebP** as the real source and let `next/image` handle responsive `sizes` and lazy loading. The LQIP fills the frame (blurred) until the full image decodes, then cross-fades in.
- Wire the two together with `placeholder="blur"` + `blurDataURL` (the inlined ~16px WebP). That pairing is what removes both the layout shift and the flash of empty space in one move — the blur reserves the exact box the full image will occupy.

**Video — poster → SD → HD, gated on bandwidth and *real* readiness.**
- Start with a **poster** (an optimized WebP, LQIP-style) so the player is never a black box before the first frame is decodable.
- Provide at least two encodes: a **compressed SD** rendition for constrained connections and a **full HD** rendition for capable ones. Pick which to fetch from available bandwidth — the Network Information API (`navigator.connection?.effectiveType` / `downlink`) or your own probe — rather than always reaching for HD. Treat these signals as hints and degrade gracefully when they're absent (Safari/Firefox don't expose `connection`).
- Detect readiness via **`readyState`, not just the `canplay`/`onCanPlay` event.** Events are edge-triggered and easy to miss — `canplay` can fire during a remount, a fast reconnect, or before your listener attaches, and it never fires again. `readyState` is level-triggered: it reflects the *current* truth and is safe to read at any time. Gate "ready to play" and "safe to swap in HD" on `video.readyState >= 3` (`HAVE_FUTURE_DATA`), and treat `canplay`/`canplaythrough` as supplementary hints, not the sole signal.
- Upgrade progressively: play the poster/SD path immediately, then swap to HD once it has buffered enough (again judged by `readyState`) so the jump to full quality is seamless instead of a stall.
