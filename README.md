# NortBrand website

The bilingual (EN/PT) NortBrand studio website. "Booking" means a consultation request form;
the team replies within one business day. Launch is 10 November 2026.

- Architecture brief: <https://claude.ai/code/artifact/32b7a60b-6b4d-4e38-9e16-6f6c70a283d7>
- Project rules for Claude Code and humans: [`CLAUDE.md`](./CLAUDE.md)
- Decisions: [`docs/adr/`](./docs/adr) · Shortcuts: [`docs/tech-debt.md`](./docs/tech-debt.md)
- Design: Figma file `vMnAfadw2GU8sPDU1Ol0hU`. Read page 11 (Handoff) before building UI.

## Stack

Next.js 16 (App Router, Cache Components) · React 19 · TypeScript (strict) · Tailwind CSS 4 ·
shadcn/ui + Radix · Lucide · Sonner · next-intl · zod · Vitest · Playwright · pnpm · Node 24 LTS.

Supabase, Sanity, Resend, Motion, react-hook-form and Sentry arrive in later phases (see
the brief).

## Setup

Requirements:

- Node 24.21.0 or newer 24.x (`.nvmrc`)
- pnpm 12.9.1 (`packageManager` in `package.json`)

```sh
nvm use                      # or install Node 24 another way
corepack enable              # or: npm install -g pnpm@12.9.1
pnpm install                 # also installs the pre-commit hook
cp .env.example .env.local   # then fill in every value
pnpm dev
```

Open <http://localhost:3000>. The bare `/` redirects to `/pt` or `/en`.

On Windows inside OneDrive, exclude `node_modules` and `.next` from sync. Syncing them slows
installs and can lock files during builds.

## Commands

| Command                             | What it does                                                                                                                              |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm dev`                          | Start the dev server (Turbopack).                                                                                                         |
| `pnpm build`                        | Production build. Fails if any environment variable is missing.                                                                           |
| `pnpm start`                        | Serve the production build.                                                                                                               |
| `pnpm typecheck`                    | Generate route types (`next typegen`), then run `tsc --noEmit`.                                                                           |
| `pnpm lint`                         | ESLint with the Next.js config and strict typescript-eslint, zero warnings allowed. Run `pnpm typecheck` once first so route types exist. |
| `pnpm format` / `pnpm format:check` | Prettier with Tailwind class sorting.                                                                                                     |
| `pnpm test`                         | Vitest unit tests (`src/**/*.test.ts`).                                                                                                   |
| `pnpm test:e2e`                     | Playwright against a production build. Run `pnpm exec playwright install chromium` once first. Needs the env vars.                        |

The pre-commit hook (simple-git-hooks + lint-staged) runs `eslint --fix` and Prettier on
staged files. If you skip it in an emergency, CI still runs the same checks.

## Environment variables

`src/env.schema.ts` defines the contract and `src/env.ts` exposes the validated values.
`next dev`, `next build` and `next start` fail fast on a missing or malformed variable.
Never commit `.env*` files; keep `.env.example` in sync with the schema.

| Variable                        | Scope  | Format                 | Used for                                        |
| ------------------------------- | ------ | ---------------------- | ----------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`          | Public | http(s) URL            | Canonical URLs, `hreflang`, `metadataBase`      |
| `NEXT_PUBLIC_SUPABASE_URL`      | Public | http(s) URL            | Supabase project URL                            |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | non-empty              | Calls the two write functions (ADR-002)         |
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | Public | lowercase alphanumeric | Blog CMS                                        |
| `NEXT_PUBLIC_SANITY_DATASET`    | Public | lowercase              | Blog CMS dataset                                |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Public | `G-XXXXXXXXXX`         | GA4, loaded only after consent (ADR-007)        |
| `SANITY_API_READ_TOKEN`         | Server | non-empty              | Reading drafts and previews                     |
| `SANITY_REVALIDATE_SECRET`      | Server | 32+ characters         | Verifies the Sanity webhook                     |
| `RESEND_API_KEY`                | Server | starts with `re_`      | Transactional email                             |
| `RESEND_AUDIENCE_ID`            | Server | non-empty              | Newsletter audience                             |
| `NOTIFY_TO_EMAIL`               | Server | email                  | Team inbox for new requests                     |
| `IP_HASH_SALT`                  | Server | 32+ characters         | Salted SHA-256 of visitor IPs for rate limiting |

Public variables are inlined into the browser bundle at build time, so changing them needs a
rebuild. Never put a secret in a `NEXT_PUBLIC_` variable. The Supabase service-role key is
never used by the app.

`SKIP_ENV_VALIDATION=1` turns validation off for tooling only. Never set it in Vercel.

## Project layout

```
src/app/[locale]/   pages (Phase 1: placeholder only)
src/components/ui/  shadcn primitives restyled to the Figma tokens
src/content/        typed content and site config (contact details live only here)
src/i18n/           next-intl routing, request config, navigation, hreflang helper
src/lib/            utilities (cn)
src/env.ts          validated environment
src/proxy.ts        locale negotiation for the bare / only (ADR-006)
messages/           en.json, pt.json
tests/e2e/          Playwright
docs/               ADRs, tech debt
```

## Design tokens

`src/app/globals.css` holds the Figma tokens as Tailwind v4 theme variables. Tailwind's
default palette, radii, shadows and breakpoints are removed, so use the semantic tokens:

- Colors: `bg-bg-primary`, `text-text-muted`, `bg-action-primary-fill`, `text-text-accent`, …
- Spacing: `xs` to `2xl` (4 to 48 px), plus Tailwind's numeric scale on the 4 px grid
- Radii: `rounded-sm` / `md` / `lg` / `full` (6 / 10 / 16 / 999)
- Shadows: `shadow-card`, `shadow-overlay`
- Type roles: `text-display-xl`, `text-display`, `text-display-section`, `text-h1` to
  `text-h4`, `text-lead`, `text-body`, `text-small`, `text-label`, `text-caption`,
  `text-overline`. They are responsive across the three breakpoints.
- Breakpoints: `md` = 768, `lg` = 1024 (mobile-first)

The accessibility overrides from the handover audit are tokens too:

| Token                        | Value     | Use                               |
| ---------------------------- | --------- | --------------------------------- |
| `action-primary-fill`        | `#DC2626` | Primary button fill               |
| `text-accent` / `text-error` | `#C21F1F` | Small red text and error messages |

## Workflow

`main` is production. Work on `feat/*` or `fix/*` branches and merge by pull request after CI
passes. Use Conventional Commits.
