# Styling, Components & Design System

Covers Parts VI–VIII. Read when styling UI, authoring a component, or extending the design system.

> **Defer, don't duplicate.** Color tokens and motion tokens are defined in the main **SKILL.md** (Design Systems + Animation Guidelines sections). This file references those rather than restating hex values or spring configs. If a project defines its own tokens, those win. Always default to the mode the SKILL.md specifies.

## Contents
- [Styling standards](#styling-standards)
- [Component standards](#component-standards)
- [Design system](#design-system)

---

## Styling standards

- **Tailwind conventions.** Utility-first. Map design tokens to Tailwind theme tokens; never hardcode hex inline (see SKILL.md token tables). Use semantic Tailwind tokens (`bg-surface`, `text-secondary`) over raw palette values.
- **CSS variables** are the source of truth for tokens; Tailwind consumes them. This lets mode-switching and theming happen at the CSS layer without recompiling class names.
- **Design tokens** flow one direction: primitive (`--blue-500`) → semantic (`--accent-1`) → component (`--button-bg`). Components reference semantic/component tokens, never primitives directly.
- **Dark mode / mode handling:** follow the mode rule in SKILL.md (default light unless the project or user specifies otherwise). Drive it with CSS variables so no component needs conditional color logic.
- **Responsive design:** mobile-first. Use the `responsive-web-app` skill for data-heavy/dashboard layouts. Compose breakpoints; don't scatter one-off media queries.
- **Container queries** for components that must adapt to their container, not the viewport (cards in variable-width grids, sidebars). Prefer these over viewport breakpoints for reusable components.
- **Scales, not magic numbers:** typography and spacing come from defined scales (e.g. 4px spacing base). No arbitrary `mt-[13px]`.
- **Layering (z-index):** use a named scale (`--z-dropdown`, `--z-modal`, `--z-toast`), never raw `z-[9999]`. Document the stacking order in one place.
- **Motion tokens:** defined in SKILL.md Animation Guidelines. Reference those durations/easings; don't invent new ones per component.

---

## Component standards

**Every non-trivial component ships with all of the following.** Treat this as the definition of "done":

| Aspect | Requirement |
|---|---|
| **Responsibility** | One clear job, stated in a one-line comment or doc |
| **Public API** | Minimal, typed props; sensible defaults; no leaking internals |
| **Props** | Discriminated unions over boolean soup; `children` for composition |
| **Accessibility** | Semantic HTML, ARIA where needed (see a11y reference) |
| **Keyboard support** | All interactions reachable and operable by keyboard |
| **Motion** | Uses SKILL.md motion tokens; respects reduced-motion |
| **Loading state** | Skeleton, not spinner, for content-shaped loads |
| **Empty state** | Designed, with guidance toward the next action |
| **Error state** | Recoverable, human-readable, with retry where possible |
| **Skeleton** | Matches the final layout to avoid layout shift |
| **Tests** | Behavior tests (see testing reference) |
| **Storybook story** | Covers default + each meaningful state/variant |

A component that only handles the happy path is not finished.

---

## Design system

- **Token hierarchy:** primitive → semantic → component (as above). Single source of truth; changing a brand color touches one primitive.
- **Semantic colors:** name by role (`--accent-1`, `--text-secondary`, `--stroke`) not by hue. See SKILL.md token tables for values.
- **Primitive components:** unstyled/low-level building blocks (ShadCN primitives) — Button, Input, Dialog. No feature logic.
- **Composite components:** assembled from primitives for a domain use (e.g. `TokenSelector` from `Dialog` + `Input` + `List`).
- **Variant strategy:** use `cva` (class-variance-authority) or ShadCN's variant pattern for typed, enumerated variants. No boolean-prop explosions.
- **Iconography:** follow the precedence in SKILL.md — when a Figma source exists, its exported assets are the icon set (see `figma-mcp.md`; never substitute a library glyph for a real one). Otherwise one icon set (e.g. Lucide), consistent sizing via a size token. Icons are decorative unless labeled — give interactive icons an accessible name.
- **Motion language / elevation / shadows / radius / spacing:** all token-driven and consistent. Elevation and shadow come from a defined scale; radius from a small set (`--radius-sm/md/lg`). Motion language defers to SKILL.md.
