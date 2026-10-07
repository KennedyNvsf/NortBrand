# Code Quality, Testing, PR Standards & Checklists

Covers Parts XVIII–XXI. Read before finishing a component/feature and before considering work shippable. The checklists at the end are the final gate.

## Contents
- [Code quality](#code-quality)
- [Testing](#testing)
- [PR standards](#pr-standards)
- [Engineering checklists](#engineering-checklists)

---

## Code quality

- **Tooling:** ESLint (or Biome) + Prettier, enforced in CI. Formatting is never a discussion — the formatter decides. Biome is fine as a faster all-in-one; pick one and enforce it.
- **Naming:** descriptive and honest. `isLoading` not `flag`; `formatAddress` not `fmt`. Booleans read as predicates (`hasError`, `canSubmit`). No abbreviations that aren't universal.
- **Imports:** ordered (external → internal → relative), no unused, no deep cross-feature imports. Use path aliases (`@/features/...`) over `../../../`.
- **File length:** if a file is getting long (~200+ lines), it's probably doing too much — split by responsibility. Not a hard cap, a smell.
- **Function length:** a function should fit on a screen and do one thing. Extract when you're tempted to write a comment explaining the next block.
- **Complexity limits:** shallow nesting; early returns over nested `if`. High cyclomatic complexity is a refactor signal.
- **Comments:** explain *why*, never *what*. The code says what. If a comment restates the code, delete it; if the code needs a "what" comment, rewrite the code.
- **Documentation:** public APIs (exported components/hooks/utils) get a short doc comment. Features get a brief README when non-obvious.

---

## Testing

- **Vitest** for unit/component logic. Test behavior and public API, not implementation details. A test that breaks on refactor-without-behavior-change is a bad test.
- **Playwright** for E2E and critical user flows (connect wallet → swap → confirm; sign in → create → save).
- **Component testing:** render, interact, assert on what the user sees/does. Query by role/label (Testing Library), not by test id where a real semantic query works.
- **Accessibility testing:** automated axe checks in component tests + manual keyboard/SR passes for key flows.
- **Visual regression** for design-system primitives and critical screens (Playwright snapshots or Chromatic).
- **Mocking & fixtures:** mock at the network boundary (MSW), not internals. Shared fixtures for domain objects (tokens, orders, txs). Keep fixtures realistic.
- **CI:** every PR runs types + lint + unit + E2E-smoke. Red CI blocks merge.

---

## PR standards

Before a PR is ready, Claude verifies all of:

- [ ] **Build passes**
- [ ] **Types pass** (`tsc --noEmit`, strict)
- [ ] **Lint passes** (ESLint/Biome, zero errors)
- [ ] **Tests pass** (unit + relevant E2E)
- [ ] **Accessibility checked** (keyboard + axe)
- [ ] **Responsive verified** (mobile → desktop)
- [ ] **Performance acceptable** (no obvious bundle/render regressions)
- [ ] **Design tokens used** (no hardcoded hex/spacing — see SKILL.md tokens)
- [ ] **No dead code** (no commented-out blocks, unused exports)
- [ ] **No duplicated logic** (extracted/shared appropriately)

PRs are small and focused. One concern per PR. A PR that touches five features is five PRs.

---

## Engineering checklists

The final gate for every feature. Run through all four blocks before calling it done.

### Architecture
- [ ] Is it in the correct feature folder?
- [ ] Can it be deleted independently (deletion test)?
- [ ] Does it respect module ownership / dependency direction?

### UI states
- [ ] Loading state (skeleton)
- [ ] Empty state (with next-action guidance)
- [ ] Error state (recoverable, with retry)
- [ ] Success state

### Accessibility
- [ ] Keyboard operable end to end
- [ ] Screen-reader labels + live regions where needed
- [ ] Focus managed (trap on modal, restore on close)

### Performance
- [ ] Lazy loaded where appropriate?
- [ ] Server rendered where possible?
- [ ] Bundle impact considered?
- [ ] Heavy assets ship as renditions? (images: LQIP blur + optimized WebP via `next/image`; video: poster → SD → HD, bandwidth-gated, readiness via `readyState`)

### DX
- [ ] Readable?
- [ ] Fully typed (no `any`)?
- [ ] Documented where non-obvious?
- [ ] Tested?

If any box is unchecked, the feature isn't done — finish it or flag the gap explicitly.
