# Environments and accounts

**Covers:** #35, #45. **Decisions:** ADR-002 (Supabase), ADR-005 (Vercel Pro), ADR-007 (GA4).

The site runs on five outside services. The human lead owns every account (some are paid
and all hold personal data); the code only reads their values from environment variables.
This guide is the runbook for creating them, and the reference for which value goes where.

## Now and later

Paid services wait until November (launch is 30 November 2026). Development runs on free
tiers and a local database until then; #45 tracks the paid steps.

| Step                        | When                | Cost                |
| --------------------------- | ------------------- | ------------------- |
| Local Supabase (Docker)     | Now                 | Free                |
| Supabase `nortbrand-dev`    | Now                 | Free tier           |
| Resend account and audience | Now                 | Free tier           |
| Sentry                      | Now                 | Free Developer plan |
| GA4 property                | Now                 | Free                |
| Domain and Resend DNS       | By 9 November (#45) | Paid                |
| Vercel Pro                  | By 9 November (#45) | Paid                |
| Supabase `nortbrand-prod`   | Launch prep (#45)   | Free or Pro: decide |

Until Vercel exists there are no hosted previews: work locally, and CI runs the checks
against a production build of each pull request (#44).

| Service  | What it does here                                       | Environments                       |
| -------- | ------------------------------------------------------- | ---------------------------------- |
| Vercel   | Hosting, a preview deployment per branch                | Production, Preview, Development   |
| Supabase | Postgres for consultation requests and subscribers      | `nortbrand-prod`, `nortbrand-dev`  |
| Resend   | Transactional email and the newsletter audience         | One domain; one key per stage      |
| Sentry   | Error reports from browser and server, no personal data | One project, tagged by environment |
| GA4      | Analytics, loaded only after consent                    | Production only                    |

Sanity arrives with the blog (M4). Until then its variables keep the placeholder values
listed in step 7.

> **Secrets never go into chat, issues, pull requests or commits.** Paste them only into
> Vercel and your own `.env.local`. Project IDs, regions and URLs are fine to share.

## Before you start

- A password manager entry for each service (database passwords especially: Supabase shows
  them once).
- Later (#45): access to the DNS for `nortbrand.com` (Resend needs four records).
- Docker Desktop on your machine for the local database (`pnpm db:start`). It is free for
  small businesses.

## 1. Vercel (ADR-005) · later, #45

1. Create a **Pro** team called NortBrand. Hobby is non-commercial only.
2. **Add New → Project**, import `KennedyNvsf/NortBrand` from GitHub. Framework: Next.js.
   Leave the build and install commands at their defaults (pnpm is detected from the lockfile).
3. **Settings → General → Node.js Version: 24.x** (matches `.nvmrc`).
4. **Settings → Git:** production branch `main`. Preview deployments for every branch stay on.
5. **Settings → Environment Variables → "Automatically expose System Environment
   Variables"**: on. Sentry reads `VERCEL_ENV` to label errors.
6. **Settings → Deployment Protection:** keep Vercel Authentication on for previews, and
   create a **Protection Bypass for Automation** secret. Ticket #44 gives it to the CI e2e job.
7. Do not add a domain yet. The production domain and the `nortbrand.pt` redirect are part of
   M5.

**Expect Production deployments of `main` to fail until launch prep.** With
`VERCEL_ENV=production` the release guard is strict (`docs/guides/localization.md`): it
stops a build while any Portuguese message is still pseudo-translated. That is deliberate.
Previews are unaffected, and the failure disappears once the real translations land in M5.
(Draft legal text is caught separately, by `pnpm check:release`.)

## 2. Supabase (ADR-002)

Create **two** projects in the same EU region (Frankfurt `eu-central-1` or Ireland
`eu-west-1`), named `nortbrand-dev` and `nortbrand-prod`. Create `nortbrand-dev` now on the
free tier; it pauses after a week without requests, and **Restore** in the dashboard wakes
it. Create `nortbrand-prod` at launch prep (#45), and decide its plan then: a paused
production database would take the form offline. For each:

1. Save the database password in the password manager.
2. **Authentication → Sign In / Providers:** turn **off** "Allow new users to sign up". The
   site has no logins, so this closes the auth API to the public.
3. **Database → Settings:** turn on **Enforce SSL**.
4. **Project Settings → API Keys:** copy the **project URL** and the **publishable key**
   (`sb_publishable_…`, or the legacy `anon` key; both act as the `anon` role). Never copy the
   secret or `service_role` key anywhere: the app does not use it.
5. Note the **project ref** (the subdomain of the project URL). It is not secret.

Link the CLI once, from the repository root, in a normal terminal. Both commands are
interactive, so they fail inside Claude Code's `!` prefix (no TTY):

```sh
pnpm exec supabase login                       # opens the browser
pnpm exec supabase link --project-ref <dev-ref>  # asks for the dev database password
```

Migrations reach a project only through `pnpm exec supabase db push`, run deliberately:
dev first, production after the pull request is merged. Nothing in CI pushes to a database.

## 3. Resend

**Now (free tier).** Create the account, then do steps 4–6 below with a single
`nortbrand-preview` key. Without a verified domain Resend sends only from
`onboarding@resend.dev`, and only to the account's own email address. So set
`NOTIFY_TO_EMAIL` to that address, and test visitor confirmations with it too. Any other
recipient is refused. The free tier allows 100 emails a day.

**Later (#45).** Steps 1–3 and the `nortbrand-production` key, once the domain is bought.

1. **Domains → Add Domain:** `send.nortbrand.com` (a sending subdomain keeps the main
   domain's reputation separate). Region: **EU (Ireland)**.
2. Add the records Resend shows at your DNS provider: the MX and SPF TXT on `send`, and
   the DKIM TXT on `resend._domainkey.send`. Wait for **Verified**.
3. Add a DMARC record on the root domain if none exists:
   `_dmarc.nortbrand.com TXT "v=DMARC1; p=none; rua=mailto:<your inbox>"`. Tighten to
   `p=quarantine` after a few weeks of clean reports.
4. **Audiences → Create:** "Newsletter". Copy its ID (`RESEND_AUDIENCE_ID`).
5. **API Keys:** create two **Full access** keys, `nortbrand-production` and
   `nortbrand-preview`. Full access is needed because the newsletter adds and removes audience
   contacts; sending-only keys cannot. Each key is stored only in Vercel.
6. Decide the team inbox for new requests (`NOTIFY_TO_EMAIL`).

## 4. Sentry

1. Create the organization with **Data storage location: EU** (it cannot be changed later).
2. **Projects → Create:** platform Next.js, name `nortbrand-website`. Copy the **DSN**.
3. **Project Settings → Security & Privacy:** Data Scrubber **on**, "Use Default Scrubbers"
   **on**, "Prevent Storing of IP Addresses" **on**. The app also scrubs every event before
   sending (`src/lib/sentry.ts`); this is the second layer.
4. **Organization Settings → Auth Tokens:** create a token for source-map upload
   (`SENTRY_AUTH_TOKEN`). Note the organization slug and project slug.

## 5. GA4 (ADR-007)

Create the property now so the measurement ID exists; the tag loads only after consent
(#43).

1. Create a GA4 property and a **Web** data stream for `https://nortbrand.com`. Copy the
   measurement ID (`G-…`).
2. **Data collection:** Google Signals **off**; granular location and device data **off**.
3. **Data retention:** 2 months.
4. **Ads personalization:** off for all regions.

## 6. Secrets you generate

Each needs at least 32 characters. Generate one per environment:

```sh
openssl rand -base64 48
```

| Variable                   | Purpose                                                                    |
| -------------------------- | -------------------------------------------------------------------------- |
| `IP_HASH_SALT`             | Salts visitor IP hashes. Changing it resets rate limits.                   |
| `NEWSLETTER_TOKEN_SECRET`  | Signs confirm and unsubscribe links. Changing it voids links already sent. |
| `SANITY_REVALIDATE_SECRET` | Verifies the Sanity webhook (M4).                                          |

## 7. Which value goes where

Set these in **Vercel → Settings → Environment Variables**, choosing the environment
column for each value. Development is what `vercel env pull` writes into `.env.local`.
Until Vercel exists (#45), copy `.env.example` to `.env.local` and fill in the Development
column by hand.

| Variable                        | Production                 | Preview                  | Development (`.env.local`) |
| ------------------------------- | -------------------------- | ------------------------ | -------------------------- |
| `NEXT_PUBLIC_SITE_URL`          | `https://nortbrand.com`    | `https://nortbrand.com`¹ | `http://localhost:3000`    |
| `NEXT_PUBLIC_SUPABASE_URL`      | prod project URL           | dev project URL          | dev URL, or local²         |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | prod publishable key       | dev publishable key      | dev key, or local²         |
| `RESEND_API_KEY`                | `nortbrand-production` key | `nortbrand-preview` key  | `nortbrand-preview` key    |
| `RESEND_AUDIENCE_ID`            | Newsletter audience        | same                     | same                       |
| `NOTIFY_TO_EMAIL`               | team inbox                 | your own inbox           | your own inbox             |
| `IP_HASH_SALT`                  | generated                  | generated (different)    | any 32+ characters         |
| `NEWSLETTER_TOKEN_SECRET`       | generated                  | generated (different)    | any 32+ characters         |
| `NEXT_PUBLIC_SENTRY_DSN`        | DSN                        | DSN                      | empty (off)                |
| `SENTRY_AUTH_TOKEN`             | token                      | token                    | not set                    |
| `SENTRY_ORG`, `SENTRY_PROJECT`  | slugs                      | slugs                    | not set                    |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | `G-…`                      | `G-…`                    | `G-…`                      |
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | `placeholder` until M4     | same                     | same                       |
| `NEXT_PUBLIC_SANITY_DATASET`    | `production`               | same                     | same                       |
| `SANITY_API_READ_TOKEN`         | `placeholder` until M4     | same                     | same                       |
| `SANITY_REVALIDATE_SECRET`      | generated                  | generated                | any 32+ characters         |

1. Previews keep the production site URL on purpose: canonical links and `hreflang` must
   never point at a preview, and previews are `noindex` already (`docs/guides/seo.md`).
2. `pnpm db:start` prints a local API URL and anon key. Use them to work without touching the
   dev project.

Preview builds send real email. Keep `NOTIFY_TO_EMAIL` pointed at your own inbox outside
Production so test requests never reach the team.

## 8. Checks

**Now (#35).**

- [ ] `pnpm db:start` runs locally; `pnpm db:types` writes the types file.
- [ ] Sentry: with the DSN in `.env.local`, run `pnpm build && pnpm start` and open
      `http://localhost:3000`. Wait a few seconds (the SDK loads once the page is idle),
      then run `setTimeout(() => { throw new Error("sentry check") })` in the browser
      console. A plain `throw` typed into the console is not reported. The issue appears
      under environment `development`, with no IP address, cookies or query string.

**Later (#45).**

- [ ] A preview deployment of any branch builds (env validation passes).
- [ ] The same Sentry check on a preview appears under environment `preview`.
- [ ] Resend shows the domain as Verified.

## How the code uses this

- `src/env.schema.ts` validates every variable; `next dev` and `next build` fail on a
  missing or malformed one. `NEXT_PUBLIC_SENTRY_DSN` is the only optional variable.
- Sentry starts in `src/instrumentation.ts` (server and edge) and
  `src/instrumentation-client.ts` (browser), with shared options in `src/lib/sentry.ts`:
  - **Errors only.** No tracing, no replay, and no release-health sessions. Checked in a
    browser: a page view sends nothing to Sentry, and an error sends one event.
  - **Scrubbed.** Every event loses the user, request body, cookies, headers, query string
    and console breadcrumbs (unit-tested; checked in a browser with an email in the URL).
  - **Off the critical path.** The browser SDK is about 50 KB gzipped, so it loads with a
    dynamic import once the page is idle. Measured on Home: 338 KB of JavaScript with a
    static import, 289 KB with the deferred one (289 KB without Sentry at all). Errors in
    the first moments before it starts are not reported; server errors always are.
  - **Nothing without a DSN.** Local development and forks download no Sentry code.
- `next.config.ts` uploads source maps only when `SENTRY_AUTH_TOKEN` is set, then deletes
  them from the build output so browsers never receive them.
- `@sentry/cli` is allowed to run its install script (`pnpm-workspace.yaml`) because it
  downloads the binary that uploads source maps.
- `supabase/config.toml` runs only Postgres and the API locally: Realtime, Storage and
  sign-ups are off (ADR-002).
