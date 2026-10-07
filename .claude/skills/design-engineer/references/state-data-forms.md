# State, Data Fetching & Forms

Covers Parts IX–XI. Read when deciding where state lives, fetching/mutating data, or building forms.

## Contents
- [State management](#state-management)
- [Data fetching](#data-fetching)
- [Forms](#forms)

---

## State management

**Libraries are decided per project, not by default.** The tools named below (TanStack Query, Zustand, nuqs) are *candidate options*, not fixed rules. Every project first analyzes its requirements in the briefing / Technical Architecture Brief, and only then decides which state and data libraries — if any — it uses. If the project's brief or CLAUDE.md has already decided, follow that decision. If it hasn't, propose an option with the reason and wait for approval before installing anything.

**Decision tree — pick the lowest-power option that works:**

1. **Can it be derived?** → Don't store it. Compute from existing state/props.
2. **Server data?** → Prefer Server Components + Server Actions (server-first). Consider a client cache such as **TanStack Query** only when the brief confirms heavy client-side fetching (polling, infinite feeds, complex client cache invalidation). Either way, server state is not client state; don't put fetched data in `useState`.
3. **Should it survive refresh / be shareable / bookmarkable?** → **URL state** (`searchParams`; a helper like `nuqs` only if the brief approves it). Filters, tabs, pagination, selected item — these belong in the URL.
4. **Needed across a few components in one subtree?** → lift to a common parent, or **Context** (only for low-frequency values).
5. **Global, client-only, fast-changing app state?** → First confirm in the brief that such state really exists (most marketing sites and many apps have none). If it does, a small store such as **Zustand** is one option; keep stores small and sliced.
6. **Needs to persist locally?** → **Cookies** (if server needs it) or **Local Storage** (client-only prefs). Never store sensitive data client-side.
7. **A mutation?** → **Server Action** + optimistic update, then revalidate the cache.

**Rules of thumb**
- Most "state" is either server state or URL state. Reach for a global store or Context far less than instinct suggests.
- Never mirror server data into a client store — it desyncs. Whatever owns the server cache (Server Components or a client query library) is the single source; components read from it.
- One store per domain concern, not one god-store.

---

## Data fetching

- **These practices apply whichever fetching approach the brief chose.** Library-specific advice applies only if that library was approved.
- **Query organization:** colocate query definitions with the feature. Centralize query keys in a typed factory to avoid key drift and enable targeted invalidation.
- **Optimistic updates** for mutations where the outcome is predictable (toggles, adds, edits). Update the cache immediately, roll back on error. Essential for anything trading/crypto where latency is visible.
- **Pagination & infinite queries:** prefer server-rendered pagination via URL params. For true infinite feeds, a client query library (e.g. TanStack Query's `useInfiniteQuery`) is an option if the brief approves it; keep cursor logic in the data layer, not the component.
- **Streaming:** stream server-rendered data with Suspense boundaries so the shell paints instantly.
- **Parallel fetching:** kick off independent requests together (`Promise.all` on the server, parallel Suspense on the client). Never waterfall requests that don't depend on each other.
- **Prefetching:** prefetch on intent (hover/focus of a link) and on the server for known-next data. Makes navigation feel instant.
- **Error recovery & retry:** sensible retry with backoff for transient failures; do NOT retry on 4xx. Surface a recoverable error state with a manual retry.
- **Caching:** define freshness intentionally per data source (revalidation tags/times on the server, or staleTime/gcTime if a client query library is used) based on how fresh the data must be. Real-time price data ≠ user profile data.

---

## Forms

- **React Hook Form + Zod** as the default stack. RHF for state/perf (uncontrolled inputs, minimal re-renders), Zod for the schema.
- **One schema, both sides.** The Zod schema validates on the client AND on the server (Server Action). Never trust client validation alone.
- **Async validation** (e.g. "is this handle taken") debounced, with clear pending/valid/invalid states on the field.
- **Server validation** is authoritative. Map server field errors back onto the form.
- **Optimistic submit** where safe: reflect success immediately, reconcile on server response, roll back + surface error on failure.
- **File uploads:** show progress, validate type/size client-side before upload, handle partial failure. Never block the whole form on one upload.
- **Multi-step forms:** keep step state in the URL or a dedicated store so refresh/back works; validate per step but submit the whole validated payload.
- **Autosave** for long forms — debounced, with a visible "saving/saved" indicator. Don't lose user work.
- **Error handling:** inline field errors next to the field, a summary for submit-level failures, and never a silent failure. Focus the first errored field on submit.
