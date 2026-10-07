# Figma MCP → Production Workflow

Read this whenever a Figma source exists (Mode A). It covers inspection, extraction, assets, the completeness gate, and validation. Engineering standards (components, styling, a11y, state) live in the other reference files — this file is only about getting the truth out of Figma and verifying the result against it.

## Contents
- [Inspection workflow](#inspection-workflow)
- [Working rules](#working-rules)
- [Asset rules](#asset-rules)
- [Auto Layout translation](#auto-layout-translation)
- [Completeness gate](#completeness-gate-before-any-code)
- [Implementation analysis template](#implementation-analysis-template)
- [Validation pass](#validation-pass)

---

## Inspection workflow

Always use the connected Figma MCP. Never infer implementation details from screenshots alone.

### Step 1 — Inspect design context

Retrieve design context, variables, styles, metadata, assets, and screenshots. Understand structure, hierarchy, constraints, and intent.

**Run `get_metadata` on the page node (e.g. `0:1`) early.** It surfaces component *sets and variants* — hover/active/disabled states, and the canonical icon/illustration definitions — that per-node `get_design_context` hides and that an empty `get_variable_defs` won't reveal. Pull the variant you need from the set, not just the one instance placed on the canvas.

### Step 2 — Extract the design system

Analyze tokens (colors, typography, spacing, radius, shadows, borders, opacity, elevation, motion), variables (color/typography/layout/component/boolean, variant properties), and the component hierarchy (primitives → reusable → composite → page-level). Map Figma variables into design tokens / Tailwind tokens / CSS variables — never hardcode values that already exist as variables.

### Step 3 — Check for existing components

Follow the reuse priority order in SKILL.md (Code Connect → project → design system → new reusable → one-off), and actually grep the repo before building — the priority list is worthless if you don't look.

When Code Connect mappings exist, use them and do not rebuild the mapped component. Record: Figma component, mapped component, source path, variants, props, dependencies.

### Step 4 — Build the implementation plan

Use the [implementation analysis template](#implementation-analysis-template) below, scaled to the task (see SKILL.md workflow). No code until the plan — and the [completeness gate](#completeness-gate-before-any-code) — are done.

---

## Working rules

**Use small selections.** Never implement from giant frames. Break large designs into navigation / hero / card / modal / footer and analyze each separately.

**Respect semantic names.** `PrimaryButton`, `NetworkSelector`, `TransactionCard` — never `Frame12`, `Rectangle42`, `BlueCard`.

**Review annotations.** Dev notes, annotations, comments, and labels carry states, motion, interactions, responsive behavior, and edge cases. If annotations conflict with visuals, call out the discrepancy before implementation.

**Analyze responsive behavior before implementing.** Desktop (layout structure, max width, density), tablet (wrapping, layout shifts), mobile (stacking, touch targets, hierarchy). Document breakpoint/container/grid/media strategy in the plan.

**Extract motion specs.** For every animation in prototypes/annotations, capture: trigger, initial state, animate state, exit state, duration, easing, delay, reduced-motion behavior. These override the SKILL.md motion defaults.

---

## Asset rules

Use assets provided by Figma MCP. The asset server (`http://localhost:3845/assets/...`) is the source of truth for icons, illustrations, and images.

**Never recreate an asset you can download.** Do not substitute icons (including nav/utility icons — do NOT reach for `lucide`/heroicons if Figma exposes the real glyph), illustrations, or images with hand-drawn SVGs, icon-library equivalents, or placeholders. Prefer SVG for icons, optimized images for raster assets.

### "Fragmented" does NOT mean "not portable"

`get_design_context` often returns an icon or illustration **exploded into many individually-exported vector fragments**, each an `<img>` referencing the local asset server, positioned with percentage `inset` values, sometimes inside a mask group:

```tsx
const imgVector = "http://localhost:3845/assets/<hash>.svg";
<div className="absolute inset-[15.27%_0_39.49%_26.12%]">
  <div className="absolute inset-[-0.95%_-0.53%]"><img src={imgVector} /></div>
</div>
```

This looks fragile but is **faithful and self-contained**: the percentage insets are relative to each parent box, so the artwork scales to any size. Transcribing this markup verbatim *is* the design. Do not "simplify" it by redrawing.

### Required asset workflow

1. **Download every referenced hash** into a local folder (e.g. `public/figma/`) so there is no runtime dependency on Figma Desktop. The `localhost:3845` URLs are only live while the Figma app is running.
   - Run downloads in the **foreground with the sandbox disabled** — backgrounded or sandboxed shells cannot reach `localhost:3845` and will silently fetch 0 files.
   - Verify the file count and that **no file is 0 bytes** before continuing.
2. **Transcribe the generated JSX**, swapping `http://localhost:3845/assets/<hash>.svg` → the local path. Keep the absolute-positioned fragment structure, the `inset` percentages, and any mask group (`mask-image` / `mask-position` / `mask-size`).
3. **Collapse repetition into data**, not copy-paste — drive fragments from a tuple array through a small helper to avoid hand-error across dozens of pieces:
   ```tsx
   type Frag = [inset: string, innerInset: string, hash: string];
   const FRAGS: Frag[] = [["15.27% 0 39.49% 26.12%", "-0.95% -0.53%", "<hash>"], /* … */];
   ```
4. **Icon states/variants** are usually one exported SVG per state — map each state to its hash. Some are themselves multi-fragment composites; transcribe those the same way rather than falling back to another state. Double-check you're reading the hash from the *icon* node, not a same-shaped fragment that appears in another component — they are not interchangeable.
5. SVGs may carry their own colors (`fill="var(--fill-0, #F96161)"`). Use as-is; recolor only when the design clearly calls for `currentColor` tinting.
6. **Single icons are not always full-bleed.** Figma exports SVGs with `preserveAspectRatio="none"`, so a glyph is meant to fill a box at the **inset** given on its `Vector` node — NOT the full frame. Stretching a non-square icon (e.g. a wide "people" glyph) to a 24×24 square distorts it. Transcribe each icon's own inset (and any inner stroke-overflow wrapper, e.g. `inset-[-2.49%_-2.78%]`), exactly as you would an illustration fragment:
   ```tsx
   type Glyph = { hash: string; inset: string; inner?: string };
   // <span class="relative size-6 overflow-clip"><span style={{inset}}><img inset-0 size-full/></span></span>
   ```

### Local asset server — operational notes

The Figma asset server (`http://localhost:3845`) is finicky:
- **Foreground + sandbox disabled only.** Backgrounded or sandboxed shells cannot reach localhost and will silently download 0 files. Always fetch in the foreground with the sandbox off, then verify the file count and that no file is 0 bytes.
- **Retry on transient 500s.** Individual assets occasionally 500; retry 2–3 times before giving up (it usually succeeds on the next try).
- **Hashes are session-bound.** Asset URLs are only valid while this Figma session is open, and re-opening can change them. Download every hash in the same pass you inspect it — don't rely on a hash captured earlier in the conversation.

---

## Auto Layout translation

| Figma | Frontend |
|---|---|
| Auto Layout Row | Flex Row |
| Auto Layout Column | Flex Column |
| Gap | Gap token |
| Padding | Padding token |
| Fill | `flex-1` / full width |
| Hug | `fit-content` |
| Fixed | Explicit size |
| Wrap | `flex-wrap` / grid |

Avoid absolute positioning unless the design requires it (asset fragments are the exception — see above).

---

## Completeness gate (before any code)

Do not start coding until you have, in writing:

- **Every variant/state of every component** — pulled from the component SET, not just the instance placed on the canvas (hover, active, selected, disabled, empty, error, …). Missing the set is how hover fills and active icons get invented.
- **Exact values** — heights, gaps, padding, radii, colors, line-heights — as literals or bound-variable names. If you're about to hardcode a hex, confirm it's the real value.
- **Every asset hash**, mapped to the node it belongs to (verify the hash comes from the icon node, not a same-shaped fragment in another component).

If any of these is unknown, inspect again — don't approximate and let the user QA it.

---

## Implementation analysis template

For full screens or multi-component conversions, output this before code (scale down for smaller tasks per SKILL.md):

```md
# Figma Implementation Analysis
## 1. Design Summary
## 2. Component Tree
## 3. Component Inventory (reuse vs. new, Code Connect mappings)
## 4. Design Tokens & Variables Mapping
## 5. State Model (per interactive component: visual/interaction/motion/a11y impact per state)
## 6. Responsive Strategy
## 7. Motion Strategy
## 8. Accessibility Notes
## 9. Implementation Plan (tokens → primitives → components → sections → screens)
## 10. Risks & Assumptions
```

---

## Validation pass

After implementation, validate against Figma: spacing, typography, colors, radius, shadows, layout, responsiveness, states, motion, assets, accessibility. Document any intentional deviations.

**Assets are not a valid deviation.** Never justify substituting an icon, illustration, or image as an "intentional deviation" because the MCP output looked fragmented or non-portable. If the MCP exposes the asset, download and use it. Deviations are for layout/behavior trade-offs, not for skipping source-of-truth assets.

### How to verify (not just what)

- Assert **exact values with computed styles** (e.g. `preview_eval` → `getComputedStyle(el)`), not screenshots — that's how you confirm `162px`, `4px`, `#AC530B` rather than eyeballing.
- When selecting an element by text, target the **leaf text node**, not its wrapper — a `.find(textContent === 'X')` will match an outer container first and report its (unstyled) box, producing false "it's broken" readings.
- Re-check after a route change/reload: dev-mode CSS can lag one frame on first compile.
