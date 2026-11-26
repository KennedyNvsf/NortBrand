# Legal pages

**Covers:** #13, #78 (reviewed text). **Design source:** Figma 09 — Legal (`323:2`): Privacy `323:3`, Terms
`323:121`, tablet `379:2407` / `379:2733`, mobile `379:2572` / `379:2891`.

## 1. What we built

`/en/legal/privacy`, `/en/legal/terms` and their `/pt/…` versions, all static. One
layout serves both:

```
Header    LEGAL · H1 (keyword underlined green) · intro · "Last updated: <date>"
Article   01–0n numbered H2 sections with anchor ids; bullet list where needed
Sidebar   sticky "On this page" + "Questions about this page?"   (desktop only)
          below desktop the list is dropped and the questions note follows the article
```

Since #78 the text is the **reviewed** Privacy Policy and Terms of Use (lead, 26
November 2026); both documents are `status: "reviewed"` and dated 25 November. Until
then it was Figma's placeholder copy with bracketed "[… to be confirmed]" notes (§ 6).

## 2. Where the code lives

```
src/content/legal.ts                       structure: section ids/keys, items, date, status
src/app/[locale]/(site)/legal/
   privacy/page.tsx · terms/page.tsx       metadata + <LegalDocument copy={…}>
   _components/legal-copy.tsx              privacyCopy(), termsCopy(), emailTag
   _components/legal-document.tsx          the shared layout (server)
src/components/site/table-of-contents.tsx  "On this page" (client; reusable for blog posts)
scripts/check-release.mts                  now also fails on draft legal documents
```

## 3. How it works

### Structure in content, words in messages

`legal.ts` says _what_ each document contains: section `id` (the anchor), `key` (where
its copy lives), optional bullet `items`, the `updated` date and a `status`. The
words are in `messages/en.json` under `Legal.privacy` / `Legal.terms`, so translators
work in the same place as everywhere else.

The contact email is **never typed into the legal text** (`CLAUDE.md`: contact details
live only in `site.ts`). Messages say `You can reach us at <email></email>.`, and
`emailTag` renders a `mailto:` link to `site.contact.email`. A unit test fails if an
`@` appears anywhere in the `Legal` messages.

### Why one copy builder per document

The first version had one shared function building keys like
`${document}.sections.${key}.title`. next-intl types every message key, and TypeScript
rejected that template. It can't prove that every document/section combination exists,
and some don't: Terms has no `whoWeAre`. The options were a cast, which hides real
mistakes, or a small builder per document. `privacyCopy()` and `termsCopy()` each work
inside their own namespace, where every key is checked, and they return plain data
(`LegalCopy`). `LegalDocument` only renders that data, so the layout exists once.

### "Last updated"

`format.dateTime(new Date(updated), { dateStyle: "long", timeZone: "Europe/Lisbon" })`
gives "October 4, 2026" in EN and "4 de outubro de 2026" in PT, at build time. No date
library is needed (`CLAUDE.md`: no date library).

### "On this page"

`TableOfContents` is the page's only client component.

- **Links:** plain `<a href="#id">`, so they work before JavaScript loads.
- **Active link:** a passive scroll listener (throttled to one update per animation
  frame) marks the last section whose top has passed a reading line just below the
  sticky header. At the very bottom of the page the last section is always active,
  even if it is short.
- **How "active" is shown:** `aria-current="location"`, plus a red rule and SemiBold
  text, never colour alone.
- **Section ids:** each has `scroll-mt-28`, so a jump lands below the sticky header.

The sidebar is `position: sticky; top: 112px`. Near the end of the article it scrolls
away with its column, which is normal sticky behaviour.

## 4. The launch guard

`status: "draft"` on a document makes `pnpm check:release` exit 1 with
`legal text awaiting review: privacy, terms`, next to the existing pseudo-translation
check. When the reviewed text arrives:

1. replace the copy in `messages/en.json` (and the PT translation)
2. remove the bracketed notes
3. set `updated` to the review date and `status: "reviewed"`

## 5. Tests

- `src/content/legal.test.ts`:
  - every section and list item has copy, and nothing extra
  - section ids are unique
  - no email address is typed into the messages
  - both documents are reviewed, and `draftLegalDocuments()` still reports a draft
- Page harness: both routes in EN and PT (axe, one H1, canonical, hreflang, no
  overflow).
- `tests/e2e/legal.spec.ts`:
  - H1 and the H2 count inside `<main>` (the footer has its own H2s)
  - the three email links and the localised date (25 November 2026)
  - the TOC following the reader on desktop
  - the questions note below the article on mobile

## 6. The reviewed text (#78)

**What changed.** The lead's reviewed Privacy Policy and Terms replaced the Figma drafts
on 26 November:

- **Privacy** now lists, one bullet each: what is collected (requests, newsletter,
  client area, analytics with consent, hashed IP and scrubbed error reports), the GDPR
  basis for each use, every cookie with its lifetime (`nb_consent`, `NEXT_LOCALE`,
  `nb_portal_session`, the Supabase session cookie, `_ga*`), every processor and its
  region (Vercel, Supabase, Resend, Sentry, Google, Sanity) and how long each kind of
  data is kept. "Who we are" names the self-employed business and its NIF (public on
  purpose, lead's decision).
- **Terms** settle disputes in the courts of the Braga judicial district.
- `legal.ts` gains the new list items, `updated: "2026-11-25"` and `status:
"reviewed"` on both documents, so `pnpm check:release` no longer fails on legal text.

**Checked against the build.** Each factual line was compared with the code and the
accounts before merging: cookie names and lifetimes (`consent.ts`,
`src/i18n/routing.ts`, `session-marker.ts`, Settings' 1–90 day options), the function
region (Dublin), Supabase `eu-west-1`, Resend EU, Sentry's EU storage and scrubbing
(`src/lib/sentry.ts`), GA4 retention of 2 months ([Environments](./environments.md)).
One line was corrected: the portal session length is set by the project team in team
Settings, not chosen by the client.

**Retention is done by hand** (lead's decision, 26 November). Nothing deletes data on a
schedule. The two promises that need a person are:

| Data                                             | Promise                                         | Routine                                                                                                                                                |
| ------------------------------------------------ | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Consultation requests that don't become projects | deleted after 12 months                         | monthly: delete `consultation_requests` rows older than 12 months in the Supabase SQL editor (production)                                              |
| Client area data                                 | deleted 12 months after the project is archived | monthly: in the team portal, delete projects archived more than 12 months ago (Manage project → Delete; files and orphaned client accounts go with it) |

The other periods are enforced by the services themselves: GA4 (2 months), the rate-limit
log (pruned after an hour), unsubscribes (`unsubscribe_newsletter` removes the Resend
contact). The routine is on the go-live checklist (§ 6, "Ongoing").

**Changing the text later:** edit `Legal.*` in both message files (keys and list items
must match `legal.ts`; a unit test checks), set `updated` to the new date, and keep
`status: "reviewed"` only for reviewed text.
