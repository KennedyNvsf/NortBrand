# Continuous integration

What runs on every pull request to `main`, and how to read a failure (#44).

## 1. The checks

`.github/workflows/ci.yml` runs seven jobs in parallel on GitHub's Ubuntu runners.

| Check                               | Required | What it proves                                                                 |
| ----------------------------------- | -------- | ------------------------------------------------------------------------------ |
| **Typecheck, lint, test, build**    | yes      | Types, ESLint, Prettier, Vitest and a production build                         |
| **e2e (desktop)**                   | yes      | Every Playwright spec in Chromium at 1280 × 720, on this PR's production build |
| **e2e (mobile)**                    | yes      | The same specs at iPhone 14 size (390 px, touch, mobile UA) in Chromium        |
| **Database (pgTAP)**                | yes      | Every migration applies to a fresh Postgres, and `supabase/tests` passes       |
| **e2e (webkit 1/2, informational)** | no       | The mobile specs in real WebKit, in two shards                                 |
| **e2e (webkit 2/2, informational)** | no       | The other half                                                                 |
| **Lighthouse (mobile)**             | yes¹     | 5 pages × EN/PT meet the Lighthouse budgets (§ 4)                              |
| **e2e (preview)**                   | no²      | The host-independent specs against this PR's own Vercel preview (§ 2.1)        |

¹ Once the lead adds it to the branch protection rule (a repository setting).
² Informational at first (#45). The lead makes it required after a run of green PRs.

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
- **axe audits the page at rest.** Every spec calls `settleAnimations(page)` (`tests/e2e/settle.ts`) before `new AxeBuilder`. It waits for running animations to finish, because an element caught mid-fade fails colour contrast against a blend. That race appeared on the mobile runner once the reveal engine loaded after hydration (#105).
  - It samples each animation's `currentTime` twice, about 100 ms apart, and ignores any that didn't advance. Headless WebKit can leave a CSS colour transition `running` with `currentTime` stuck at 0 for good. It never finishes, so a plain "wait until nothing runs" timed out every axe spec in WebKit (#108).
  - It never fails a test. After 5 s it records a `settle-timeout` annotation (visible in the HTML report) and lets axe run. Motion itself is tested in `motion.spec.ts`.
- **Retries.** Each test retries up to twice in CI. A trace is recorded on the first retry.
- **WebKit shards.** WebKit is several times slower than Chromium on the runner (the first
  run took 18 minutes), so it runs as two parallel shards (`--shard=1/2`, `2/2`).
- **CI timeouts.** In CI, each test gets 60 s and each assertion 10 s
  (`playwright.config.ts`). Locally the defaults of 30 s and 5 s stay, so real slowness
  still fails on a laptop.

### 2.1 The preview job (#45)

```text
Vercel API: deployment for the PR's head commit, not production → wait for READY
→ pnpm test:e2e --project=desktop --project=mobile-chromium
    E2E_BASE_URL=<preview>  (no webServer: the deployment is the server)
    └─ globalSetup tests/e2e/preview-setup.ts: bypass secret → Vercel bypass cookie
```

The local-build jobs prove the code; this one proves the **deployment**: Vercel's CDN,
functions in `fra1`, the real environment variables and the Sanity `development`
dataset. A preview that builds but breaks at runtime (a missing variable, a region, a
redirect) shows up here.

- **Finding the preview.** Vercel posts a commit status but no GitHub deployment
  events, so `deployment_status` never fires. The job asks
  `GET /v6/deployments?projectId=…&sha=<head sha>` with `VERCEL_TOKEN` (a token scoped
  to the NortBrand team) and polls every 15 s for up to 20 minutes. `ERROR` or
  `CANCELED` fails at once. The project and team ids in the workflow are not secret.
- **Getting past Vercel Authentication.** `VERCEL_AUTOMATION_BYPASS_SECRET` is sent
  once, by the global setup, with `x-vercel-set-bypass-cookie`. Vercel answers with a
  cookie for the preview host, and the saved storage state (`playwright/.auth/`,
  git-ignored) carries it into every test. The secret never rides on page requests, so
  third-party hosts a page loads (Sanity CDN, Sentry) never see it.
- **What runs there.** Everything except the specs in `PREVIEW_IGNORED`
  (`tests/e2e/target.ts`):
  - consultation form and newsletter: a preview would write to the dev database and send
    email;
  - both blog specs: they assert the fixture posts;
  - analytics, consent and i18n: they replace the browser state or open new contexts,
    which drops the bypass cookie, and what they test doesn't depend on the host.
- **Previews are noindex by design** (`src/lib/seo/deployment.ts`). `onPreview` flips
  two assertions: every page expects `noindex`, and `robots.txt` must disallow
  everything with no sitemap line.
- **Run it locally** against any preview (the secret is under Vercel → Deployment
  Protection; keep it in your shell only):

  ```sh
  E2E_BASE_URL=https://<preview>.vercel.app VERCEL_AUTOMATION_BYPASS_SECRET=… \
    pnpm exec playwright test --project=desktop
  ```

- **Rotating the secrets.** `VERCEL_TOKEN` expires (no later than 31 March 2027): make a
  new one scoped to the team and replace the repository secret. A new bypass secret in
  Vercel means updating `VERCEL_AUTOMATION_BYPASS_SECRET` too. A wrong secret fails the
  setup with "The preview answered 401…".

## 3. How the database job works

```text
pnpm exec supabase db start   # only Postgres, with every migration and seed.sql applied
pnpm db:test                  # supabase test db → pg_prove over supabase/tests/*.sql
```

The suite creates its own `newsletter_token_secret` in Vault, so no secret is needed. A
migration that weakens RLS, the grants or a write function fails this check.

## 4. How the Lighthouse job works (#83)

```text
pnpm build                  # E2E_FAKE_BACKEND=1, so the blog uses its fixture posts
pnpm lhci collect           # starts `pnpm start --port 3200`, runs Lighthouse 3× on 10 URLs
pnpm lhci upload            # writes HTML + JSON reports to .lighthouseci/reports/
pnpm lighthouse:summary     # the score table in the run summary
pnpm lhci assert            # checks the budgets; fails the job on an "error" budget
```

- **Pages:** Home, Services, Blog, a translated post and Contact, each in EN and PT
  (`lighthouserc.json`). Lighthouse's default **mobile** profile: a Moto G-sized screen,
  4× CPU slowdown and a slow-4G network, simulated.
- **Three runs per URL, median (#105):** a single run swung by ±0.5 s, mostly because
  the first request to each route hits a cold `next start`. Every assertion uses
  `aggregationMethod: "median"`, and the table and reports show the median run. The
  job takes about 10 minutes.
- **Simulated, not observed:** the reported LCP is Lighthouse's replay on a slow phone,
  and it counts every script requested before the first paint. The browser on the
  runner paints in about 0.2 s. See [Performance](./performance.md) § 1.
- **First visit:** Lighthouse starts with no cookies, so the consent banner shows, as
  it does for a real first-time visitor.
- **Where to read results:** the score table at the top of the run's summary page, and
  the `lighthouse-reports` artifact (one HTML report per page, kept 14 days). Reports
  aren't sent to Lighthouse's public storage, because the site isn't launched.
- **Why `pnpm lhci` and not a dependency (decided 2026-11-05):** `@lhci/cli` runs
  through `pnpm dlx` at the exact version in `package.json`'s `lhci` script. Installing
  it adds five high audit findings from Lighthouse's Puppeteer tree, which would break
  the go-live audit gate ([Dependencies](./dependencies.md) § 4). The job has read-only
  permissions and no secrets.

**The budgets** (agreed in the #83 PR):

| Assertion                                   | Level | Why                                                                                                                                                                                       |
| ------------------------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Accessibility, best practices, SEO ≥ 95     | error | All are 100 today; deterministic, so a drop is a real regression. 95 leaves room for a new Lighthouse audit.                                                                              |
| Cumulative layout shift ≤ 0.1               | error | 0 today; Google's "good" threshold.                                                                                                                                                       |
| Performance ≥ 90, LCP ≤ 2.5 s, TBT ≤ 300 ms | warn  | Runner speed varies (benchmark index 2177–3916 across #105's runs) and a local `next start` has no CDN, brotli or HTTP/2. Confirmed at #105: they become errors on Vercel previews (#45). |

**Run it locally:** `E2E_FAKE_BACKEND=1 pnpm build`, then `E2E_FAKE_BACKEND=1 pnpm lhci
autorun` (collect, upload and assert), then `pnpm lighthouse:summary`. Local performance
numbers depend on the machine. Each report shows its _benchmark index_, and below
1000 Lighthouse treats the machine as slow.

## 5. When a check fails

- **e2e.** The annotations on the PR's Files tab point at the failing line. For the
  detail, open the run, then **Artifacts → `playwright-<project>`**. Download it and run
  `pnpm exec playwright show-report playwright-report`, or open a trace from
  `test-results/` with `pnpm exec playwright show-trace <trace.zip>`.
- **pgTAP.** The job log shows the failing assertion (`not ok N - description`).
  Reproduce it locally with `pnpm db:start && pnpm db:reset && pnpm db:test`.
- **Flaky test.** A test that passes only on retry still passes the check, and the
  report marks it as flaky. Fix it rather than relying on retries.

- **Lighthouse.** The summary table says which page and category fell short; open that
  page's HTML report from the `lighthouse-reports` artifact for the failing audits.

## 6. Not yet

- **Lighthouse on previews.** Lighthouse still runs against a local build. Pointing it at
  the preview URL, with the performance budgets as errors, is the next step after the
  e2e preview job (§ 2.1) has proven stable.
