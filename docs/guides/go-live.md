# Go-live runbook

**Covers:** #85, #98. **Depends on:** #45 (accounts, domain, Vercel Pro). **Decisions:**
ADR-005 (Vercel), ADR-006 (locales), ADR-008 (`nortbrand.pt` is the only domain).

How the site goes live on **Monday 30 November 2026**: what must be true beforehand, the
cut-over in order, the checks that prove it worked, and how to roll back. Account setup
itself is in [Environments](./environments.md); this guide links to its sections instead
of repeating them.

> **Approvals.** Every DNS change, every purchase, and every write to a production
> service (database migration, Sanity webhook, Search Console) needs the lead's approval
> in the conversation first (CLAUDE.md). Each one is marked **🔒** below.

## Status: the domain went live early (11 November)

The lead chose a **quiet cut-over 19 days before launch** (#85, 11 November): the domain
served nothing, the site was already public on the `vercel.app` alias, and proving DNS,
TLS and the integrations early makes launch day a non-event. Search Console and the
sitemap submission wait for launch day, so nothing asks Google to index draft copy.

| Step (§ 3)                   | State on 11 November                                                                                                                |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 3. Domains on Vercel         | ✅ `nortbrand.pt` and `www.nortbrand.pt` added and verified (the lead ran `vercel domains add`)                                     |
| 4. DNS at Dynadot            | ✅ apex `A` `216.198.79.1` and `64.29.17.1`; `www` `CNAME` `13f61df1485ef5de.vercel-dns-017.com` (TTL 300). Email records untouched |
| 5. TLS                       | ✅ certificates issued for both hosts                                                                                               |
| `www` → apex 308 redirect    | ⏳ lead, in Vercel → Settings → Domains                                                                                             |
| 6. Sanity CORS and webhook   | ⏳ lead: `https://nortbrand.pt` origin (credentials) and the `production` webhook                                                   |
| 6. Resend webhook            | ⏳ lead: `contact.updated` → `https://nortbrand.pt/api/newsletter/resend-webhook`                                                   |
| Keep-alive (#101)            | ✅ `KEEPALIVE_URL` deleted; a manual run called `https://nortbrand.pt/…` → `{"status":"ok"}`                                        |
| `nort-brand-ruby.vercel.app` | still public; redirect it to `nortbrand.pt` on launch day (step 3)                                                                  |
| 8. Search Console            | ⏸ launch day                                                                                                                        |

Checks run on 11 November against `https://nortbrand.pt`: `/` → 307 to `/pt` (or `/en`
with an English `Accept-Language`); `/en`, `/pt` and every nav page 200; health `ok`;
`robots.txt` allows crawling with the production sitemap; canonical and `hreflang` on
`/pt` point to `https://nortbrand.pt/…`.

**What's left for launch morning:** freeze `main`, merge the content tickets (#77, #78,
#79), redeploy, redirect the `vercel.app` alias, run § 4, then § 3 step 8 (Search Console).
Steps 3–5 of § 3 are already done.

## 1. The shape of launch day

| Domain              | Serves                                     | Set up where                          |
| ------------------- | ------------------------------------------ | ------------------------------------- |
| `nortbrand.pt`      | the site (production deployment of `main`) | Vercel domain + DNS at the registrar  |
| `www.nortbrand.pt`  | 308 → `nortbrand.pt`, same path            | Vercel domain setting ("Redirect to") |
| `send.nortbrand.pt` | Resend (email only, no website)            | Resend records, set up in #45         |

Both languages live on the one domain (`/en/…`, `/pt/…`), so the app has no host-based
redirects (ADR-008). `nortbrand.com` is someone else's domain: never add it anywhere.

## 2. Before the day (T−7 to T−1)

Each item is a ticket or a check. Launch waits until every box is ticked.

**Content and code**

- [ ] #77 final English copy, #78 reviewed Privacy and Terms, #79 contact details, #82
      image licences: merged.
- [ ] `pnpm check:release` passes on `main` (no pseudo translations, no draft legal
      text).
- [ ] #84 accessibility and QA audit: done. The Services hero video's WCAG 2.2.2
      exception is accepted (tech debt), not a blocker.
- [ ] `pnpm audit`: no critical or high finding outside the two CLI-only ones in tech
      debt ([Dependencies](./dependencies.md) § 4).
- [ ] The three launch posts in Sanity `production` have their final text and dates
      ([Editing the blog](./editing-the-blog.md)).

**Accounts (#45)**

- [x] Vercel Pro project set up ([Environments](./environments.md) § 1), with every
      **Production** variable from § 7 filled in (8 November, #45). Values come from the
      password manager, never from chat.
- [ ] A **Production deployment of `main` is green** on its `*.vercel.app` URL. It runs
      the strict release guard, so this also proves the translations are final. First
      green on 8 November (#45); recheck on the launch commit, after #77 and #78.
- [x] Supabase `nortbrand-prod` created (§ 2). 🔒 Migrations pushed:
      `pnpm exec supabase link --project-ref <prod-ref>`, then
      `pnpm exec supabase db push`. 🔒 The Vault secret `newsletter_token_secret` set (§ 6).
      Free plan (lead's decision, #45): the Supabase owner email goes to an inbox someone
      reads, because it carries the "pausing soon" warning ([Environments](./environments.md)
      § 2, Keep-alive).
      Done 8 November (#45); push again after any new migration.
- [x] Resend: `send.nortbrand.pt` shows **Verified**; the `nortbrand-production` key
      is in Vercel (§ 3).
- [x] Sentry and GA4 values are in Vercel (§ 4, § 5).
- [ ] Look through the consultation requests and newsletter rows in `nortbrand-prod`
      that arrived through the public `nort-brand-ruby.vercel.app` alias before launch
      (docs/tech-debt.md). Delete test and spam rows; keep real ones.

**DNS preparation (T−2)**

- [x] Write down the current DNS records for `nortbrand.pt`. This is the DNS rollback.
      Checked 11 November (#85), from public DNS: - Nameservers: `ns1.dyna-ns.net`, `ns2.dyna-ns.net` (Dynadot). Records are edited
      in the Dynadot dashboard, which only the lead can reach. - **No apex or `www` record exists.** Nothing is served on the domain today, so
      the cut-over adds two records and the rollback is deleting them; no old site
      comes back. - Email records, never to be touched: `_dmarc` TXT `v=DMARC1; p=none;`,
      `resend._domainkey.send` TXT (DKIM), `rsend.send` and `send.send` CNAME
      (Resend SPF and bounces). No MX.
- [x] TTL: the zone's default TTL is already **300 seconds**, so a new record or a
      rollback spreads in minutes. Nothing to lower.

## 3. Cut-over, in order (launch morning)

Do the steps in this order. Each one ends with its check; don't move on until it passes.

1. **Freeze `main`.** No merges until step 7 is done.
2. **Redeploy production.** Vercel → Deployments → the latest `main` → **Redeploy**
   (without the build cache). Check: green, and
   `https://<project>.vercel.app/api/health/newsletter` returns `{"status":"ok"}`.
3. **Add the domains on Vercel.** Settings → Domains:
   - `nortbrand.pt`, assigned to **Production**;
   - `www.nortbrand.pt`, **Redirect to** `nortbrand.pt` (308).
   - `nort-brand-ruby.vercel.app` (public since 8 November, docs/tech-debt.md):
     **Redirect to** `nortbrand.pt` (308), or remove it, once `nortbrand.pt` answers.

   Vercel then lists the DNS records each domain needs. Use the values it shows; they
   are not copied here because Vercel can change them.

   From a terminal (the CLI is installed and linked, `vercel whoami` → the lead's
   account), the same is:

   ```sh
   vercel domains add nortbrand.pt nort-brand --scope nort-brand
   vercel domains add www.nortbrand.pt nort-brand --scope nort-brand
   vercel domains inspect nortbrand.pt --scope nort-brand   # the records Vercel expects
   ```

   Set the `www` redirect in the dashboard (Settings → Domains → `www.nortbrand.pt` →
   **Redirect to** `nortbrand.pt`, 308). Claude Code's permission rules block domain
   commands, so the lead runs these, or allows them first.

4. 🔒 **Point DNS at Vercel**, in the Dynadot dashboard (Domains → `nortbrand.pt` → DNS
   settings): the apex record and the `www` record, exactly as Vercel shows them. Leave every `send.*`, `_dmarc`,
   `resend._domainkey.*` and MX record alone: they are the email.
   Check: both hosts show **Valid Configuration** on Vercel (minutes with a 300 s TTL).
5. **TLS.** Vercel issues the certificates by itself once DNS resolves. Check:
   `curl -sI https://nortbrand.pt/en` returns `200`, with no certificate warning, and
   `https://www.nortbrand.pt/en` redirects without one.
6. **Webhooks and CORS on the real domain:**
   - 🔒 **Sanity** ([Environments](./environments.md) § 9): add `https://nortbrand.pt`
     to **CORS origins** (credentials allowed). Create the production webhook to
     `https://nortbrand.pt/api/revalidate`, dataset `production`, with the production
     `SANITY_REVALIDATE_SECRET`. For previews, add the project's preview origin as a pattern
     (`https://nortbrand-*-<team>.vercel.app`; Sanity accepts `*` in an origin) and a
     second webhook on dataset `development`, the dataset previews read (§ 7).
   - 🔒 **Resend** (§ 3, step 7): the `contact.updated` webhook to
     `https://nortbrand.pt/api/newsletter/resend-webhook`, its secret in
     `RESEND_WEBHOOK_SECRET` (Production), then redeploy.
7. **Run the launch checks** (§ 4). When they pass, unfreeze `main`.
8. 🔒 **Search Console:**
   - Add a **Domain** property for `nortbrand.pt`. Verification is a DNS `TXT` record
     at the registrar (a DNS change: 🔒).
   - **Sitemaps → Add** `https://nortbrand.pt/sitemap.xml`. Check: status **Success**,
     with every page in both locales plus the posts.
   - **URL Inspection** on `https://nortbrand.pt/en` and `https://nortbrand.pt/pt` →
     **Request indexing**.

   Previews stay out of the index without doing anything: they're `noindex`, and their
   `robots.txt` disallows everything ([SEO](./seo.md)).

## 4. Launch checks

Run them against `https://nortbrand.pt`. Write the result next to each box in the launch
ticket (#85).

**Domains and routing**

- [ ] `curl -sI https://nortbrand.pt/` → `307`, `location: /pt` (or `/en` with an
      English `Accept-Language`). Only the bare `/` is negotiated (ADR-006).
- [ ] `/en` and `/pt` → `200`. Every page in the nav opens in both languages.
- [ ] `curl -sI https://www.nortbrand.pt/en/about` → `308` to
      `https://nortbrand.pt/en/about`.
- [ ] TLS valid on both hosts (no browser warning; `curl` without `-k` succeeds).

**Search and metadata**

- [ ] `/robots.txt` allows crawling and points to `https://nortbrand.pt/sitemap.xml`
      (a preview's disallows everything; production's must not).
- [ ] `/sitemap.xml` lists every page in both locales with `hreflang`, and the posts.
- [ ] View source on `/pt`: canonical and `hreflang` (en, pt, x-default) point to
      `https://nortbrand.pt/…`, and there is no `noindex`.

**Forms and email** (with your own address)

- [ ] `/api/health/newsletter` → `{"status":"ok"}`.
- [x] Keep-alive (#101): the `KEEPALIVE_URL` variable was deleted on 11 November, when
      the domain went live, and a manual run called `https://nortbrand.pt/…` →
      `{"status":"ok"}`. On launch day just confirm the last scheduled run is green.
- [ ] Send the consultation form in PT. The confirmation email arrives in Portuguese, and
      the team alert reaches `NOTIFY_TO_EMAIL`. The row is in `nortbrand-prod` with
      `notified_at` set. Afterwards, set its status to `spam` in the dashboard so it never
      counts.
- [ ] Subscribe to the newsletter, confirm from the email, then unsubscribe from the
      link. Each step shows its page. In `nortbrand-prod` the row ends `unsubscribed`;
      in Resend the contact is gone.
- [ ] Resend webhook: in Resend, mark a test contact unsubscribed. The webhook's attempts
      log shows **200**.

**Content and monitoring**

- [ ] Change one word in a published post in the Studio, publish it: the Sanity webhook's
      attempts log shows **200**, and the site shows the change within a minute, without
      a deploy. Change it back.
- [ ] Sentry: the error check from [Environments](./environments.md) § 8 appears under
      environment `production`, with no IP or query string.
- [ ] Consent: **Reject** makes no request to Google (DevTools → Network). **Accept**
      shows you in GA4 **Realtime**.

## 5. Rollback

Pick the smallest step that fixes the problem.

| Problem                                                 | Do this                                                                                                                                                                                                                                                                                            | Takes   |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| A bad deploy (broken page, failing form)                | Vercel → Deployments → the previous good production deployment → **Instant Rollback**. Then fix forward through a normal ticket and PR.                                                                                                                                                            | Seconds |
| One webhook misbehaving                                 | Disable that webhook in Sanity or Resend. Posts then update only on the next deploy. Resend unsubscribes made while it's off don't reach the database by themselves: replay them from the webhook's event log once it's back on.                                                                   | Seconds |
| The domain doesn't work and the old site must come back | 🔒 Restore the DNS records written down in § 2. With a 300 s TTL most visitors see the old site within minutes. Remove the domains from Vercel only afterwards.                                                                                                                                    | Minutes |
| A database problem                                      | Never roll a migration back in production. Ship a new migration that fixes it (dev first), through a PR. Restoring a Supabase backup is the last resort; what's available depends on the plan chosen for `nortbrand-prod` in #45 ([Environments](./environments.md) § 2), so check it on that day. | Hours   |

Every rollback gets a ticket afterwards, saying what happened, why, and the follow-up.

## 6. After launch (first two weeks)

- **Day 1–3:** watch Sentry, Vercel's function logs and both webhook attempt logs daily.
- **Day 2:** the keep-alive's scheduled run against `nortbrand.pt` is green under Actions,
  and the Vercel cron shows a 200 in the logs.
- **Day 3:** Search Console → Pages: both locales are being indexed; no "Duplicate
  without user-selected canonical" on `/en` vs `/pt`.
- **Day 7:** raise the DNS TTLs back to their normal value (for example 3600 s). 🔒
- **Week 2+:** once DMARC reports are clean, tighten `_dmarc` from `p=none` to
  `p=quarantine` ([Environments](./environments.md) § 3). 🔒
- **Ongoing:** run `pnpm audit` before each production deploy
  ([Dependencies](./dependencies.md)).

## 7. Who does what

| Step                                   | Who                                      | Needs approval                                                |
| -------------------------------------- | ---------------------------------------- | ------------------------------------------------------------- |
| Buying the domain and Vercel Pro (#45) | Lead                                     | Yes (cost)                                                    |
| Environment variables in Vercel        | Lead (holds the secrets)                 | No                                                            |
| DNS records, TTLs, Search Console TXT  | Lead, or Claude with approval per change | Yes                                                           |
| Production migrations, Vault           | Claude or lead                           | Yes                                                           |
| Sanity and Resend webhooks, CORS       | Claude or lead                           | Yes                                                           |
| Deploys, rollbacks, launch checks      | Claude or lead                           | Rollback: no (it's the safe direction); deploys follow merges |
