# Environments and accounts

**Covers:** #35, #45, #98, #101. **Decisions:** ADR-002 (Supabase), ADR-005 (Vercel Pro),
ADR-007 (GA4), ADR-008 (domain).

The site runs on five outside services. The human lead owns every account (some are paid
and all hold personal data); the code only reads their values from environment variables.
This guide is the runbook for creating them, and the reference for which value goes where.

## Now and later

Paid services were bought in November (#45); launch is Thursday 10 December 2026.
Development runs on free tiers and a local database where it can.

| Step                       | When            | Cost                |
| -------------------------- | --------------- | ------------------- |
| Local Supabase (Docker)    | Now             | Free                |
| Supabase `nortbrand-dev`   | Now             | Free tier           |
| Resend account and segment | Now             | Free tier           |
| Sentry                     | Now             | Free Developer plan |
| GA4 property               | Now             | Free                |
| Domain (`nortbrand.pt`)    | Bought (#98)    | Paid                |
| Vercel Pro                 | Done 7 November | Paid                |
| Resend DNS                 | Done 8 November | Free                |
| Supabase `nortbrand-prod`  | Done 8 November | Free (#101 trial)   |

Vercel project `nort-brand/nort-brand` builds a protected preview of every branch. CI
still runs its checks against a production build of each pull request (#44) until the
e2e job moves to previews (#45).

| Service  | What it does here                                       | Environments                       |
| -------- | ------------------------------------------------------- | ---------------------------------- |
| Vercel   | Hosting, a preview deployment per branch                | Production, Preview, Development   |
| Supabase | Postgres for consultation requests and subscribers      | `nortbrand-prod`, `nortbrand-dev`  |
| Resend   | Transactional email and the newsletter segment          | One domain; one key per stage      |
| Sentry   | Error reports from browser and server, no personal data | One project, tagged by environment |
| GA4      | Analytics, loaded only after consent                    | Production only                    |

Sanity holds the blog (ADR-003). The project `nortbrand-website` (id `p4bc960d`) was
created on 16 October 2026 (#58); its steps are in § 9.

> **Secrets never go into chat, issues, pull requests or commits.** Paste them only into
> Vercel and your own `.env.local`. Project IDs, regions and URLs are fine to share.

## Before you start

- A password manager entry for each service (database passwords especially: Supabase shows
  them once).
- Access to the DNS for `nortbrand.pt` (Dynadot, `ns1.dyna-ns.net`): Resend's four records
  were added there on 8 November (#45); the website's two records are a go-live step (#85).
- Docker Desktop on your machine for the local database (`pnpm db:start`). It is free for
  small businesses.

## 1. Vercel (ADR-005) · set up 8 November, #45

1. Create a **Pro** team called NortBrand. Hobby is non-commercial only.
2. **Add New → Project**, import `KennedyNvsf/NortBrand` from GitHub. Framework: Next.js.
   Leave the build and install commands at their defaults (pnpm is detected from the lockfile).
3. **Settings → General → Node.js Version: 24.x** (matches `.nvmrc`). The `engines` field
   in `package.json` forces 24.x anyway, and the build log warns when the setting differs.
4. **Settings → Functions → Function Region:** the region next to the Supabase projects:
   Frankfurt `fra1` for `eu-central-1`, Dublin `dub1` for `eu-west-1`. The default is the
   US (`iad1`), which adds a transatlantic round trip to every form submission and keeps
   request handling outside the EU. To check it, request any page with
   `vercel curl <url> -- -s -D - -o /dev/null`: the second part of `X-Vercel-Id`
   (`cdg1::fra1::…`) is the function region. **Chosen: `dub1` only**, next to
   `nortbrand-prod` (`eu-west-1`). Select one region: with several (the default list
   included `iad1`), a visitor is served from the closest one, so a US visitor's form
   submission would run in Washington and cross the Atlantic twice to the database.
5. **Settings → Git:** production branch `main`. Preview deployments for every branch stay on.
6. **Settings → Environment Variables → "Automatically expose System Environment
   Variables"**: on. Sentry reads `VERCEL_ENV` to label errors.
7. **Settings → Deployment Protection:** keep Vercel Authentication on for previews, and
   create a **Protection Bypass for Automation** secret. Ticket #44 gives it to the CI e2e job.
8. Do not add a domain here. `nortbrand.pt` and `www` (ADR-008) are added on
   launch day, in order, by the [Go-live runbook](./go-live.md) § 3.

**Expect Production deployments of `main` to fail until launch prep.** Each merge to
`main` shows a red "Vercel" status on the commit; it does not block anything.

- Until the Production column of § 7 is filled in, `src/env.ts` stops the build with
  `EnvValidationError` (seen on the first deployments, 7 November).
- After that, the release guard is strict on `VERCEL_ENV=production`
  (`docs/guides/localization.md`): it stops a build while any Portuguese message is still
  pseudo-translated. That is deliberate. The Portuguese translation landed in #76, so
  production builds pass unless an English string changes and its Portuguese one is still
  being translated (§ 6 of that guide). Draft legal text is caught separately, by
  `pnpm check:release`.

Previews are unaffected by both.

### Reading a preview

Previews sit behind Vercel Authentication, so `curl` gets a login page. Sign the CLI in
once (`pnpm dlx vercel login`, which opens the browser), link it from a folder **outside**
the repository, and request pages through it:

```sh
pnpm dlx vercel link --yes --project nort-brand --scope nort-brand
pnpm dlx vercel curl https://<preview>.vercel.app/api/health/newsletter --scope nort-brand
pnpm dlx vercel inspect https://<preview>.vercel.app --logs --scope nort-brand   # build log
```

Linking inside the repository makes the CLI add `.vercel` and `.env*` to `.gitignore`
(the second would hide `.env.example`) and a `VERCEL_OIDC_TOKEN` line to `.env.local`. In
Git Bash, pass full URLs: a bare `/en` is turned into a Windows path.

## 2. Supabase (ADR-002)

Create **two** projects in the same EU region (Frankfurt `eu-central-1` or Ireland
`eu-west-1`), named `nortbrand-dev` and `nortbrand-prod`. Create `nortbrand-dev` now on the
free tier; it pauses after a week without requests, and **Restore** in the dashboard wakes
it. A paused production database would take the form offline, so `nortbrand-prod` runs on
Free only with the keep-alive ([below](#keep-alive-free-plan-trial-101)); Pro is the fallback.

**`nortbrand-prod` (created 8 November 2026, #45):** ref `sobyanefxeexdwmqujcn`, region
`eu-west-1` (Ireland), Free plan. Sign-ups off, Enforce SSL on. Migrations
`20261015120000` and `20261015204624` pushed the same day after the lead's approval, with
no seed. Checked through the public key: both tables refuse reads and inserts (`42501`),
and the functions answer. The CLI is linked back to `nortbrand-dev` afterwards, so a
later local command cannot reach production by accident.

For each project:

1. Save the database password in the password manager.
2. **Authentication → Sign In / Providers:** turn **off** "Allow new users to sign up". The
   site has no logins, so this closes the auth API to the public.
3. **Database → Settings:** turn on **Enforce SSL**.
4. **Project Settings → API Keys:** copy the **project URL** and the **publishable key**
   (`sb_publishable_…`, or the legacy `anon` key; both act as the `anon` role). The secret
   (`service_role`) key goes only into `SUPABASE_SERVICE_ROLE_KEY`, server-side, for the
   portal's auth administration (ADR-009, from #132). Never anywhere else.
5. Note the **project ref** (the subdomain of the project URL). It is not secret.

Link the CLI once, from the repository root, in a normal terminal. Both commands are
interactive, so they fail inside Claude Code's `!` prefix (no TTY):

```sh
pnpm exec supabase login                       # opens the browser
pnpm exec supabase link --project-ref <dev-ref>  # asks for the dev database password
```

Migrations reach a project only through `pnpm exec supabase db push`, run deliberately:
dev first, production after the pull request is merged. Nothing in CI pushes to a database.

### Auth for the portal (ADR-009, #129)

The portal (M6) signs people in with Supabase Auth. Set this in **each** project before the
portal's sign-in tickets (#131, #132) are tested against it, and in `nortbrand-prod` before
launch:

1. **Authentication → Sign In / Providers:** keep "Allow new users to sign up" **off**
   (users exist only by invitation). Under **Email**, keep the provider on, and set the
   **email OTP length** to 6, the **OTP expiry** to 600 seconds (10 minutes) and the
   minimum interval between emails to 60 seconds (the form's resend countdown).
2. **Authentication → Rate Limits:** token verifications **10** per 5 minutes per IP. The
   app allows 3 tries per code; this caps anyone calling Supabase's verify endpoint
   directly (tech debt). Emails sent: **30** per hour (the default of 2 is for Supabase's
   built-in sender; the app already limits code requests to 10 per IP per hour and 200
   in total).
3. **Sessions: nothing to set.** Time-boxed sessions are a Pro feature. The app ends
   portal sessions after 30 days itself, with a signed marker cookie
   (`src/features/portal/auth/session-marker.ts`).
4. **Authentication → Emails → Templates → Magic Link:** subject
   `NortBrand: your sign-in code / o seu código de acesso`, body: the whole of
   `supabase/templates/portal-code.html` (generated from React Email; EN or PT by the
   user's `locale` metadata). Paste it again whenever that file changes.
5. **Authentication → Emails → SMTP settings:** enable custom SMTP with Resend
   (host `smtp.resend.com`, port 465, user `resend`, password: a Resend API key with
   sending access; sender `NortBrand <hello@send.nortbrand.pt>`). Supabase's built-in
   sender allows only a few emails an hour and is not meant for production.
6. **Authentication → URL Configuration:** set the site URL to the environment's
   `NEXT_PUBLIC_SITE_URL`.

**Applied (2026-11-14, #131):** `nortbrand-dev`, through the Management API, sender
`NortBrand <onboarding@resend.dev>` (dev's Resend test sender, which only delivers to the
Resend account's own address).

**`nortbrand-prod` (2026-11-14, lead's approval):** migration `20261114120000` pushed
(history 4/4); sign-ups off, OTP 6 digits / 600 s, 60 s between emails, 10 verifications
per 5 minutes, site URL `https://nortbrand.pt`. **Email (2026-11-14):** custom SMTP
through Resend with a sending-only key for `send.nortbrand.pt` (`supabase-auth-production`,
created through Resend's API, stored only in Supabase), sender
`NortBrand <hello@send.nortbrand.pt>`, the Magic Link template and subject, 30 emails an
hour.

**Team migration and first admins (2026-11-14, lead's approval):** `20261115120000_portal_team_access` pushed to `nortbrand-dev` and `nortbrand-prod` (history 5/5 on both). The lead (Kennedy Freitas) is the first admin in both projects, created with `pnpm portal:bootstrap-admin` and the bootstrap SQL run through the Management API; prod's secret key was held only in memory for that run.

**Team portal (#132):** set `SUPABASE_SERVICE_ROLE_KEY` (the project's secret key) in
Vercel for Production (prod key) and Preview (dev key), marked Sensitive, and in your
`.env.local` for local work. Without it the site builds and runs, but inviting and
removing teammates refuse to run. Then create each project's first admin
(docs/guides/portal.md § 7).

The local stack gets the same settings from `supabase/config.toml`. Nothing here costs
money on the current plans.

**Milestones and files storage (2026-11-14, lead's approval):** `20261116120000_portal_milestones_and_files_storage` pushed to `nortbrand-dev` and `nortbrand-prod` after #135 merged (history 6/6 on both; private `portal-files` bucket, 50 MB, read rule `portal_files_read`, RLS on `project_milestones`, checked by query). The CLI is linked back to `nortbrand-dev`.

**Portal migrations pushed (2026-11-13, lead's approval):** `20261113120000_portal_schema`
to `nortbrand-dev`, checked, then to `nortbrand-prod`. Both histories match the repository
(3/3), and the public key is refused on every portal table (401 / `42501`). The CLI is
linked back to `nortbrand-dev`.

**If `supabase db push` fails with "Failed to create login role … connection timeout"
(status 544)** while the dashboard says healthy: the project's database has stopped
answering Supabase's own API. Restart the project (**Project Settings → General → Restart
project**); it keeps all data. This happened to `nortbrand-dev` on 2026-11-13.

### Keep-alive (Free plan trial, #101)

**Why.** Supabase pauses Free projects after about a week of low activity. While
`nortbrand-prod` is paused, every consultation request shows _Send failed_ and every
newsletter signup fails. Pro removes pausing contractually; the lead chose to try Free
first (#45, review by **31 March 2027**) and accepted two risks for the trial: Supabase can
still pause the project at its discretion (the keep-alive makes that unlikely, not
impossible), and Free has **no automatic backups**. Both are in `docs/tech-debt.md`.

**How it works at runtime.** Two schedulers call the same route every day, 12 hours
apart, so one failing never leaves a week without activity:

```
06:00 UTC  Vercel Cron (vercel.json) ──┐   the Production deployment, whatever its domain
                                       ├─► GET <site>/api/health/newsletter
18:17 UTC  GitHub Actions ─────────────┘        │   KEEPALIVE_URL, else https://nortbrand.pt
           (.github/workflows/keepalive.yml)    ▼
                                    unsubscribe_newsletter RPC with a probe token
                                    (healthcheck@nortbrand.invalid): a real query,
                                    writes nothing, not rate-limited
                                                │
                                    200 {"status":"ok"}  or  503 {"status":"error",…}
```

The route already existed (#36) to check that `NEWSLETTER_TOKEN_SECRET` matches Vault, so
the ping costs no new code and no migration, and doubles as a daily check of the secrets.

**Alerting.** Vercel Cron only logs its result. The GitHub workflow is the alarm: anything
but a 200 (after three retries 20 s apart, which cover a cold start) fails the run, and
GitHub emails the repository owner. A failure means one of: the database is paused or down,
the secrets no longer match, or the site is down. In each case look at the run's error
line (it shows the response body: a status and a Postgres error code, never personal data),
then the Supabase dashboard. A paused project is woken with **Restore**.

**Files.**

| File                              | Why                                                                                                                                                                                                                                 |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `vercel.json`                     | The `crons` entry. Vercel runs crons on Production deployments only, so previews never ping. Daily is also the Hobby limit, should the plan ever change.                                                                            |
| `.github/workflows/keepalive.yml` | Daily at 18:17 UTC (off the hour: GitHub delays runs at :00) and on demand (**Actions → Supabase keep-alive → Run workflow**). No checkout and no secrets; `permissions: {}`. Private repo, so the schedule is never auto-disabled. |

**Configuration, before and after launch.** The workflow calls `https://nortbrand.pt`
(ADR-008) unless the repository variable `KEEPALIVE_URL` is set (Settings → Secrets and
variables → Actions → Variables).

- **10–11 November:** `KEEPALIVE_URL=https://nort-brand-ruby.vercel.app` (the public
  production alias) while the domain served nothing, so `nortbrand-prod`, created on
  8 November, never went a week without activity.
- **Since 11 November** the domain is live (#85), so the variable is deleted and the
  workflow calls `nortbrand.pt`; a manual run returned `{"status":"ok"}`. The Vercel cron
  needed no change: it always calls the Production deployment. Set the variable again only
  to point the check somewhere else on purpose.

**Supabase's own warning.** Supabase emails the organisation owner before it pauses a
project. Make sure that address is an inbox someone reads; that email is the last chance
to act if both pings have been failing.

**Ending the trial.** By 31 March 2027, decide: stay on Free (keep all of this), or move
`nortbrand-prod` to Pro in the dashboard. On Pro, delete the `crons` entry and the
workflow, or keep the workflow purely as an uptime alarm, and remove the tech-debt entry.

## 3. Resend

**Now (free tier).** Create the account, then do steps 4–6 below with a single
`nortbrand-preview` key. Without a verified domain Resend sends only from
`onboarding@resend.dev`, and only to the account's own email address. So set
`NOTIFY_TO_EMAIL` to that address, set `EMAIL_FROM` to `NortBrand <onboarding@resend.dev>`, and
test visitor confirmations with that address too. Any other
recipient is refused. The free tier allows 100 emails a day.

**Done 8 November (#45).** Steps 1–3 and the `nortbrand-production` key, after the domain was bought.

1. **Domains → Add Domain:** `send.nortbrand.pt` (a sending subdomain keeps the main
   domain's reputation separate). Region: **EU (Ireland)**.
2. Add the records Resend shows, at Dynadot (**DNS Settings → Dynadot DNS → Subdomain
   Records**). Copy each value from Resend: it changes its record set from time to time.
   As of 8 November 2026 it was:

   | Subdomain (Dynadot adds `.nortbrand.pt`) | Type  | Value                                |
   | ---------------------------------------- | ----- | ------------------------------------ |
   | `resend._domainkey.send`                 | TXT   | the DKIM key, `p=MIG…IDAQAB`         |
   | `rsend.send`                             | CNAME | `rsend-euw1.forge.rmta.net` (SPF)    |
   | `send.send`                              | CNAME | `send.forge.rmta.net` (SPF, bounces) |
   | `_dmarc`                                 | TXT   | `v=DMARC1; p=none;` (see step 3)     |
   - `send.send` is right: it becomes `send.send.nortbrand.pt`. Typing the full name
     makes `….nortbrand.pt.nortbrand.pt`.
   - Leave **Enable receiving** off in Resend. The site only sends, so there is no MX.
   - TTL 300 (or blank); **Dynamic DNS** off; then **Save DNS**.
   - The domain was bought on Dynadot's parking page. Switch **Dynadot Parking** to
     **Dynadot DNS** (same nameservers, `ns1/ns2.dyna-ns.net`), never to **Name
     Servers**, which hands the zone to another provider. The root stays empty until
     launch day ([Go-live](./go-live.md) § 3).
   - Check before pressing **Verify**, straight from Dynadot's nameserver (no cache):
     `nslookup -type=TXT resend._domainkey.send.nortbrand.pt ns1.dyna-ns.net`, and the
     zone's `serial` (`nslookup -type=SOA nortbrand.pt ns1.dyna-ns.net`) goes up on
     every save.

   Wait for **Verified**. Once it is, set Preview's `EMAIL_FROM` to
   `NortBrand <hello@send.nortbrand.pt>` too, so preview mail reaches any address.

3. DMARC on the root domain, if none exists: `v=DMARC1; p=none;`, optionally with
   `rua=mailto:<your inbox>` for weekly reports. Tighten to `p=quarantine` after a few
   weeks of clean reports.
4. **Segments → Create:** "Newsletter". Copy its ID (`RESEND_SEGMENT_ID`). Then
   create two string **contact properties**, `locale` (fallback `en`) and `unsubscribe_url`.
   The newsletter sets both on every confirmed contact (docs/guides/newsletter.md).
   Properties are field definitions, not contacts: the **Add contact** form asks for an
   email and is the wrong screen. Use the Properties screen beside Contacts and Segments,
   or the API with that environment's key:

   ```ts
   await resend.contactProperties.create({
     key: "locale",
     type: "string",
     fallbackValue: "en",
   });
   await resend.contactProperties.create({
     key: "unsubscribe_url",
     type: "string",
   });
   ```

5. **API Keys:** create two **Full access** keys, `nortbrand-production` and
   `nortbrand-preview`. Full access is needed because the newsletter adds and removes
   contacts; sending-only keys cannot. Each key is stored only in Vercel (and the preview
   key in your `.env.local`). Resend shows a token once, so create the production key
   straight into Vercel without copying it anywhere: with the preview key,
   `POST https://api.resend.com/api-keys` `{ "name": "nortbrand-production",
"permission": "full_access" }` and pipe the returned `token` into
   `vercel env add RESEND_API_KEY --environment production --sensitive` (done this way on
   8 November).
6. Decide the team inbox for new requests (`NOTIFY_TO_EMAIL`).
7. **Webhooks → Add Webhook** (once the site has a URL, #45), one per environment:
   - Endpoint: `https://<site>/api/newsletter/resend-webhook`.
   - Events: **contact.updated** only. Other events are acknowledged and ignored, so
     subscribing to more only adds traffic.
   - Copy the **signing secret** (`whsec_…`) into `RESEND_WEBHOOK_SECRET` for that
     environment, and redeploy.
   - Check it from the webhook's attempts log: unsubscribe a test contact in Resend and
     look for **200**. A **401** means the secret is wrong; a **500** means the database or
     Resend failed and Resend will retry (docs/guides/newsletter.md).

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

1. Create a GA4 property and a **Web** data stream for `https://nortbrand.pt`. Copy the
   measurement ID (`G-…`).
2. **Data collection:** Google Signals **off**; granular location and device data **off**.
3. **Data retention:** 2 months.
4. **Ads personalization:** off for all regions.
5. **Data streams → Web → Enhanced measurement:** under _Page views_, turn **off** "Page
   changes based on browser history events". The site sends its own page view on every
   navigation, with the path only (#43); leaving this on would double-count, and GA's own
   page views would include the query string.

The code also switches off Google Signals and ad personalization in the tag config, and
never sends personal data (docs/guides/consent.md › Analytics). **Decided 8 November:**
Production and Preview share one property (`G-JW9ZV63FH4`), so testers who click Accept
on a preview appear in it. Use one property for
production. For preview and development, either leave `NEXT_PUBLIC_GA_MEASUREMENT_ID` on a
separate test property or accept that testers who click Accept appear in it.

## 6. Secrets you generate

Each needs at least 32 characters. Generate one per environment:

```sh
openssl rand -base64 48
```

| Variable                   | Purpose                                                                                                           |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `IP_HASH_SALT`             | Salts visitor IP hashes. Changing it resets rate limits.                                                          |
| `NEWSLETTER_TOKEN_SECRET`  | Signs confirm and unsubscribe links. Changing it voids links already sent. Also stored in Supabase Vault (below). |
| `SANITY_REVALIDATE_SECRET` | Verifies the Sanity webhook (§ 9).                                                                                |

The database verifies newsletter tokens itself (#36), so each Supabase project needs the
same `NEWSLETTER_TOKEN_SECRET` in Vault. Preview and Development both use `nortbrand-dev`,
which holds one Vault value, so **they share one secret**; Production has its own. In the dashboard, open **SQL Editor** and run, with
that environment's value:

```sql
select vault.create_secret('<NEWSLETTER_TOKEN_SECRET>', 'newsletter_token_secret');
```

The value comes first and the name second. Then open `/api/health/newsletter` on that
environment (locally `http://localhost:3000/api/health/newsletter`): `{"status":"ok"}`
means Postgres verified a token the app signed. `secret_mismatch` means the two values
differ; `error` with code `P0001` means the Vault entry is missing or misnamed.

To rotate it later, use `vault.update_secret` with the secret's id, and change the env
variable at the same time. For the local stack, run the same statement in Studio
(`http://127.0.0.1:54323`) after every `pnpm db:reset`. Details: [Database](./database.md).

## 7. Which value goes where

Set these in **Vercel → Settings → Environment Variables**, choosing the environment
column for each value. Development is what `vercel env pull` writes into `.env.local`.
Until Vercel exists (#45), copy `.env.example` to `.env.local` and fill in the Development
column by hand.

| Variable                        | Production                            | Preview                             | Development (`.env.local`)          |
| ------------------------------- | ------------------------------------- | ----------------------------------- | ----------------------------------- |
| `NEXT_PUBLIC_SITE_URL`          | `https://nortbrand.pt`                | `https://nortbrand.pt`¹             | `http://localhost:3000`             |
| `NEXT_PUBLIC_SUPABASE_URL`      | prod project URL                      | dev project URL                     | dev URL, or local²                  |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | prod publishable key                  | dev publishable key                 | dev key, or local²                  |
| `RESEND_API_KEY`                | `nortbrand-production` key            | `nortbrand-preview` key             | `nortbrand-preview` key             |
| `RESEND_SEGMENT_ID`             | Newsletter segment                    | same                                | same                                |
| `RESEND_WEBHOOK_SECRET`         | production webhook secret             | preview webhook secret              | any `whsec_` value                  |
| `EMAIL_FROM`                    | `NortBrand <hello@send.nortbrand.pt>` | `NortBrand <onboarding@resend.dev>` | `NortBrand <onboarding@resend.dev>` |
| `NOTIFY_TO_EMAIL`               | team inbox                            | your own inbox                      | your own inbox                      |
| `IP_HASH_SALT`                  | generated                             | generated (different)               | any 32+ characters                  |
| `NEWSLETTER_TOKEN_SECRET`       | generated                             | same as Development⁴                | generated, also in dev Vault        |
| `SUPABASE_SERVICE_ROLE_KEY`     | prod secret key (from #132)           | dev secret key                      | dev secret key, or local²           |
| `NEXT_PUBLIC_SENTRY_DSN`        | DSN                                   | DSN                                 | empty (off)                         |
| `SENTRY_AUTH_TOKEN`             | token                                 | token                               | not set                             |
| `SENTRY_ORG`, `SENTRY_PROJECT`  | slugs                                 | slugs                               | not set                             |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | `G-…`                                 | `G-…`                               | `G-…`                               |
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | `p4bc960d`                            | same                                | same                                |
| `NEXT_PUBLIC_SANITY_DATASET`    | `production`                          | `development`³                      | `development`³                      |
| `SANITY_API_READ_TOKEN`         | Viewer token (§ 9)                    | Viewer token (its own)              | Viewer token (your own)             |
| `SANITY_REVALIDATE_SECRET`      | generated                             | generated (different)               | any 32+ characters                  |

1. Previews keep the production site URL on purpose: canonical links and `hreflang` must
   never point at a preview, and previews are `noindex` already (`docs/guides/seo.md`).
2. `pnpm db:start` prints a local API URL and anon key. Use them to work without touching the
   dev project.
3. Only Production reads the `production` dataset, so test posts never reach the live
   site (§ 9). To work on live content from your machine before the site has a URL,
   stop any server on port 3000, then start one for that session only:
   `$env:NEXT_PUBLIC_SANITY_DATASET = "production"; pnpm dev` (PowerShell). Check that
   the Studio's top-left corner says **production**, and close that terminal afterwards.
   Never change `.env.local` for it.
4. Both point at `nortbrand-dev`, whose Vault holds one value (§ 6). If they differ,
   `/api/health/newsletter` on the preview answers `secret_mismatch`.

### Entering values

Every mistake in the first preview (7 November) was in how a value was entered, and each
stopped the build or the newsletter check:

- **Type short values by hand.** A pasted `https://nortbrand.pt` carried an invisible
  zero-width space, and `src/env.ts` rejected it as an invalid URL.
- **Match the format.** `EMAIL_FROM` is `Name <address>` or a plain address; a bare
  `<address>` fails.
- **Copy the value Next uses.** `.env.local` may wrap a value in quotes or backticks, which
  Next strips. Paste only what is inside them, or Vercel gets two extra characters.
- **Sensitive values can't be read back**, from the dashboard or `vercel env pull` (it
  returns a short placeholder). Check a secret by its effect instead: the build passing,
  `/api/health/newsletter` answering `ok`, a test email arriving.

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

- [x] A preview deployment of any branch builds (env validation passes). 7 November:
      8 pages in both languages answer 200 from the prerender cache, and
      `/api/health/newsletter` answers `ok`.
- [x] The same Sentry check on a preview appears under environment `preview` (8
      November), with no IP address, cookies or query string.
- [x] Resend shows the domain as Verified (8 November, `send.nortbrand.pt`, EU Ireland).
      A consultation request on the preview sent the team alert and the visitor
      confirmation from `hello@send.nortbrand.pt` to an address outside the Resend
      account; neither went to spam.
- [x] Production (8 November): `main` builds with every Production variable (51 pages,
      marketing pages static, release guard clear). On `nort-brand-ruby.vercel.app`:
      pages answer 200 from the CDN cache, `robots.txt` allows crawling with the
      sitemap, canonical points at `https://nortbrand.pt`, `/api/health/newsletter`
      answers `ok` from `dub1`.

> **The production alias is public before launch** (decided 8 November; see
> docs/tech-debt.md). Vercel's Standard Protection covers previews and deployment URLs,
> not production domains, and `nort-brand-ruby.vercel.app` is one.

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
- `supabase/config.toml` runs only Postgres and the API locally (plus Studio on
  `http://127.0.0.1:54323`): Realtime, Storage, Edge Functions, analytics and sign-ups are
  off (ADR-002). Analytics also fails its health check on Docker Desktop for Windows, which
  stops `db:start`.
- `pnpm db:types` writes `src/lib/supabase/database.types.ts` and formats it. The file is
  committed, so CI type-checks without Docker, and ESLint skips it because it is generated.
  Re-run it after every migration.

## 9. Sanity (ADR-003, #58)

Free plan. The blog's posts, authors and categories live here; everything else stays in
the repository.

1. **[sanity.io/manage](https://www.sanity.io/manage) → Create new project:**
   `nortbrand-website`, Free plan. Project id: `p4bc960d` (public; it ships in the
   client bundle).
2. **Datasets:** `production` (launch content) and `development` (local work, previews and
   test posts). Never point local work at `production`.
3. **API → CORS origins:** `http://localhost:3000` with credentials allowed (the embedded
   Studio needs it); add the production and preview origins in #45.
4. **API → Tokens:** a **Viewer** token, `nortbrand-website-read`, for
   `SANITY_API_READ_TOKEN` (server-only). One per environment; never in chat or the repo.
5. **`.env.local`:** `NEXT_PUBLIC_SANITY_PROJECT_ID=p4bc960d`,
   `NEXT_PUBLIC_SANITY_DATASET=development`, `SANITY_API_READ_TOKEN=<viewer token>`.
6. **Studio:** open `http://localhost:3000/studio` and sign in with your Sanity account.
   Editors are invited under **Members** (Free plan: up to 20 users).
7. **Region:** the Free plan does not let us choose where the content is hosted. Check
   the project's region under **Settings** and record it in docs/tech-debt.md (the brief
   prefers the EU).
8. **Webhook** (#59), one per deployed environment, set up with #45 (Sanity cannot reach
   `localhost`): **API → Webhooks → Create**:
   - URL `https://<site>/api/revalidate`, dataset `production` (or `development` for
     previews), HTTP method **POST**, API version `v2026-10-01`;
   - trigger on **create, update and delete**;
   - filter `_type in ["post", "author", "category", "translation.metadata"]`;
   - projection `{ _type }`;
   - **secret** = that environment's `SANITY_REVALIDATE_SECRET`.
     Without it, published changes appear only after the next deploy.
9. **Development seed:** `pnpm exec sanity login` once, then `pnpm sanity:seed` writes test
   authors, categories and posts into `development` only (sanity/seed/seed.mts).
10. **Editors** (#63): **Members → Invite** with the **Editor** role: they can write and
    publish but not change settings, tokens or webhooks. Only developers are
    Administrators. Send new editors the [editor guide](./editing-the-blog.md).
11. **Check the webhook** after setting it up (and after rotating
    `SANITY_REVALIDATE_SECRET`):
    1. In the Studio, change one word in a published post and publish it.
    2. **API → Webhooks → (the webhook) → Attempts log**: the newest attempt is **200**.
       A **401** means the secret in Sanity and the environment's
       `SANITY_REVALIDATE_SECRET` differ; a **400** means the projection is missing
       `_type`.
    3. Reload the post on the site: the change shows within a minute, with no deploy.
