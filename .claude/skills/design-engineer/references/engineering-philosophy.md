# Engineering Philosophy & Architecture

Covers Parts I–II of the playbook. Read this before scoping a feature or setting up project structure.

## Contents
- [Principles](#principles)
- [Project architecture](#project-architecture)
- [App Router organization](#app-router-organization)
- [Domain boundaries & dependency rules](#domain-boundaries--dependency-rules)

---

## Principles

The bar: code should read as if a senior engineer at Vercel or Linear wrote it. Concretely, that means:

- **Simplicity over cleverness.** The clever solution is a liability the next reader has to decode. Prefer the boring, obvious implementation. If a junior can't follow it in one pass, rewrite it.
- **Readability first.** Code is read far more than written. Optimize for the reader: explicit names, early returns, shallow nesting, no surprises.
- **Architecture before implementation.** Decide where a thing lives and what it owns before writing it. A feature written in the wrong place is worse than one not written yet.
- **Deletion-first design.** Design so any feature can be deleted by removing one folder. If deleting a feature means hunting for tendrils across the codebase, the boundaries are wrong.
- **Progressive enhancement.** Server-render the baseline; layer interactivity on top. The page should work before JS hydrates.
- **Performance is a feature.** Bundle size, LCP, and INP are product requirements, not afterthoughts. A slow feature is a broken feature.
- **Product engineering mindset.** Every component ships with its loading, empty, error, and success states. "It works on the happy path" is not done.

---

## Project architecture

**Match the structure to the scale.** The organizing principle is colocation — code that changes together lives together. That principle produces different layouts at different sizes; picking the heavier one too early is as much a mistake as outgrowing the lighter one.

**Single-surface projects** (landing pages, marketing sites, MVPs, most Figma conversions — one real domain, roughly under 20 components): use a flat layout. A `features/` tree with one feature is pure ceremony — you pay path depth and public-API tax and get nothing back.

```
src/
├── app/
├── components/             # page sections and composites, flat or lightly grouped
│   └── ui/                 # shared primitives (ShadCN) — no feature logic
├── lib/
└── styles/
```

**Multi-domain apps** (dashboard + auth + billing…, multiple contributors): feature-first, not layer-first. Organize by domain feature, not by technical type — avoid top-level `components/`, `hooks/`, `utils/` dumping grounds that every feature reaches into.

```
src/
├── app/                    # routes only — thin, composes features
├── features/
│   ├── swap/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── types.ts
│   │   └── index.ts        # public API — the ONLY entry point
│   └── wallet/
│       └── ...
├── components/ui/          # shared primitives (ShadCN) — no feature logic
├── lib/                    # cross-cutting, truly shared utilities
└── styles/
```

**Graduation trigger:** the moment a second real domain appears (the landing page grows an authenticated app, the dashboard grows billing), extract `features/` then — not after the flat folder hits 40 files and the refactor costs a week. Migrating late is the expensive failure mode, not picking "wrong" initially.

**Enforce boundaries with tooling, not vibes.** Feature-first means nothing without a lint rule backing it — add ESLint `import/no-restricted-paths` (or `eslint-plugin-boundaries`) to block cross-feature deep imports the day `features/` is created. A convention that isn't enforced is just documentation.

**Monorepo vs polyrepo:** default to a single repo. Reach for a monorepo (Turborepo) only when you have genuinely separate deployables sharing packages (e.g. a marketing site + app + shared design-system package). Don't add the tooling tax before the shape demands it.

---

## App Router organization

- **Route groups** `(group)` to organize without affecting the URL: `(marketing)`, `(app)`, `(auth)`.
- **Server Components by default.** Only add `"use client"` at the leaf that actually needs interactivity, state, or browser APIs. Push the boundary as far down the tree as possible.
- **Client Components** are for interactivity, effects, and hooks — keep them small and leaf-level. A client boundary high in the tree drags everything below it into the bundle.
- Colocate route-specific UI (`loading.tsx`, `error.tsx`, `not-found.tsx`) with the route.
- `app/` files stay thin: they compose features and pass data. Business logic lives in `features/`.

---

## Domain boundaries & dependency rules

- **A feature owns its internals.** Other code imports only from the feature's `index.ts` public API — never deep-import `features/swap/components/InternalThing`.
- **No cross-feature deep imports.** If `wallet` needs something from `swap`, that thing is either shared (move to `lib/` or `components/ui/`) or the boundary is wrong.
- **Dependency direction:** `app/` → `features/` → `lib/`/`components/ui/`. Never the reverse. Shared layers never import from features.
- **Module ownership:** each feature has a clear owner. If two features both need to mutate the same state, that state is shared infrastructure, not feature-local.
- **The deletion test:** can you `rm -rf features/swap/` and have only import errors at the `app/` composition layer? If yes, boundaries are clean.
