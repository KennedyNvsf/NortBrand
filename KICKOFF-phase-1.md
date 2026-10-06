# Claude Code kickoff — Phase 1: Repository and foundation

Paste everything below the line into Claude Code, started from
`~/Desktop/workstation/Nortbrand/studio/nortbrand-website`.

---

You are implementing the NortBrand website. First, read `CLAUDE.md` in this folder in full.
It contains the approved architecture and the rules for this project. Use the Figma MCP
(file `vMnAfadw2GU8sPDU1Ol0hU`) for all design values. Start with page 11 — Handoff
(`389:2`) and page 01 — Foundations (`37:3`).

This session covers **Phase 1 only: repository and foundation.** Do not build pages,
forms, Supabase tables, or Sanity schemas yet.

## Before you write anything

1. Summarize back to me, in 10 lines or fewer, what you understood from CLAUDE.md and the
   Figma handoff page.
2. List the exact package versions you plan to install, and confirm they are current stable
   releases.
3. Wait for my "go".

## Tasks after I say go

1. **Scaffold.**
   - Create a Next.js App Router app with TypeScript strict, Tailwind, ESLint and the `src/`
     directory, using pnpm. Pin Node 24 LTS in `.nvmrc` and `engines`, and pin pnpm via
     `packageManager`.
   - Initialize git on `main` with a `.gitignore` that covers `.env*`.
2. **Tooling.**
   - Prettier with the Tailwind plugin.
   - typescript-eslint strict.
   - Scripts: `typecheck`, `lint`, `test` (Vitest), `test:e2e` (Playwright, set up only).
   - A lightweight pre-commit hook that runs lint and format on staged files.
3. **Environment.**
   - Create `src/env.ts` with zod validation for every variable in CLAUDE.md, split into
     public and server-only.
   - Create `.env.example` listing every variable, with no values.
4. **Design tokens.**
   - Extract colors, typography, spacing, radii and shadows from Figma Foundations into CSS
     variables in `globals.css` and the Tailwind theme. Include light theme values.
   - Apply the accessibility overrides from CLAUDE.md, including `#DC2626` and `#C21F1F`.
   - Load Instrument Sans (400, 500, 600, 700) via `next/font`.
5. **shadcn/ui.**
   - Initialize shadcn/ui and add only Button, Input, Textarea, Label, Dialog, Sheet,
     Drawer and Sonner.
   - Restyle Button and Input to the tokens. Check their states (default, hover, focus,
     disabled, loading) against Figma Components (`37:4`).
6. **i18n skeleton.**
   - Set up next-intl with `/[locale]` routing for `en` and `pt`.
   - Root-only detection middleware: cookie, then `Accept-Language`, then `pt`. Exclude
     `/studio` and `/api`.
   - Create `messages/en.json` and `messages/pt.json` with a few keys each.
   - Add one placeholder page per locale that proves routing and `hreflang` work.
7. **Site config.**
   - Create `src/content/site.ts` with typed placeholders for contact email, phone and
     social links. Mark them clearly as TODO.
8. **CI.**
   - Add a GitHub Actions workflow for pull requests that runs install, typecheck, lint,
     unit tests and build.
   - Do not push. I will create the remote repository.
9. **Docs.**
   - Write a `README` covering setup, commands and environment variables.
   - Write `docs/adr/001` through `007` from the ADR table in the brief. Use this format for
     each: context, decision, alternatives, consequences.
   - Create an empty `docs/tech-debt.md`.

## Finish

- Run `pnpm typecheck`, `pnpm lint`, `pnpm test` and `pnpm build`, and show me the real
  output.
- Make Conventional Commits in logical steps.
- End with a short report covering three things: what was done, anything that deviates from
  CLAUDE.md and why, and what Phase 2 (layout components and static pages) needs from me.
