---
name: "nb-brandguideline"
description: "Create, organize, and maintain professional NortBrand design systems and brand guidelines directly in Figma, including visual identity, design tokens, typography, color, spacing, components, variants, layouts, responsive behavior, accessibility, imagery, iconography, and usage documentation."
---


```yaml
# ═══════════════════════════════════════════════════════════════════════════════
# NORTBRAND FIGMA DESIGN SYSTEM & GUIDELINES
# ═══════════════════════════════════════════════════════════════════════════════

name: nortbrand-figma-design-system
description: "Create and maintain professional NortBrand design systems and visual guidelines directly in Figma using variables, styles, components, variants, layouts, typography, color systems, and documented usage rules."
version: "1.0"
author: NortBrand
license: MIT

category: design
tags:
  - figma
  - design-system
  - design-guidelines
  - ui
  - ux
  - visual-design
  - components
  - typography
  - color
  - responsive-design
  - accessibility
  - brand

mcp:
  server: figma
  integration:
    - Figma files
    - Figma pages
    - Figma frames
    - Figma components
    - Figma component sets
    - Figma variables
    - Figma styles
    - Figma libraries
    - Figma prototypes

capabilities:
  - design_system_creation
  - brand_guideline_creation
  - visual_identity_documentation
  - design_token_definition
  - component_library_creation
  - responsive_design_definition
  - accessibility_guidelines
  - figma_library_organization
  - design_consistency_management
```

# NortBrand Figma Design System & Guidelines

## 1. Purpose

This skill is exclusively responsible for creating and maintaining **NortBrand design systems and visual guidelines inside Figma**.

It does not generate code.

It does not define software architecture.

It does not define databases.

It does not define technical implementation.

Its purpose is to establish a single, organized, professional visual system that designers can use consistently across NortBrand products and client projects.

The Figma file should function as the visual source of truth.

---

# 2. NortBrand Design Philosophy

The fundamental NortBrand design principle is:

> **Minimalism, but functional products.**

NortBrand designs should feel:

* refined
* intentional
* modern
* clear
* restrained
* premium
* functional
* trustworthy
* approachable

Avoid visual complexity for its own sake.

Do not use visual effects merely because they are fashionable.

Premium quality should come primarily from:

* typography
* spacing
* proportion
* hierarchy
* alignment
* consistency
* restraint
* interaction clarity

---

# 3. Figma File Structure

Every NortBrand design system should be organized into clearly defined Figma pages.

Recommended structure:

```text
NortBrand Design System
│
├── 00 — Cover
│
├── 01 — Foundations
│   ├── Brand
│   ├── Colors
│   ├── Typography
│   ├── Spacing
│   ├── Grid
│   ├── Radius
│   ├── Shadows
│   └── Icons
│
├── 02 — Components
│   ├── Buttons
│   ├── Inputs
│   ├── Forms
│   ├── Navigation
│   ├── Cards
│   ├── Dialogs
│   ├── Feedback
│   └── Other Components
│
├── 03 — Patterns
│   ├── Navigation Patterns
│   ├── Forms
│   ├── Booking
│   ├── Search
│   ├── Filters
│   └── Content Patterns
│
├── 04 — Templates
│   ├── Landing Page
│   ├── Service Business
│   ├── Booking Business
│   └── Other Templates
│
├── 05 — Pages
│   └── Product / Client Pages
│
└── 06 — Documentation
    ├── Guidelines
    ├── Usage
    ├── Accessibility
    └── Changelog
```

The exact structure may evolve, but the organization must remain predictable.

---

# 4. Figma Naming Convention

Use clear, hierarchical naming.

Prefer:

```text
Button / Primary
Button / Secondary
Button / Destructive

Input / Default
Input / Error
Input / Disabled

Card / Service
Card / Testimonial
Card / Pricing
```

For component properties:

```text
Variant
Size
State
Icon
Width
```

Avoid meaningless names such as:

```text
Component 1
Frame 42
New Button
Final Button
Final Button 2
New New Button
```

Naming must communicate purpose.

---

# 5. Cover Page

Every major NortBrand Figma design system should have a professional cover page.

Include:

```text
NORTBRAND

Design System

Version
Last Updated
Maintained By
```

The cover should visually establish the identity of the system.

Keep it minimal.

Do not fill the cover with unnecessary information.

---

# 6. Brand Foundation

Document the fundamental visual identity.

Include:

### Brand name

NortBrand

### Design philosophy

Minimalism, but functional products.

### Brand personality

Define a small number of meaningful attributes.

Example:

```text
Precise
Modern
Confident
Functional
Refined
```

Avoid excessive adjectives.

Five strong attributes are better than twenty vague ones.

---

# 7. Logo System

Document the logo and all approved variations.

Include:

### Primary logo

The principal approved version.

### Secondary logo

Alternative configuration where necessary.

### Symbol / Mark

Standalone brand mark.

### Monochrome

Single-color version.

### Reversed

Light logo for dark backgrounds.

### Clear space

Define the minimum protected area around the logo.

### Minimum size

Define the smallest acceptable display size.

### Background usage

Show acceptable and unacceptable backgrounds.

---

# 8. Logo Do's and Don'ts

Create visual examples.

### Do

* maintain proportions
* maintain clear space
* use approved colors
* use approved variations
* maintain sufficient contrast

### Don't

* stretch
* compress
* rotate
* recolor arbitrarily
* add effects
* distort
* place on unsuitable backgrounds
* modify the logo structure

Whenever possible, demonstrate these visually in Figma.

---

# 9. Color System

Create a structured color system.

Separate:

### Primitive colors

The raw palette.

Example:

```text
Neutral
Brand
Accent
Success
Warning
Error
Information
```

### Semantic colors

Colors assigned to a specific purpose.

Example:

```text
Background
Surface
Surface Elevated
Foreground
Foreground Muted
Border
Primary
Secondary
Accent
Success
Warning
Error
```

Do not create colors without a purpose.

---

# 10. Figma Color Variables

Use Figma Variables for reusable color definitions.

Organize variables logically.

Example:

```text
Color
├── Brand
│   ├── 50
│   ├── 100
│   ├── 500
│   ├── 700
│   └── 900
│
├── Neutral
│   ├── 50
│   ├── 100
│   ├── 500
│   ├── 900
│   └── 950
│
└── Semantic
    ├── Background
    ├── Foreground
    ├── Primary
    ├── Border
    ├── Success
    ├── Warning
    └── Error
```

Use semantic variables whenever possible.

---

# 11. Color Modes

When required, support:

* Light
* Dark

Use Figma Variable Modes rather than duplicating entire color systems.

Example:

```text
Background / Primary

Light → #FFFFFF
Dark  → #0A0A0A
```

Components should automatically inherit the appropriate mode.

---

# 12. Color Accessibility

Document contrast requirements.

At minimum, verify:

* body text
* headings
* buttons
* links
* form labels
* placeholder text
* error messages
* disabled states
* icons where they convey information

Do not rely exclusively on color to communicate meaning.

For example:

```text
Error
```

should not be communicated solely through red.

Use:

* color
* iconography
* text
* state

where appropriate.

---

# 13. Typography System

Create a complete typography hierarchy.

Recommended structure:

```text
Display
Heading 1
Heading 2
Heading 3
Heading 4
Body Large
Body
Body Small
Label
Caption
Overline
```

Each style should define:

* font family
* weight
* size
* line height
* letter spacing

Typography should create a clear visual hierarchy.

---

# 14. Typography Scale

Use a coherent type scale.

Example:

```text
Display
64px

H1
48px

H2
40px

H3
32px

H4
24px

Body Large
18px

Body
16px

Body Small
14px

Caption
12px
```

These values are examples, not mandatory values.

The actual system should be determined by the NortBrand visual direction.

---

# 15. Responsive Typography

Where appropriate, define typography for:

```text
Desktop
Tablet
Mobile
```

Document meaningful changes rather than creating unnecessary variations.

For example:

```text
Desktop H1 → 64px
Tablet H1  → 52px
Mobile H1  → 40px
```

If the same size remains appropriate across devices, do not create unnecessary variants.

---

# 16. Spacing System

Create a consistent spacing scale.

Example:

```text
Spacing
01
02
03
04
06
08
10
12
16
20
24
32
40
48
64
80
96
```

Spacing should be systematic rather than arbitrary.

Use Figma Variables where appropriate.

---

# 17. Layout System

Define:

* page width
* content width
* gutters
* section spacing
* grid
* columns
* gaps
* alignment

Example:

```text
Desktop
12-column grid

Tablet
8-column grid

Mobile
4-column grid
```

These are starting points and should be adapted to the actual design system.

---

# 18. Containers

Define standard container widths.

Example:

```text
Container / Small
Container / Medium
Container / Large
Container / Full
```

Document:

* maximum width
* horizontal padding
* behavior at smaller widths

Avoid creating arbitrary container widths for individual pages.

---

# 19. Border Radius

Create a controlled radius system.

Example:

```text
Radius / None
Radius / Small
Radius / Medium
Radius / Large
Radius / XL
Radius / Full
```

Use radius consistently.

Do not mix unrelated corner radii throughout the system.

---

# 20. Elevation and Shadows

Define a restrained elevation system.

Example:

```text
Shadow / None
Shadow / Small
Shadow / Medium
Shadow / Large
```

Use shadows purposefully.

Avoid excessive elevation.

Not every card needs a shadow.

Flat surfaces should remain an intentional option.

---

# 21. Borders

Define:

* border colors
* border widths
* divider styles
* input borders
* focus borders
* selected borders

Keep border usage consistent.

---

# 22. Iconography

Define the NortBrand icon system.

Document:

* icon library
* icon size
* stroke weight
* corner treatment
* optical alignment
* spacing around icons

If using Lucide as the approved icon style, document:

```text
Style: Outline
Stroke: Consistent
Grid: 24 × 24
```

Icons must communicate meaning rather than decoration.

---

# 23. Component Library

Create reusable Figma components.

At minimum, evaluate the need for:

```text
Button
Icon Button
Link
Input
Textarea
Select
Checkbox
Radio
Switch
Tabs
Badge
Avatar
Card
Tooltip
Dialog
Dropdown
Navigation
Pagination
Toast
Alert
Skeleton
```

Only create components that are genuinely needed.

The component library should grow intentionally.

---

# 24. Component Variants

Use Figma Component Properties and Variants.

Example:

```text
Button

Variant
├── Primary
├── Secondary
├── Destructive
└── Ghost

Size
├── Small
├── Medium
└── Large

State
├── Default
├── Hover
├── Pressed
├── Focus
├── Disabled
└── Loading
```

Avoid creating completely separate components for each state.

---

# 25. Component States

Interactive components should define appropriate states.

Typical states:

```text
Default
Hover
Focus
Pressed
Selected
Disabled
Loading
Success
Error
```

Not every component requires every state.

States must reflect the actual purpose of the component.

---

# 26. Buttons

Define:

* hierarchy
* size
* shape
* icon behavior
* text behavior
* states
* disabled state
* loading state

Example:

```text
Primary
Secondary
Tertiary
Destructive
Ghost
Icon
```

Avoid creating button variants that differ only cosmetically without a functional purpose.

---

# 27. Form Components

Forms must have clearly defined states.

For inputs:

```text
Default
Hover
Focus
Filled
Error
Disabled
Read-only
```

Document:

* label
* helper text
* error message
* placeholder
* required indicator
* icon behavior

The visual relationship between these elements must remain consistent.

---

# 28. Navigation

Define navigation patterns for:

### Desktop

* primary navigation
* secondary navigation
* active state
* dropdowns
* account controls

### Mobile

* menu
* navigation drawer
* bottom navigation where appropriate
* active state

Navigation should remain predictable across products.

---

# 29. Cards

Cards should be treated as structured content components.

Define:

* image area
* content area
* metadata
* title
* description
* actions
* hover behavior
* selected state

Do not create dozens of card variations.

Prefer a small number of flexible patterns.

---

# 30. Feedback Components

Define visual patterns for:

* success
* error
* warning
* information
* loading
* empty states

These should use a consistent visual language.

---

# 31. Empty States

Document how empty states should communicate:

1. What is empty
2. Why it may be empty
3. What the user can do next

Use:

* concise illustration where appropriate
* title
* supporting text
* primary action

Do not over-design empty states.

---

# 32. Loading States

Define:

* skeletons
* spinners
* button loading
* page loading
* content loading

Prefer skeletons when the final layout is known and content is loading.

Loading states should preserve layout stability.

---

# 33. Error States

Define consistent error presentation.

Include:

* visual indication
* concise explanation
* corrective action where possible

Avoid technical error messages in user-facing designs.

---

# 34. Responsive Design

Every major component and template should be evaluated across:

```text
Desktop
Tablet
Mobile
```

Responsive behavior should specify:

* resizing
* stacking
* hiding
* reordering
* wrapping
* scrolling
* navigation changes

Do not simply scale everything proportionally.

---

# 35. Auto Layout

Use Auto Layout extensively.

Components should be resilient to:

* different text lengths
* different content
* localization
* different viewport widths

Avoid unnecessary fixed dimensions.

Prefer:

* Hug
* Fill
* Fixed

according to the intended behavior.

---

# 36. Figma Component Properties

Use component properties to make components understandable and reusable.

Useful property types include:

* Boolean
* Text
* Instance Swap
* Variant

Example:

```text
Button
├── Label
├── Show Icon
├── Icon
├── Variant
└── Size
```

The property interface should be clean and understandable.

---

# 37. Responsive Templates

Create reusable page templates.

Example:

```text
Landing Page
├── Header
├── Hero
├── Services
├── Social Proof
├── Content
├── CTA
└── Footer
```

Templates should demonstrate correct usage of the design system.

---

# 38. Page Composition

Pages should use a consistent visual rhythm.

Consider:

* section spacing
* content width
* heading hierarchy
* visual breaks
* CTA placement
* image balance
* whitespace

Do not fill every available space.

Whitespace is an intentional design element.

---

# 39. Imagery Guidelines

Define the visual characteristics of approved imagery.

Document:

### Photography

* lighting
* composition
* subject treatment
* background
* color treatment
* mood

### Illustration

* style
* line weight
* colors
* complexity

### Product imagery

* background
* framing
* aspect ratio
* positioning

The goal is visual consistency rather than simply specifying image dimensions.

---

# 40. Image Treatment

Document approved treatments such as:

* border radius
* cropping
* overlays
* gradients
* shadows
* aspect ratios

Do not apply effects by default.

Each treatment should serve a visual or functional purpose.

---

# 41. Accessibility Guidelines

Document accessibility directly within the Figma system.

Include:

* color contrast
* text readability
* focus states
* touch target considerations
* visual hierarchy
* error states
* non-color indicators
* reduced-motion considerations

Accessibility should be part of the design system itself.

---

# 42. Interaction Guidelines

Document interaction principles.

Examples:

### Hover

Should provide subtle feedback.

### Pressed

Should clearly communicate activation.

### Focus

Must remain visible.

### Loading

Should communicate that an action is processing.

### Success

Should confirm completion.

### Error

Should explain the problem and, where possible, provide a path forward.

Interactions should be restrained and purposeful.

---

# 43. Motion Guidelines

Define a NortBrand motion language.

Document:

* duration
* easing
* entrance
* exit
* transition
* layout movement
* hover movement
* modal movement

Prefer subtle motion.

Motion should communicate:

* cause and effect
* hierarchy
* continuity
* feedback

Avoid excessive animation.

---

# 44. Motion Principles

Use motion to answer:

> What changed?

> Why did it change?

> Where did it come from?

> Where did it go?

Avoid animation that exists only to attract attention.

---

# 45. Design Tokens

The design system should progressively consolidate reusable values into Figma Variables.

Recommended collections:

```text
Colors
Spacing
Typography
Radius
Sizing
Elevation
Motion
```

Token names should remain consistent and predictable.

---

# 46. Modes

Use Figma Variable Modes where meaningful.

Potential modes include:

```text
Light
Dark
Compact
Comfortable
Brand A
Brand B
```

Do not create modes simply because Figma supports them.

Every mode must represent a meaningful design context.

---

# 47. Documentation Inside Figma

Every important component should include documentation.

Documentation should answer:

* What is this?
* When should it be used?
* When should it not be used?
* What variants exist?
* What states exist?
* What are the accessibility considerations?

Keep documentation close to the component whenever possible.

---

# 48. Do's and Don'ts

For important components, provide visual examples.

Example:

```text
DO
✓ Use the primary button for the main action
✓ Maintain appropriate spacing
✓ Use approved variants

DON'T
✕ Use multiple primary CTAs competing for attention
✕ Change component dimensions arbitrarily
✕ Create unnecessary variants
```

Visual examples are preferred over text-only rules.

---

# 49. Design Consistency

When creating a new design, always check:

```text
Does this component already exist?

Does this token already exist?

Does this pattern already exist?

Does this interaction already exist?

Does this typography style already exist?

Does this spacing already exist?
```

Reuse before creating something new.

The design system should become more coherent over time.

---

# 50. Avoid Design-System Fragmentation

Do not create:

```text
Button
Button New
Button Final
Button Final 2
Button Premium
Button Modern
```

Instead, determine whether the existing Button component needs:

* a new variant
* a new size
* a new state
* a new property

Only create a new component when the underlying purpose is genuinely different.

---

# 51. Visual QA

Before considering a design complete, review it against the design system.

Check:

### Typography

* hierarchy
* consistency
* readability

### Color

* consistency
* contrast
* semantic meaning

### Spacing

* rhythm
* alignment
* section separation

### Components

* correct variants
* correct states
* correct sizing

### Layout

* alignment
* grid
* container width
* responsive behavior

### Accessibility

* contrast
* focus
* readable text
* non-color indicators

---

# 52. Figma Organization Quality

The Figma file itself must remain professional.

Avoid:

* abandoned frames
* duplicate components
* unnamed layers
* random colors
* inconsistent styles
* obsolete components mixed with active ones
* unexplained variants
* detached instances without purpose

Keep the design workspace clean enough that another designer can understand it without being personally trained on the file.

---

# 53. Versioning

Maintain clear design-system version information.

Example:

```text
NortBrand Design System
v1.0.0
```

Major changes should be identifiable.

Examples:

```text
v1.1.0
New component variants

v1.2.0
Updated typography scale

v2.0.0
Major visual identity change
```

---

# 54. Change Management

When modifying an established component, evaluate:

* existing usage
* existing variants
* existing patterns
* visual consistency
* accessibility
* impact on other pages

Do not casually change foundational tokens.

A change to:

* primary color
* typography
* spacing
* radius
* component dimensions

can affect the entire system.

---

# 55. Final Design-System Checklist

Before considering a NortBrand Figma design system complete:

```text
[ ] Figma file is logically organized
[ ] Cover page exists
[ ] Brand foundation documented
[ ] Logo system documented
[ ] Logo usage rules documented
[ ] Color system established
[ ] Color variables established
[ ] Light/dark modes defined where required
[ ] Typography system established
[ ] Typography styles created
[ ] Spacing system established
[ ] Grid established
[ ] Container rules established
[ ] Radius system established
[ ] Elevation system established
[ ] Iconography documented
[ ] Core components created
[ ] Component variants created
[ ] Component states created
[ ] Component properties organized
[ ] Forms documented
[ ] Navigation documented
[ ] Feedback states documented
[ ] Empty states documented
[ ] Loading states documented
[ ] Error states documented
[ ] Responsive behavior defined
[ ] Auto Layout used appropriately
[ ] Imagery guidelines established
[ ] Accessibility guidelines documented
[ ] Motion principles documented
[ ] Documentation included
[ ] Do's and Don'ts included where useful
[ ] Duplicate components removed
[ ] Naming conventions consistent
[ ] Visual QA completed
```

---

# 56. Core Principle

The NortBrand Figma system should always follow this hierarchy:

```text
BRAND
  ↓
FOUNDATIONS
  ↓
TOKENS
  ↓
COMPONENTS
  ↓
PATTERNS
  ↓
TEMPLATES
  ↓
PAGES
```

Each layer builds upon the previous one.

Do not design pages independently and then attempt to retrofit a design system afterward.

Build the system first.

Then use the system to create the product.

The final Figma workspace should be:

**consistent, reusable, scalable, documented, accessible, visually refined, and easy for another designer to understand.**

```
```
