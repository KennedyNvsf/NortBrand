# Performance: what loads before the first paint

How we read Lighthouse's numbers, what #105 changed, and the rules that keep pages
light.

## 1. What Lighthouse measured, and why it wasn't what visitors see

Lighthouse CI (#83, [CI](./ci.md) § 4) reported mobile LCP of 3.1–4.4 s on every page.
Its reports also record what the browser on the runner actually did:

| Page        | Observed FCP | Observed LCP | Simulated LCP (reported) |
| ----------- | ------------ | ------------ | ------------------------ |
| /en         | 281 ms       | 281 ms       | 3579 ms                  |
| /pt/blog    | 209 ms       | 209 ms       | 3420 ms                  |
| /en/contact | 188 ms       | 188 ms       | 3789 ms                  |

The hero text paints with the first frame, so the entrance animation isn't the
problem. The reported number is **simulated**: Lighthouse rebuilds the load from the
trace and replays it on a slow phone (4× CPU) over slow 4G (1.6 Mbps, 150 ms latency).
For LCP, that replay includes **every request that started before the observed LCP**.
Next.js requests all of a page's JavaScript from `<head>`, so all of it counted:
about 330 KiB gzipped, roughly 2 s of download on that network before any CPU cost.

So the lever is how much JavaScript (and HTML) starts loading before the first paint.

## 2. What #105 changed

| Change                                                             | Where                                         | Saved on Home (gzip) |
| ------------------------------------------------------------------ | --------------------------------------------- | -------------------- |
| GA takes its measurement ID as a prop instead of importing `@/env` | `google-analytics.tsx`, `[locale]/layout.tsx` | zod, 30 KiB          |
| The `<Toaster />` moved to blog posts, the only page with toasts   | `[locale]/layout.tsx`, `blog/[slug]/page.tsx` | Sonner, 9 KiB        |
| Cookie preferences load on demand                                  | `consent-manager.tsx`                         | Dialog + vaul        |
| Only client namespaces go to `NextIntlClientProvider`              | `src/i18n/client-messages.ts`                 | HTML, 9 KiB          |
| The reveal engine (`animate()`) loads after hydration              | `reveal-dom.ts`, `load-reveal-engine.ts`      | Motion engine        |
| The mobile menu sheet loads on demand                              | `mobile-menu.tsx`, `mobile-menu-panel.tsx`    | Radix Dialog         |
| Lighthouse runs each URL three times and asserts on the median     | `lighthouserc.json`                           | (stability)          |

Bytes requested before the first paint (gzipped HTML + JS + CSS, local production
build):

| Page      | Before  | After   | Change |
| --------- | ------- | ------- | ------ |
| Home      | 409 KiB | 319 KiB | −22 %  |
| Services  | 420 KiB | 367 KiB | −13 %  |
| About     | 394 KiB | 304 KiB | −23 %  |
| Blog      | 468 KiB | 411 KiB | −12 %  |
| Blog post | 419 KiB | 370 KiB | −12 %  |
| Contact   | 432 KiB | 385 KiB | −11 %  |

Lighthouse on CI (median of three runs after; a single run before):

| Page         | LCP before | LCP after | Performance before → after |
| ------------ | ---------- | --------- | -------------------------- |
| /en          | 3.58 s     | 2.57 s    | 78 → 88                    |
| /pt          | 3.75 s     | 2.56 s    | 83 → 89                    |
| /en/services | 3.52 s     | 3.01 s    | 83 → 84                    |
| /pt/services | 3.87 s     | 3.53 s    | 81 → 81                    |
| /en/blog     | 4.36 s     | 3.56 s    | 80 → 78                    |
| /pt/blog     | 3.42 s     | 3.49 s    | 84 → 79                    |
| EN post      | 3.11 s     | 3.00 s    | 93 → 89                    |
| PT post      | 3.66 s     | 2.99 s    | 88 → 88                    |
| /en/contact  | 3.79 s     | 3.19 s    | 86 → 84                    |
| /pt/contact  | 3.26 s     | 3.04 s    | 87 → 84                    |

Read the second table with care. The "after" runner was much slower (benchmark index
2177 against 3916 before), and Lighthouse adds its 4× CPU slowdown on top of whatever
machine it gets. That is why TBT rose (about 260 → 390 ms on average) although every
script got cheaper: the main chunk on Home went from 1046 to 655 ms of CPU. Accessibility,
best practices and SEO stayed at 100 and CLS at 0 everywhere.

**Why the budgets stay warnings (decided at #105, 2026-11-06).** The remaining gap is
mostly the framework (React and Next.js are about 145 KiB of the ~270 KiB on Home) and
the forms on Blog and Contact, which render on the server and must hydrate. A local
`next start` also serves gzip over HTTP/1.1 with no CDN, where Vercel serves brotli
over HTTP/2. The budgets become errors when Lighthouse points at Vercel previews (#45).

## 3. How each change works

**Lazy client pieces.** The pattern used by the cookie preferences and the mobile menu:

```tsx
const loadPanel = () => import("./panel").then((m) => m.Panel);
const Panel = dynamic(loadPanel); // next/dynamic: its own chunk

// in the component
const [mounted, setMounted] = useState(false);
useEffect(() => {
  const id = requestIdleCallback(() => void loadPanel()); // prefetch after load
  return () => cancelIdleCallback(id);
}, []);
// on open: setMounted(true); then keep it mounted so it can animate closed
```

A dynamic chunk is never listed in the page's `<head>`, so it isn't part of the first
load. Prefetching when idle (and on hover or focus, for the menu) means the first click
doesn't wait.

**The reveal engine.** `reveal-dom.ts` holds everything that only touches the DOM:
`hide()` runs straight after mount, so items never flash. `loadRevealEngine()` fetches
`play()` and `animate()` once, from an effect. Items play once it resolves; if it
fails, `unhide()` shows them. Details in [Motion](./motion.md) § 3.

**Messages.** `pickMessages()` gives the provider only the namespaces in
`CLIENT_MESSAGE_PATHS`; a unit test fails when a client component uses another one
([Localization](./localization.md)).

## 4. Rules for new code

- **Never import `@/env` (or anything that imports zod) from a client component.** Read
  the value in a server component and pass it as a prop.
- **Mount providers and global widgets only where they're used.** A component in the
  root layout loads on every page.
- **Anything that opens on a click** (dialogs, drawers, menus, panels) loads with
  `next/dynamic` and is prefetched when idle.
- **Imperative Motion** (`animate()`) goes through `loadRevealEngine()`, unless it must
  run inside a layout effect.
- **New client namespace?** Add it to `CLIENT_MESSAGE_PATHS`.
- **Check the bytes** before and after a change that adds client code: the Lighthouse
  report's network requests, or the script list in the page's HTML.

## 5. Measuring

- **CI:** each PR's Lighthouse job, three runs per URL; the table is in the run
  summary and the reports are in the `lighthouse-reports` artifact. Compare the
  _benchmark index_ between runs before comparing timings.
- **Observed vs simulated:** in a report's JSON, `audits.metrics.details.items[0]` has
  both `observedLargestContentfulPaint` and `largestContentfulPaint`.
- **Locally,** timings depend on the machine, but byte counts don't: build with
  `E2E_FAKE_BACKEND=1`, start the server and add up the gzipped size of the scripts
  each page's HTML references.
