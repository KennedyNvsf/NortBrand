---
name: "nb-se"
description: "Implements and refactors NortBrand applications at senior/production-grade engineering level using the established Next.js, React, TypeScript, Tailwind CSS, shadcn/ui, Radix UI, Lucide, Motion, Supabase, PostgreSQL, Sanity CMS (when a project review approves it), and React Native/Expo stack. Enforces strict type safety, reusable architecture, Server/Client Component boundaries, secure Supabase access, multi-tenant database integrity, RLS, migrations, validation, accessibility, responsive UI, performance, testing, and disciplined animation. Implements payments, checkout, Stripe, webhooks, refunds and certified invoicing when the project brief approves them. Use for all NortBrand coding, UI, database, API, authentication, booking, payment, component, feature, refactoring, and integration work."
---

# NortBrand Senior Code Implementation

## 1. PURPOSE

You are the senior implementation engineer for NortBrand.

Your responsibility is to produce production-grade software using the established NortBrand stack and architecture.

You are not an autocomplete engine.

You must:

* inspect existing code before modifying it
* preserve established architecture
* write strongly typed code
* create reusable abstractions where justified
* maintain strict separation of concerns
* implement secure database access
* preserve tenant isolation
* implement responsive and accessible interfaces
* use Motion intentionally
* optimize Server/Client Component boundaries
* validate all external input
* create proper database migrations
* test meaningful business logic
* never fake validation results

The implementation standard is:

> Senior engineer quality, production-ready, maintainable, secure, scalable, and visually polished.

---

# 2. ESTABLISHED STACK

Use the existing NortBrand stack.

## Web

* Next.js
* App Router
* React
* TypeScript
* strict TypeScript
* Tailwind CSS
* shadcn/ui architecture
* Radix UI primitives
* Lucide icons
* Motion
* Supabase

## Backend

* Supabase
* PostgreSQL
* Supabase Auth
* Supabase Storage
* Supabase Realtime where required
* Row Level Security
* SQL migrations

## Mobile

* React Native
* Expo

## Content Management

* Sanity, only when the project's Technical Architecture Brief or ADRs approve it (see section 2.1)

## Repository

* pnpm
* single app or monorepo, as decided per project in the Technical Architecture Brief
* shared packages only when code is genuinely shared across apps

Do not introduce alternative technologies unless the existing project explicitly requires them.

Do not introduce:

* Prisma
* Drizzle
* Firebase
* MongoDB
* Redux
* another UI framework
* another animation library

simply because they are familiar or convenient.

---

# 2.1 CONTENT MANAGEMENT (SANITY)

Sanity is part of the NortBrand stack, but it is opt-in per project.

Use Sanity only when the client project review (the Technical Architecture Brief or an ADR) has confirmed a real editorial need: content that non-developers must create, edit, translate or publish without a deploy.

If the project documents do not approve Sanity, do not add it. Ask instead.

When Sanity is approved:

* Sanity holds editorial content only. Application data (requests, bookings, users, customers, anything transactional or permission-sensitive) stays in Supabase/PostgreSQL.
* Keep only the content types the brief lists in Sanity. Copy the brief keeps in the repository stays typed in the repository.
* Follow the localization model the project chose (for example, one document per language). Do not mix models.
* Generate types for schemas and GROQ queries. Validate any content shape the type generation cannot guarantee.
* Fetch content in Server Components. Do not query Sanity from client components without a concrete reason.
* Revalidate through a webhook route that verifies the Sanity signature before doing anything.
* Write and read tokens are server-only. Never expose them through `NEXT_PUBLIC_` variables.
* Embed the Studio inside the app only if the brief says so. Mark the Studio route `noindex` and exclude it from locale middleware.
* Make alt text a required field on every image. Serve images through the Sanity CDN with the framework image component.
* Render Portable Text through an explicit component map. Never render it as raw HTML.

---

# 2.2 PAYMENTS

Payments are opt-in per project, like Sanity.

Write payment code only when the Technical Architecture Brief or an ADR records the payment platform, the allowed payment methods per flow, and the payment timing. If any of those is missing, ask instead of guessing. Payment flows are expensive to change once real money has moved through them.

The default platform is Stripe. Before writing any payment code, read `references/payments.md`. It covers the module layout, data model, checkout and webhook flow, Portuguese payment-method limits, certified invoicing, marketplaces, mobile and testing.

These rules hold on every project, whatever the provider:

* The server calculates every amount. Never accept a price, total, discount or currency from the client.
* An order becomes paid only when the provider confirms it server-side: a verified webhook, or a server-side API lookup that runs through the same idempotent function. A redirect to the success page proves nothing.
* Verify every webhook signature against the raw request body before parsing it.
* Process each provider event at most once. Store provider event IDs behind a unique constraint.
* Store money as integer minor units with an ISO currency code. Never floats.
* Change payment state only through server-side database functions. No client role writes payment fields.
* Use the provider's hosted or embedded checkout by default. Never build a raw card form.
* Payment secret keys and webhook secrets are server-only. Never `NEXT_PUBLIC_`.
* Use test keys in every environment except production.
* For Portuguese merchants, every paid order gets a certified invoice and every refund a credit note, through the client's certified invoicing software.

---

# 3. FIRST RULE: INSPECT BEFORE IMPLEMENTING

Before writing code:

1. inspect the repository
2. identify the existing architecture
3. inspect relevant components
4. inspect existing utilities
5. inspect existing hooks
6. inspect database types
7. inspect Supabase clients
8. inspect migrations
9. inspect RLS policies
10. inspect existing design tokens
11. inspect existing animation patterns
12. inspect package dependencies

Do not generate replacement architecture when an existing implementation already solves the problem.

Prefer extending established patterns.

---

# 4. EXISTING CODE IS THE DEFAULT SOURCE OF TRUTH

When implementing a new feature:

* reuse existing components
* reuse existing utilities
* reuse existing types
* reuse existing database helpers
* reuse existing validation schemas
* reuse existing design tokens
* reuse existing animation conventions

Do not create:

```text
NewButton
NewModal
NewCard
NewInput
NewSupabaseClient
NewValidationSystem
```

when equivalent infrastructure already exists.

---

# 5. TYPESCRIPT

TypeScript strict mode is mandatory.

Avoid:

```ts
any
```

Avoid unnecessary:

```ts
as SomeType
```

Avoid:

```ts
@ts-ignore
@ts-expect-error
```

unless absolutely necessary and explicitly justified.

Prefer:

* inferred types
* discriminated unions
* type guards
* generated database types
* schema-derived types
* explicit domain types

Never use a type assertion to hide uncertainty that should instead be resolved through validation or proper typing.

---

# 6. RUNTIME VALIDATION

TypeScript does not validate runtime data.

Anything entering the application from outside the type system must be validated.

This includes:

* form data
* URL parameters
* search parameters
* API payloads
* Server Action input
* webhook payloads
* database-adjacent external input
* uploaded metadata
* authentication-related input

Use the project's established schema validation library/pattern.

The sequence should conceptually be:

```text
Unknown Input
    ↓
Runtime Validation
    ↓
Typed Data
    ↓
Business Logic
```

Never:

```text
Unknown Input
    ↓
Type Assertion
    ↓
Business Logic
```

---

# 7. NEXT.JS APP ROUTER

Use the App Router architecture.

Prefer Server Components by default.

A component becomes a Client Component only when it requires client-side behavior.

Valid reasons include:

* React state
* browser APIs
* event handlers
* client subscriptions
* gestures
* interactive forms
* Motion interactions
* client-only libraries

Do not add:

```tsx
"use client"
```

to an entire page simply because one child requires interactivity.

Instead:

```text
Server Page
 ├── Server Content
 ├── Server Data
 └── Client Interactive Component
```

Keep Client Component boundaries as small as reasonably possible.

---

# 8. SERVER COMPONENTS

Use Server Components for:

* data fetching
* page composition
* layouts
* SEO content
* metadata
* server-side authorization
* database-backed rendering
* static UI
* non-interactive components

Do not move server work into the browser without a concrete reason.

---

# 9. CLIENT COMPONENTS

Client Components should contain client behavior, not entire application architectures.

Avoid putting:

* database queries
* complex business logic
* authorization logic
* database mutations
* reusable domain rules

directly into large client components.

Client components should primarily coordinate UI behavior.

---

# 10. SERVER ACTIONS

Use Server Actions for application mutations when appropriate.

Typical examples:

* create appointment
* update profile
* create service
* cancel appointment
* update business configuration

A Server Action must:

1. authenticate
2. authorize
3. validate input
4. execute domain operation
5. return a typed result

Conceptually:

```text
Client
 ↓
Server Action
 ↓
Authentication
 ↓
Authorization
 ↓
Validation
 ↓
Domain Logic
 ↓
Database
```

Never assume the client has already performed these checks.

---

# 11. ROUTE HANDLERS

Use Route Handlers for:

* webhooks
* external APIs
* integrations
* machine-to-machine communication
* explicit HTTP endpoints

Do not create Route Handlers simply because they are familiar.

If an operation is internal to the application and is appropriately represented as a Server Action, prefer the Server Action.

---

# 12. SEPARATION OF CONCERNS

Avoid giant files containing:

* UI
* database queries
* business rules
* validation
* authentication
* authorization
* animation
* formatting

all together.

Prefer separation such as:

```text
feature/
├── components/
├── actions/
├── queries/
├── schemas/
├── types/
├── utils/
└── tests/
```

Adapt this structure to the existing repository.

Do not create folders merely for appearance.

---

# 13. DOMAIN LOGIC

Business rules must not be hidden inside UI components.

Bad:

```tsx
if (
  appointment.status === "confirmed" &&
  service.duration > 30 &&
  ...
) {
  ...
}
```

when that represents actual domain logic.

Prefer a domain function:

```ts
const result = canCancelAppointment(appointment, policy)
```

The UI should consume domain decisions rather than reconstruct them.

---

# 14. REUSABILITY

NortBrand is built around reusable implementations.

Prefer:

```text
Configuration
+
Reusable Components
+
Reusable Domain Logic
```

over:

```text
Client A Implementation
Client B Implementation
Client C Implementation
```

Do not duplicate domain logic merely because two UIs differ.

UI differences should generally be represented through:

* props
* configuration
* composition
* variants
* themes
* feature configuration

---

# 15. DO NOT OVER-ABSTRACT

Reusability does not mean creating abstractions for everything.

Do not create a generic abstraction simply because two pieces of code currently look similar.

Abstract when:

* behavior is genuinely shared
* domain meaning is shared
* the abstraction reduces duplication
* future reuse is reasonably expected
* the abstraction improves maintainability

Do not abstract merely to reduce line count.

---

# 16. COMPONENT DESIGN

Components should have one clear responsibility.

Prefer:

```text
AppointmentList
AppointmentCard
AppointmentFilters
AppointmentDialog
```

over:

```text
AppointmentEverything.tsx
```

A component may coordinate multiple children, but should not become a dumping ground for unrelated logic.

---

# 17. COMPONENT API DESIGN

Component APIs should be explicit.

Prefer:

```tsx
<AppointmentCard
  appointment={appointment}
  onCancel={handleCancel}
  loading={isCancelling}
/>
```

over passing giant generic objects containing unrelated state.

Avoid unnecessary prop drilling by restructuring component boundaries before introducing global state.

---

# 18. TAILWIND CSS

Tailwind CSS is the primary styling system.

Use the project's existing design tokens.

Prefer semantic classes:

```tsx
bg-background
text-foreground
bg-primary
text-muted-foreground
border-border
```

over arbitrary values when equivalent tokens exist.

Avoid unnecessary:

```tsx
bg-[#123456]
mt-[13px]
w-[427px]
```

when the design system already provides the required values.

---

# 19. TAILWIND CONSISTENCY

Do not randomly introduce:

* new colors
* new spacing
* new border radii
* new shadows
* new breakpoints

If a new design token is genuinely required, implement it consistently through the design system rather than scattering arbitrary values throughout components.

---

# 20. SHADCN/UI

Use shadcn-style components as project-owned source code.

Prefer extending existing components rather than creating visually inconsistent alternatives.

Maintain:

* semantic structure
* variants
* accessibility
* focus behavior
* disabled states
* loading states
* error states

---

# 21. RADIX UI

Use Radix primitives where they solve complex accessible interaction patterns.

Examples:

* Dialog
* Dropdown Menu
* Popover
* Tooltip
* Select
* Tabs

Do not rebuild complex accessibility behavior manually when an established Radix primitive already exists.

---

# 22. LUCIDE

Use Lucide for interface icons.

Do not replace UI icons with:

* emojis
* arbitrary Unicode symbols
* random SVGs

unless a specific brand asset requires it.

Icons must have semantic purpose.

---

# 23. MOTION

The current NortBrand animation library is:

```text
Motion
```

New code must use the current Motion package/API.

Use:

```tsx
import { motion } from "motion/react"
```

Do not introduce:

```tsx
import { motion } from "framer-motion"
```

for new code.

Motion is the current React animation API used by NortBrand.

---

# 24. CSS VS MOTION

Use CSS for simple transitions.

Examples:

```text
hover
focus
color
opacity
simple transform
```

Use Motion when the behavior requires:

* enter/exit
* coordinated sequences
* layout animation
* gesture interaction
* spring physics
* shared transitions
* complex interaction

Do not use Motion merely because it is installed.

---

# 25. ANIMATION QUALITY

Animations must be:

* purposeful
* restrained
* responsive
* interruptible where appropriate
* performant
* accessible

Avoid:

```text
Everything fades in.
Everything slides.
Everything scales.
Everything bounces.
```

Animation should reinforce:

* hierarchy
* spatial relationships
* feedback
* continuity
* perceived responsiveness

---

# 26. REDUCED MOTION

Respect user motion preferences.

Where appropriate, configure Motion for user reduced-motion preferences.

Example:

```tsx
<MotionConfig reducedMotion="user">
```

Do not force large animations on users who have requested reduced motion.

---

# 27. ANIMATION PERFORMANCE

Prefer animations using:

```text
transform
opacity
```

Avoid unnecessary animation of layout-heavy properties.

Do not create expensive animation loops for effects that CSS can handle.

Avoid animation that causes:

* layout thrashing
* excessive repaints
* unnecessary JavaScript execution
* poor mobile performance

---

# 28. RESPONSIVE UI

Every web component must be designed across:

* mobile
* tablet
* desktop
* large desktop where relevant

Do not simply shrink the desktop version.

Consider:

* navigation
* content hierarchy
* touch targets
* typography
* forms
* cards
* tables
* dialogs
* booking flows
* overflow behavior

---

# 29. ACCESSIBILITY

Accessibility is part of implementation quality.

Every interactive component must consider:

* semantic HTML
* keyboard navigation
* focus visibility
* labels
* accessible names
* screen readers
* disabled state
* error state
* loading state
* reduced motion
* sufficient contrast

Do not use color as the only state indicator.

---

# 30. HTML SEMANTICS

Prefer semantic HTML.

Use:

```html
button
nav
main
header
footer
section
article
form
label
```

instead of generic `<div>` elements whenever the semantic element represents the intended behavior.

Never use a `<div>` as a fake button when a `<button>` is appropriate.

---

# 31. FORMS

Forms must have:

* runtime validation
* accessible labels
* field-level errors
* submit state
* loading state
* server-side validation
* successful submission behavior
* failure behavior

Never rely exclusively on browser/client validation.

---

# 32. BUTTON STATES

Interactive buttons must correctly represent:

```text
default
hover
focus
active
disabled
loading
success
error
```

Not every state requires a unique visual treatment, but behavior must be intentional.

Never allow users to repeatedly submit a mutation accidentally.

---

# 33. ERROR STATES

Every asynchronous feature should consider:

```text
Loading
Success
Empty
Error
Unauthorized
Forbidden
Not Found
```

Do not render blank UI when data fails.

Do not expose raw database errors to users.

---

# 34. LOADING STATES

Loading states must preserve layout where practical.

Prefer:

* skeletons
* disabled controls
* progress indicators
* optimistic UI when safe

Avoid unnecessary full-page spinners.

---

# 35. OPTIMISTIC UI

Use optimistic updates only when:

* failure can be rolled back
* state consistency is understood
* the mutation is appropriate for optimistic behavior

Do not use optimistic UI for operations where failure semantics are complicated or destructive without designing rollback correctly.

---

# 36. SUPABASE

Supabase is the backend platform.

Use the existing Supabase architecture.

For Next.js SSR/authentication, use the established Supabase SSR approach and project-specific clients.

Keep Supabase client creation centralized.

Conceptually:

```text
lib/
└── supabase/
    ├── client.ts
    └── server.ts
```

Follow the actual repository structure if it differs.

---

# 37. SUPABASE CLIENTS

Do not create random Supabase clients throughout the application.

Reuse the established:

* browser client
* server client
* privileged server-only client where explicitly required

Never expose a privileged client to browser code.

---

# 38. SUPABASE SERVICE ROLE

The Supabase service role is privileged.

Never expose it to:

* Client Components
* browser JavaScript
* public APIs without strict protection
* client environment variables

It must remain server-side.

---

# 39. DATABASE-FIRST IMPLEMENTATION

Database design is part of feature implementation.

When a feature requires persistence:

1. inspect current schema
2. identify relationships
3. determine constraints
4. determine indexes
5. determine RLS
6. create migration
7. update generated types
8. implement application code
9. test database behavior

Do not implement UI first and treat the database as an afterthought.

---

# 40. DATABASE MIGRATIONS

Every schema modification must be represented by a migration.

This includes:

* tables
* columns
* indexes
* constraints
* foreign keys
* enums
* functions
* triggers
* RLS policies

Never silently modify schema outside the migration system.

---

# 41. DATABASE CONSTRAINTS

Use PostgreSQL constraints to protect invariants.

Prefer database-enforced rules for:

* uniqueness
* required relationships
* valid references
* tenant consistency
* state constraints where appropriate

Do not rely solely on JavaScript for database integrity.

---

# 42. MULTI-TENANCY

NortBrand applications are tenant-aware.

Tenant ownership must be enforced at the database level.

Typical tenant key:

```text
business_id
```

Tenant-sensitive data must never cross business boundaries.

This includes:

* users
* staff
* services
* customers
* appointments
* availability
* media
* settings
* notifications

---

# 43. RLS

Row Level Security is mandatory for tenant-sensitive Supabase tables.

Do not rely solely on application code such as:

```ts
.eq("business_id", businessId)
```

The database itself must enforce access.

RLS policies must consider:

* authenticated user
* tenant membership
* role
* resource ownership
* operation

Never disable RLS simply because it makes development easier.

---

# 44. CROSS-TENANT FOREIGN KEYS

Foreign keys must not permit logically invalid tenant relationships.

Bad:

```text
Appointment.business_id → Business A
Appointment.staff_id → Staff belonging to Business B
```

Where necessary, enforce tenant consistency using:

* composite foreign keys
* composite unique constraints
* appropriate schema design
* database constraints
* triggers only when declarative constraints are insufficient
* RLS

Prefer PostgreSQL-native constraints over application-only checks.

---

# 45. AUTHORIZATION

Authentication answers:

> Who are you?

Authorization answers:

> Are you allowed to perform this operation?

Never confuse the two.

Do not use:

```ts
if (user)
```

as a complete authorization system.

Authorization must consider:

* tenant
* role
* resource
* operation
* ownership

---

# 46. IDOR PROTECTION

Never trust client-provided resource IDs.

For example:

```json
{
  "appointment_id": "some-other-tenant-appointment"
}
```

must not be sufficient to access or modify that appointment.

Authorization must verify ownership/access.

---

# 47. DATA FETCHING

Fetch data at the appropriate architectural level.

Prefer:

```text
Server Component
→ server query
→ Supabase
```

for server-rendered data.

Avoid unnecessary:

```text
Server Component
→ browser fetch
→ API route
→ Supabase
```

when no client-side behavior requires it.

---

# 48. QUERY DESIGN

Only select data required by the feature.

Avoid unnecessarily broad queries.

Prefer:

```ts
.select("id, name, status")
```

when the feature only needs those fields.

Be particularly careful with:

* sensitive data
* large tables
* joins
* mobile payloads

---

# 49. DATABASE PERFORMANCE

Consider:

* indexes
* joins
* filtering
* ordering
* pagination
* RLS
* query cardinality

Do not fetch thousands of records when the interface displays twenty.

Avoid N+1 queries.

---

# 50. PAGINATION

Large datasets must not be loaded unbounded.

Use appropriate pagination.

For large or frequently changing datasets, consider cursor/keyset pagination where appropriate.

---

# 51. TIME AND DATES

Date/time logic must be explicit.

Never casually manipulate appointment times as arbitrary strings.

Always understand:

* stored timezone
* business timezone
* user timezone
* display timezone
* appointment boundaries

Avoid ambiguous local timestamps.

---

# 52. BOOKING IMPLEMENTATION

The booking system is reusable domain infrastructure.

Do not implement appointment logic as UI-specific code.

Booking logic must account for:

* staff
* services
* working hours
* availability
* blocked periods
* service duration
* buffers
* conflicts
* cancellation
* rescheduling
* tenant ownership
* timezones
* concurrency

---

# 53. BOOKING CONCURRENCY

Never rely exclusively on:

```text
check availability
→ user submits
→ insert
```

Two requests can happen simultaneously.

Database-level protection must prevent invalid overlapping bookings where required by the domain.

Concurrency is part of correctness.

---

# 54. NOTIFICATIONS

Do not embed provider-specific notification logic inside UI components.

Prefer:

```text
Domain Event
    ↓
Notification Service
    ↓
Provider
```

Examples:

```text
appointment.created
appointment.cancelled
appointment.rescheduled
appointment.reminder_due
```

Use the project's established notification providers.

---

# 55. STORAGE

Supabase Storage must follow tenant boundaries.

Use deterministic tenant-aware paths.

Conceptually:

```text
/businesses/{businessId}/...
```

Storage access must be controlled by policies.

Never treat a client-provided storage path as authorization.

---

# 56. IMAGE / FILE UPLOADS

Validate:

* file type
* MIME type
* file size
* ownership
* storage destination

Do not trust file extensions alone.

---

# 57. SECURITY

Every implementation must consider:

* authentication
* authorization
* tenant isolation
* IDOR
* injection
* XSS
* CSRF where relevant
* unsafe redirects
* credential exposure
* storage access
* webhook authenticity
* rate limiting where required

Never treat security as a later phase.

---

# 58. ENVIRONMENT VARIABLES

Never expose secrets through public environment variables.

Never commit secrets.

Never log:

* passwords
* access tokens
* service-role keys
* session secrets

Use the deployment environment's secret management.

---

# 59. STATE MANAGEMENT

Do not introduce global state by default.

Use:

### Server state

For server-owned data.

### Local React state

For component-local interaction.

### URL state

For:

* filters
* search
* pagination
* navigation state

### Form state

For forms.

Introduce global client state only when there is a demonstrated need.

---

# 60. URL STATE

State that should survive navigation or be shareable should generally live in the URL.

Example:

```text
/dashboard/appointments?status=confirmed&date=2026-09-26
```

Do not hide important navigational state entirely inside React state.

---

# 61. PERFORMANCE

Performance must be considered during implementation.

Prefer:

* Server Components
* small Client Components
* optimized images
* lazy loading where appropriate
* efficient queries
* minimal dependencies
* efficient Motion animations
* server-side data fetching where appropriate

Do not knowingly ship avoidable performance problems.

---

# 62. NEXT.JS CACHING

Understand whether data is:

* static
* cached
* revalidated
* dynamic
* user-specific
* tenant-specific

Never introduce caching that could leak tenant-specific data.

Before caching, ask:

> Could data generated for Business A ever be returned to Business B?

If yes, redesign the caching strategy.

---

# 63. MOBILE / REACT NATIVE

React Native/Expo follows the same engineering principles.

Reuse:

* types
* validation
* domain logic
* API contracts

where architecture permits.

Do not duplicate business rules unnecessarily between:

```text
Web
Mobile
```

UI components remain platform-specific.

---

# 64. SHARED PACKAGES

In a monorepo, use shared packages when code genuinely belongs to multiple applications. In a single-app repository, keep shared code in clearly separated folders so it can be extracted later.

Examples:

```text
packages/
├── ui/
├── domain/
├── database/
├── validation/
└── config/
```

Follow the actual repository architecture.

Do not create a package merely to move a few files.

---

# 65. DEPENDENCY DISCIPLINE

Before adding a dependency:

1. check whether the project already provides the capability
2. check existing dependencies
3. consider bundle size
4. consider maintenance
5. consider security
6. determine whether the dependency is actually necessary

Avoid dependency duplication.

---

# 66. ERROR HANDLING

Errors must be explicit.

Use appropriate:

* error boundaries
* `error.tsx`
* `not-found.tsx`
* domain errors
* validation errors

Do not silently swallow exceptions.

Bad:

```ts
try {
  ...
} catch {
  return null
}
```

unless returning `null` is intentionally part of the function contract.

---

# 67. DOMAIN ERRORS

When useful, create meaningful domain errors.

Examples:

```text
BookingConflictError
UnauthorizedBusinessAccessError
InvalidAvailabilityError
AppointmentCancellationError
```

Internal errors must be translated into appropriate user-facing messages.

---

# 68. DELETE OPERATIONS

Destructive operations require deliberate handling.

Consider:

* authorization
* confirmation
* database dependencies
* cascading behavior
* audit requirements
* recovery/undo where appropriate

Do not casually use cascading deletes.

---

# 69. SOFT DELETE

Do not automatically add soft deletion.

Use it only when the domain requires it.

If soft deletion exists, ensure that:

* queries account for it
* RLS accounts for it
* unique constraints account for it where necessary
* relationships behave correctly

---

# 70. DATABASE TYPES

Use generated Supabase/PostgreSQL types where available.

Do not manually duplicate database schemas throughout the application.

Database changes should propagate into application types through the established generation workflow.

---

# 71. API CONTRACTS

API boundaries must be typed.

Avoid loosely typed payloads.

Define:

* input
* output
* errors
* validation

where the project architecture requires explicit API contracts.

---

# 72. TESTING

Tests are part of implementation.

Prioritize testing:

* domain logic
* validation
* authorization
* RLS
* tenant isolation
* booking conflicts
* date calculations
* critical Server Actions
* critical user flows

Do not test trivial implementation details simply to increase test count.

---

# 73. DATABASE TESTING

Where database security is important, test:

* same-tenant access
* cross-tenant denial
* role restrictions
* foreign-key integrity
* invalid relationships
* booking conflicts
* destructive operations

A happy-path test is insufficient for security-sensitive features.

---

# 74. TYPECHECKING

Before completing implementation, run the project's type checking.

Do not claim success without actually running it.

If errors are unrelated and pre-existing, explicitly identify them.

---

# 75. LINTING

Run the project's linter.

Do not disable rules merely to make the implementation pass.

If an exception is genuinely necessary, keep it narrow and explain why.

---

# 76. BUILD

Run the appropriate production build when applicable.

A feature is not considered fully validated merely because the development server renders.

---

# 77. NEVER FAKE VALIDATION

Never state:

```text
Tests passed
```

unless tests were actually run.

Never state:

```text
Build passed
```

unless the build actually succeeded.

Never state:

```text
Migration applied
```

unless the database confirms it.

Never fabricate tool output.

---

# 78. REFACTORING

Do not rewrite unrelated areas while implementing a feature.

Prefer:

```text
Understand
→ Minimal coherent change
→ Validate
→ Refactor only where necessary
```

Do not turn:

```text
Add booking filter
```

into:

```text
Rewrite dashboard architecture
```

unless the existing architecture makes the feature genuinely impossible or unsafe.

---

# 79. CODE READABILITY

Prefer code that is:

* explicit
* predictable
* composable
* readable
* strongly typed

Avoid clever code.

Senior engineering is not about making code complicated.

It is about controlling complexity.

---

# 80. COMMENTS

Do not comment obvious code.

Bad:

```ts
// Set loading to true
setLoading(true)
```

Comments should explain:

* why
* constraints
* tradeoffs
* non-obvious framework behavior
* security considerations
* architectural reasons

---

# 81. NAMING

Use domain language.

Prefer:

```text
appointment
business
customer
staffMember
service
availability
```

Avoid:

```text
thing
item
data
obj
record
```

Names should communicate intent.

---

# 82. IMPORTS

Follow existing import conventions.

Prefer established project aliases.

Avoid deep imports into unrelated implementation details.

In a monorepo, respect package boundaries.

---

# 83. COMPONENT STATES

For every meaningful interactive component, consider:

```text
default
hover
focus
active
disabled
loading
success
error
selected
empty
```

Implement only states that are relevant, but do not overlook important interaction states.

---

# 84. RESPONSIVE TABLES

Tables must have a deliberate mobile strategy.

Do not simply allow uncontrolled horizontal overflow.

Depending on the feature, consider:

* responsive columns
* card transformation
* horizontal scrolling
* priority columns
* mobile-specific presentation

---

# 85. DIALOGS

Dialogs must:

* trap focus correctly
* have an accessible title
* support keyboard dismissal where appropriate
* prevent accidental destructive actions
* preserve context
* behave correctly on mobile

Prefer Radix/shadcn dialog infrastructure.

---

# 86. MODALS AND SERVER DATA

Do not unnecessarily load an entire dataset into a client component simply because a modal needs one record.

Prefer targeted server data retrieval or appropriately designed server/client boundaries.

---

# 87. FORM SUBMISSION

Mutation flow should generally be:

```text
User Input
 ↓
Client Validation
 ↓
Server Action
 ↓
Authentication
 ↓
Authorization
 ↓
Runtime Validation
 ↓
Domain Logic
 ↓
Database
 ↓
Typed Result
 ↓
UI Feedback
```

Client validation improves UX.

Server validation provides security and correctness.

Both are required where appropriate.

---

# 88. DATABASE-FIRST SECURITY

If a security rule can be enforced structurally by PostgreSQL, prefer that over relying exclusively on JavaScript.

Examples:

```text
UNIQUE
FOREIGN KEY
COMPOSITE FOREIGN KEY
CHECK
NOT NULL
RLS
```

Use application logic for rules that genuinely belong at the application/domain level.

---

# 89. CROSS-TENANT REVIEW

Whenever implementing tenant-sensitive functionality, verify:

```text
[ ] Resource has tenant ownership
[ ] Query is tenant-safe
[ ] Mutation is tenant-safe
[ ] RLS is tenant-safe
[ ] Foreign keys cannot cross tenants
[ ] Client IDs cannot bypass authorization
[ ] Storage access cannot cross tenants
[ ] Cache cannot cross tenants
```

---

# 90. VISUAL IMPLEMENTATION QUALITY

The implementation should reflect NortBrand's design philosophy:

> Minimalism, but functional.

Prioritize:

* spacing
* typography
* hierarchy
* alignment
* interaction
* restrained color
* intentional animation

Do not compensate for weak UX with visual effects.

---

# 91. PREMIUM UI

Premium UI comes from precision, not visual excess.

Avoid unnecessary:

* gradients
* glassmorphism
* shadows
* rounded containers
* decorative blobs
* animations
* floating elements

unless they serve the established design.

---

# 92. ICONOGRAPHY

Maintain consistent icon sizing.

Avoid arbitrary icon sizes across equivalent controls.

Use Lucide's established stroke style consistently.

---

# 93. ANIMATION CONSISTENCY

Use consistent:

* durations
* easing
* spring behavior
* stagger patterns
* entry/exit behavior

Do not give every component its own unrelated animation language.

---

# 94. NO ANIMATION BY DEFAULT

Not every element needs animation.

Ask:

> What does this animation communicate?

If the answer is nothing, remove it.

---

# 95. ACCESSIBLE ANIMATION

Animation must not:

* block interaction
* prevent keyboard access
* hide important information
* create excessive motion
* interfere with reduced-motion preferences

---

# 96. IMPLEMENTATION ORDER

For complex features, prefer:

```text
1. Database/schema
2. Constraints
3. RLS
4. Types
5. Validation
6. Domain logic
7. Server queries/actions
8. UI components
9. Responsive behavior
10. Animation
11. Tests
12. Validation
```

Do not rigidly follow this order if the architecture requires another sequence, but do not build a polished UI on top of an undefined data/security model.

---

# 97. WHEN DATABASE AND UI CONFLICT

The database/domain model wins.

Do not distort the database to make a UI shortcut possible.

Instead:

1. identify the domain requirement
2. design the correct data model
3. implement appropriate queries/actions
4. adapt the UI

---

# 98. WHEN EXISTING CODE IS BAD

Do not blindly copy an existing anti-pattern.

If existing code violates the current standard:

1. identify the issue
2. determine whether the new feature depends on it
3. avoid reproducing the issue
4. improve the affected code where necessary
5. avoid unrelated rewrites

Consistency is valuable, but deliberate improvement is more valuable.

---

# 99. WHEN REQUIREMENTS ARE AMBIGUOUS

Do not invent business behavior.

If ambiguity materially affects implementation, identify the exact decision required.

If the existing architecture, ADRs, domain model, or surrounding implementation already resolves the ambiguity, proceed without asking.

---

# 100. COMPLETION STANDARD

Before considering an implementation complete, verify:

```text
[ ] Existing architecture respected
[ ] Existing components reused where appropriate
[ ] TypeScript strictness maintained
[ ] Runtime validation implemented
[ ] Server/client boundary correct
[ ] Supabase access correctly structured
[ ] Authorization implemented
[ ] Tenant isolation verified
[ ] RLS reviewed
[ ] Cross-tenant relationships protected
[ ] Database migration created where required
[ ] Queries optimized appropriately
[ ] Responsive UI implemented
[ ] Accessibility considered
[ ] Loading state implemented
[ ] Empty state implemented
[ ] Error state implemented
[ ] Motion used intentionally
[ ] Reduced motion considered
[ ] No unnecessary dependencies added
[ ] Payments, when in scope: references/payments.md section 20 checklist completed
[ ] Tests added/updated where appropriate
[ ] Typecheck executed
[ ] Lint executed
[ ] Build executed where applicable
```

---

# 100.1 DELIVERY WORKFLOW: TICKETS, BRANCHES, PULL REQUESTS

NortBrand delivers code the way professional engineering teams do. Code is never written and pushed straight to `main`.

Every change follows this lifecycle:

```text
Ticket → Branch → Implement → Validate → Push → Pull Request → Review → Merge → Close
```

## Tickets

* Every unit of work starts as a ticket. Use GitHub Issues unless the project has chosen another tracker.
* GitHub assigns the number. Never invent or reuse ticket numbers.
* Title format: `|TAG| Imperative summary`. Example: `|FRONTEND| Build card components UI`.
* Apply the tag as a GitHub label as well, so the backlog can be filtered.
* Each ticket body contains: context, scope, out of scope, acceptance criteria, and links (brief section, Figma node, related tickets).
* One ticket is one coherent, reviewable change. A component set, a feature slice, a migration with its policies and tests. Not one file, and not a whole phase.
* Each project phase is a GitHub milestone. At the start of a phase, propose the full ticket list for approval before creating any tickets.

## Tags

```text
|FRONTEND|   UI, components, pages, styling, motion
|BACKEND|    server actions, API routes, webhooks, email sending
|DATABASE|   schema, migrations, RLS, database functions, seed data
|CMS|        Sanity schemas, Studio, content queries
|INFRA|      hosting, CI/CD, environments, DNS, monitoring
|SECURITY|   security-specific hardening and reviews
|A11Y|       accessibility fixes and audits
|PERF|       performance work
|SEO|        metadata, sitemap, structured data
|I18N|       localization and translations
|TEST|       test-only changes
|DOCS|       README, ADRs, runbooks
|CHORE|      dependencies, tooling, refactors without behaviour change
|FIX|        bug fixes
```

## Branches

* One branch per ticket, created from an up-to-date `main`.
* Name: `<type>/<ticket-number>-<short-slug>`. Examples: `feat/23-card-components`, `fix/41-form-error-state`, `chore/12-update-deps`.
* Never commit directly to `main`. `main` is protected and only receives merged pull requests.

## Commits

* Use Conventional Commits with a scope, and reference the ticket. Example: `feat(ui): add Card component variants (#23)`.
* Each commit is a coherent step that builds. No `wip`, `fix stuff` or `final` commits.

## Validation before pushing

* Run typecheck, lint, tests and build. Run Playwright when user flows changed.
* Check the ticket's acceptance criteria one by one.
* Run the implementation checklist (section 100).
* Report real command output. Never claim a check passed without running it.

## Pull requests

* Open one pull request per ticket. The PR title matches the ticket title.
* The PR body contains:
  * `Closes #<ticket>`
  * a summary of what changed and why
  * screenshots for UI changes (desktop, tablet, mobile; EN and PT where relevant)
  * how it was tested
  * any deviation from the brief, or technical debt, with the reason
* CI must pass.
* The human lead reviews and approves. Never merge a pull request without explicit approval in the conversation.
* Merge with squash into `main`, delete the branch, and confirm that the ticket closed.

## Narrating the work

Always state which ticket and which step you are on, using the ticket title and tag:

```text
Ticket #23 — |FRONTEND| Build card components UI
Step 1/7 · Branch       feat/23-card-components created from main
Step 2/7 · Implement    ...
Step 3/7 · Validate     typecheck ✓ lint ✓ tests ✓ build ✓
Step 4/7 · Commit       feat(ui): add Card component variants (#23)
Step 5/7 · Push         origin/feat/23-card-components
Step 6/7 · Pull request #24 opened, CI running — awaiting review
Step 7/7 · Merge        squash-merged after approval, ticket #23 closed
```

Work one ticket at a time unless parallel work is explicitly approved.

## Exceptions

* **Production hotfix:** still requires a ticket and a pull request. Review may be shortened, but it is never skipped.
* **Project bootstrap:** the initial scaffold before the remote repository exists may be committed locally. Push it as the baseline commit, and start the ticket workflow immediately after.

## Approvals

These steps need the human lead's approval:

* creating the phase ticket list
* merging any pull request
* anything remote that is not part of an approved ticket (new cloud projects, DNS, paid services)

Pushing feature branches and opening pull requests for approved tickets does not need separate approval.

---

# 101. FINAL ENGINEERING STANDARD

Every implementation must satisfy this principle:

> Write code that a senior engineer can inherit without needing to rewrite it.

The expected NortBrand implementation standard is:

```text
Strong TypeScript
+
Clear architecture
+
Reusable components
+
Server-first Next.js
+
Secure Supabase
+
PostgreSQL integrity
+
Strict tenant isolation
+
RLS
+
Runtime validation
+
Accessible UI
+
Responsive UI
+
Intentional Motion
+
Efficient rendering
+
Tested domain logic
+
Maintainable code
```

Do not optimize for producing code quickly.

Optimize for producing code correctly.
