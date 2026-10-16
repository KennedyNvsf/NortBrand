# Continuous integration

What runs on every pull request to `main`, and how to read a failure (#44).

## 1. The checks

`.github/workflows/ci.yml` runs six jobs in parallel on GitHub's Ubuntu runners.

| Check                               | Required | What it proves                                                                 |
| ----------------------------------- | -------- | ------------------------------------------------------------------------------ |
| **Typecheck, lint, test, build**    | yes      | Types, ESLint, Prettier, Vitest and a production build                         |
| **e2e (desktop)**                   | yes      | Every Playwright spec in Chromium at 1280 × 720, on this PR's production build |
| **e2e (mobile)**                    | yes      | The same specs at iPhone 14 size (390 px, touch, mobile UA) in Chromium        |
| **Database (pgTAP)**                | yes      | Every migration applies to a fresh Postgres, and `supabase/tests` passes       |
| **e2e (webkit 1/2, informational)** | no       | The mobile specs in real WebKit, in two shards                                 |
| **e2e (webkit 2/2, informational)** | no       | The other half                                                                 |

**Why WebKit is informational (decided 2026-10-16).** On the 2-vCPU Linux runners,
WebKit renders in software with one worker. Two runs of identical code gave opposite
results:

- one passed, with 10 tests needing retries;
- the next failed with hung or crashed pages.

A check like that would block merges for reasons unrelated to the change. Chromium at the
iPhone viewport covers what the mobile harness checks (layout, overflow at 390 px, axe,
touch targets). WebKit still runs on every PR: a red WebKit check is a prompt to look,
and if it is real, to fix it. Locally, `pnpm test:e2e` runs desktop Chromium and WebKit
mobile, as the brief asks. The `mobile-chromium` project exists only in CI.

## 2. How the e2e jobs work

```text
checkout → pnpm install → playwright install <browser> --with-deps
→ pnpm test:e2e --project=<desktop|mobile>
    └─ playwright.config.ts webServer: pnpm build && pnpm start (E2E_FAKE_BACKEND=1)
```

- **The PR's own production build.** These are the same specs you run locally, including
  the page harness in `tests/e2e/routes.ts`: axe, one H1, canonical and `hreflang`, and no
  overflow at 390 px.
- **Nothing reaches a real service.**
  - The consultation and newsletter actions use their fake backends (`E2E_FAKE_BACKEND=1`).
  - The analytics spec intercepts every Google domain.
  - The placeholder env values at the top of the workflow are enough: no job needs a
    real secret.
- **Retries.** Each test retries up to twice in CI. A trace is recorded on the first retry.
- **WebKit shards.** WebKit is several times slower than Chromium on the runner (the first
  run took 18 minutes), so it runs as two parallel shards (`--shard=1/2`, `2/2`).
- **CI timeouts.** In CI, each test gets 60 s and each assertion 10 s
  (`playwright.config.ts`). Locally the defaults of 30 s and 5 s stay, so real slowness
  still fails on a laptop.

## 3. How the database job works

```text
pnpm exec supabase db start   # only Postgres, with every migration and seed.sql applied
pnpm db:test                  # supabase test db → pg_prove over supabase/tests/*.sql
```

The suite creates its own `newsletter_token_secret` in Vault, so no secret is needed. A
migration that weakens RLS, the grants or a write function fails this check.

## 4. When a check fails

- **e2e.** The annotations on the PR's Files tab point at the failing line. For the
  detail, open the run, then **Artifacts → `playwright-<project>`**. Download it and run
  `pnpm exec playwright show-report playwright-report`, or open a trace from
  `test-results/` with `pnpm exec playwright show-trace <trace.zip>`.
- **pgTAP.** The job log shows the failing assertion (`not ok N - description`).
  Reproduce it locally with `pnpm db:start && pnpm db:reset && pnpm db:test`.
- **Flaky test.** A test that passes only on retry still passes the check, and the
  report marks it as flaky. Fix it rather than relying on retries.

## 5. Not yet

- **Vercel previews.** e2e runs against a local build, not a preview deployment, until
  Vercel Pro is in place (#45).
- **Lighthouse budgets** (M5).
