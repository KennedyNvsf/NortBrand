# React, Next.js & TypeScript Standards

Covers Parts III–V. Read when writing components, wiring rendering/caching, or defining types.

## Contents
- [React standards](#react-standards)
- [Next.js standards](#nextjs-standards)
- [TypeScript standards](#typescript-standards)

---

## React standards

**Component design**
- One component, one responsibility. If you're describing it with "and," split it.
- Composition over configuration. Prefer `<Card><Card.Header/></Card>` (compound components) over a `Card` with 15 boolean props.
- **State colocation:** keep state as close to where it's used as possible. Lift only when two siblings genuinely need to share it. Global state is the last resort, not the default.
- **Render props / children-as-function:** use only when a consumer needs to control rendering of injected data. Otherwise prefer composition or a hook.
- **Context guidelines:** context is for low-frequency, wide-reach values (theme, auth, locale). Never put fast-changing state in context — it re-renders every consumer. Split contexts by update frequency.

**Modern patterns**
- **Suspense + streaming:** wrap async Server Components in `<Suspense>` with a meaningful fallback (skeleton, not spinner). Stream the shell immediately, let slow data fill in.
- **Server Actions** for mutations — colocate with the feature, validate input with Zod at the boundary, return typed results.
- **Error boundaries** at feature boundaries so one feature's failure doesn't blank the app. Pair with `error.tsx` in routes.

**Hooks philosophy**
- Custom hooks encapsulate stateful logic, not just to avoid repetition. Name them for what they do (`useSwapQuote`), not how (`useSwapState`).
- Keep hooks pure of side effects where possible; `useEffect` is a synchronization tool, not a lifecycle grab-bag. If an effect has no external system to sync with, it probably shouldn't exist.

**Memoization rules**
- Don't memoize preemptively. `useMemo`/`useCallback`/`memo` are for measured problems: expensive computation, or referential stability that a dependency array actually needs.
- With React Compiler in the pipeline, hand-memoization becomes largely unnecessary — write clean code and let the compiler handle it. Until then, memoize only where profiling shows a cost.

---

## Next.js standards

- **Server-first rendering.** Default to Server Components. Fetch data on the server, close to the source. Client fetching is for genuinely interactive/live data.
- **Caching strategy — be explicit.** In current Next.js, `fetch` is uncached by default; opt into caching deliberately (`cache: 'force-cache'`, `next: { revalidate: N }`, `unstable_cache`, or route segment config). Never rely on implicit behavior — state the caching intent for every data read.
- **Route handlers** (`route.ts`) for webhooks, third-party callbacks, and non-RSC API needs. Prefer Server Actions for your own mutations.
- **Metadata:** use the Metadata API (`generateMetadata`) for SEO/OG. Never hand-roll `<head>` tags.
- **Parallel routes** (`@slot`) for independent, simultaneously-rendered regions (dashboards, modals-as-routes). **Intercepting routes** (`(.)`) for modal-over-page patterns that stay deep-linkable.
- **Loading & error UI:** every async route gets `loading.tsx` (skeleton) and `error.tsx` (recoverable, with reset). No route should ever show a raw blank or a thrown error to a user.
- **Dynamic vs static:** default to static; opt into dynamic (`dynamic = 'force-dynamic'` or dynamic APIs) only when the data truly can't be cached. Know which one each route is.
- **Edge runtime** for latency-sensitive, lightweight handlers (geolocation, redirects, auth checks). Not for heavy Node dependencies.
- **Middleware** stays thin — auth gating, redirects, header rewrites. No business logic, no DB calls in the hot path.
- **Local dev & build:** never run `next build` while `next dev` is running — they share `.next` and the dev server corrupts (`Cannot find module './819.js'`, blank/unstyled pages). Verify through the running dev server, or stop dev then `rm -rf .next && next build`. If you see `MODULE_NOT_FOUND` for a `.next/server/*` chunk: stop dev, `rm -rf .next`, restart.

---

## TypeScript standards

- **Strict mode, always.** `strict: true` plus `noUncheckedIndexedAccess`. Non-negotiable.
- **Never use `any`.** Use `unknown` at boundaries and narrow. If you truly need an escape hatch, it's `unknown` + a type guard, never `any`. An `any` is a hole in the type system that spreads.
- **Discriminated unions** for state that can't be represented as independent fields. Model `{ status: 'loading' } | { status: 'success'; data: T } | { status: 'error'; error: E }` — make illegal states unrepresentable.
- **Prefer inference.** Don't annotate what TypeScript already knows. Annotate function boundaries (params, return types on exported functions) and let internals infer.
- **Utility types** (`Pick`, `Omit`, `Partial`, `ReturnType`) to derive types from a single source of truth rather than redeclaring.
- **Branded types** for values that share a primitive but aren't interchangeable: `type UserId = string & { readonly __brand: 'UserId' }`. Prevents passing a `TxHash` where a `UserId` is expected.
- **Zod at every external boundary** — API responses, form input, env vars, `searchParams`. Parse, don't assume. Derive the TS type with `z.infer`.
- **Generated API types:** generate types from your backend's schema (OpenAPI/GraphQL, or a DB type generator); never hand-maintain types that mirror a backend.
- **Type-safe routing:** use typed route helpers (typed `Link`/params) so refactors surface broken links at compile time.
- **Generics** to preserve type relationships, not to look sophisticated. If a generic has one call site, inline it.
