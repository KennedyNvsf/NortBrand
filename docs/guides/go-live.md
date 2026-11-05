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

- [ ] Vercel Pro project set up ([Environments](./environments.md) § 1), with every
      **Production** variable from § 7 filled in. Values come from the password manager,
      never from chat.
- [ ] A **Production deployment of `main` is green** on its `*.vercel.app` URL. It runs
      the strict release guard, so this also proves the translations are final.
- [ ] Supabase `nortbrand-prod` created (§ 2). 🔒 Migrations pushed:
      `pnpm exec supabase link --project-ref <prod-ref>`, then
      `pnpm exec supabase db push`. 🔒 The Vault secret `newsletter_token_secret` set (§ 6).
      Free plan (lead's decision, #45): the Supabase owner email goes to an inbox someone
      reads, because it carries the "pausing soon" warning ([Environments](./environments.md)
      § 2, Keep-alive).
- [ ] Resend: `send.nortbrand.pt` shows **Verified**; the `nortbrand-production` key
      is in Vercel (§ 3).
- [ ] Sentry and GA4 values are in Vercel (§ 4, § 5).

**DNS preparation (T−2)**

- [ ] Write down the current DNS records for `nortbrand.pt` (a screenshot or export
      from the registrar). This is the DNS rollback.
- [ ] 🔒 Lower the TTL of the records you will change (apex `A`/`ALIAS` and `www`) to
      **300 seconds**, at least a day ahead, so the switch and any rollback spread in
      minutes.

## 3. Cut-over, in order (launch morning)

Do the steps in this order. Each one ends with its check; don't move on until it passes.

1. **Freeze `main`.** No merges until step 7 is done.
2. **Redeploy production.** Vercel → Deployments → the latest `main` → **Redeploy**
   (without the build cache). Check: green, and
   `https://<project>.vercel.app/api/health/newsletter` returns `{"status":"ok"}`.
3. **Add the domains on Vercel.** Settings → Domains:
   - `nortbrand.pt`, assigned to **Production**;
   - `www.nortbrand.pt`, **Redirect to** `nortbrand.pt` (308).

   Vercel then lists the DNS records each domain needs. Use the values it shows; they
   are not copied here because Vercel can change them.

4. 🔒 **Point DNS at Vercel**, at the registrar: the apex record and the `www` record,
   exactly as Vercel shows them. Leave every `send.*`, `_dmarc`,
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
- [ ] Keep-alive (#101): merge its pull request now that the domain answers. It is the one
      exception to the freeze: it changes no page, and its production deployment is what
      registers the cron. Wait for that deployment to be green, then **Actions → Supabase
      keep-alive → Run workflow**: the run is green and logs `{"status":"ok"}`. Vercel →
      Settings → Cron Jobs lists `/api/health/newsletter`; its first run (06:00 UTC) shows
      200 in the logs.
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
- **Day 2:** the keep-alive ran once from each scheduler: a green scheduled run under
  Actions, and a 200 from the Vercel cron in the logs.
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
