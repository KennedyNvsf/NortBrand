# Localization: how EN/PT works

**Covers:** Phase 1 i18n foundation, #3 (pseudo-localization, parity test, release
guard). **Decisions:** [ADR-006](../adr/006-next-intl-root-only-locale-detection.md).

## 1. What we built

The site exists twice, once in English and once in Portuguese. Every page lives under a
language prefix (`/en/services`, `/pt/services`). The text on a page never sits in the
components; it comes from a dictionary file per language. While the real Portuguese
doesn't exist yet, a script fills the PT dictionary with marked placeholder text, and a
guard blocks a launch build that still contains any.

## 2. What happens when someone visits

```
Visitor types nortbrand.pt/
        │
        ▼
src/proxy.ts  (runs ONLY for "/")
   1. NEXT_LOCALE cookie?  → use it (they chose a language before)
   2. Accept-Language?     → browser says "en-GB"? use en
   3. nothing matches      → pt
        │  307 redirect
        ▼
/en  or  /pt
        │
        ▼
src/app/[locale]/layout.tsx  → <html lang="en">
        │
        ▼
src/i18n/request.ts  → loads messages/en.json for this request
        │
        ▼
page.tsx  → t("title")  → "Minimalism, but functional."
```

**Key idea:** only the bare `/` is ever redirected. If someone opens `/en/services`
directly, from Google or a shared link, they get English even if their browser is
Portuguese. A link must always show what it says.

## 3. The files, one by one

### `src/i18n/routing.ts`: the single source of truth

```ts
export const routing = defineRouting({
  locales: ["en", "pt"],
  defaultLocale: "pt",
  localePrefix: "always", // every URL has /en or /pt
  localeCookie: { name: "NEXT_LOCALE" /* 1 year */ },
  alternateLinks: false, // we emit hreflang ourselves (see metadata.ts)
});
```

Everything else imports from this file: the proxy, navigation, the tests, even the
Playwright route list. To add a third language, this is where you start. Never hard-code
`["en", "pt"]` anywhere else.

### `src/proxy.ts`: the language negotiator

`proxy.ts` is what Next.js 16 calls middleware. We use next-intl's ready-made middleware,
but the important line is:

```ts
export const config = { matcher: ["/"] };
```

The matcher limits it to `/`. Without it, the middleware would run on every request:
slower, and it could redirect `/studio` (the Sanity CMS) or `/api` routes that have
nothing to do with languages. `src/proxy.test.ts` checks the three-step order: cookie,
then browser language, then `pt`.

### `src/app/[locale]/`: the URL segment

The folder name `[locale]` is a dynamic segment, so `/en` and `/pt` both render the
same files. In `layout.tsx`:

```ts
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale })); // [{locale:"en"},{locale:"pt"}]
}
```

This tells Next.js to build both versions as static HTML at build time. That's why the
build output shows `○ /en` and `○ /pt` (○ = static). Static pages are fast and cheap, so
if a page ever shows up as dynamic (ƒ) in the build output, something went wrong.

The layout also sets `<html lang={locale}>`. Screen readers use this to pick the right
voice and pronunciation, and Google uses it too.

### `src/i18n/request.ts`: loading the dictionary

For each request it works out the locale and dynamically imports
`messages/${locale}.json`. It also sets `timeZone: "Europe/Lisbon"`, so dates format
consistently on the server and in the browser.

### `messages/en.json` and `messages/pt.json`: the dictionaries

Namespaced by page or component:

```json
{ "Common": { "bookConsultation": "Book a Consultation" } }
```

In a server component:

```ts
const t = await getTranslations("Common");
t("bookConsultation"); // → "Book a Consultation"
```

**Type safety:** `src/i18n/app-config.d.ts` tells TypeScript that `en.json` is the shape
of all messages. Mistype `t("bookConsultaton")` and you get a **compile error**, not a
blank button in production. That's why `en.json` is called the reference catalog.

### `src/i18n/navigation.ts`: links that know the language

```ts
export const { Link, redirect, usePathname, useRouter } =
  createNavigation(routing);
```

Always import `Link` from `@/i18n/navigation`, **not** from `next/link`. This `Link`
adds the current locale automatically, so `<Link href="/services">` becomes
`/pt/services` on a PT page. Passing `locale="en"` switches language, and it also
updates the `NEXT_LOCALE` cookie, so the visitor's choice is remembered next time they
land on `/`.

### `src/i18n/metadata.ts`: telling Google about the twin pages

`localeAlternates("en", "/services")` returns:

```
canonical:  /en/services   ← "this page's own address"
en:         /en/services   ← hreflang alternates: "the same page in other languages"
pt:         /pt/services
x-default:  /pt/services   ← "for any other language, send them here"
```

Every page calls this in `generateMetadata`. Without hreflang, Google may treat EN and
PT as duplicate content, or show Portuguese users the English page. For the home page,
`x-default` points at `/` so the proxy can negotiate.

## 4. Placeholder Portuguese and the release guard (#3)

### The problem it solves

The professional Portuguese arrives late, but Portuguese is usually **about 30% longer**
than English. If we design only with English, buttons and headings break on launch
week. So we fake longer text **now**.

### `src/i18n/pseudo.ts`: the logic (pure functions, no file access)

```ts
pseudoLocalize("Close"); // → "[[Close ~~]]"
```

- `[[ ]]` markers make untranslated text visible on the page and easy to find with code.
- The `~` padding adds about 30% length. It's split into short runs (`~~~~ ~~~~`) so the
  text can still wrap across lines, like real words. One long `~~~~~~~~~~` would refuse
  to wrap and cause false overflow bugs.
- The English stays **unchanged inside**, so placeholders like `{name}` or
  `{count, plural, …}` keep working. If we had changed letters, we could have broken the
  ICU syntax.

`buildPseudoMessages(en, pt, { reset })` walks the English tree key by key:

- if PT already has a **real** translation for that key → keep it
- otherwise → make a pseudo string
- keys that exist only in PT → dropped, because English is the reference

Keeping real translations matters because the translator delivers in batches (UI strings
first, legal text last). Re-running the script must never wipe their work. `--reset` is
the "start over" button.

### `scripts/i18n-pseudo.mts`: the command

A thin wrapper that reads both JSON files, calls `buildPseudoMessages`, writes `pt.json`
and prints a count. The logic lives in `src/` and the script only handles file input and
output, so the logic can be unit-tested without touching real files.

It runs with plain `node`: Node 24 can strip TypeScript types itself, so we didn't add a
tool like `tsx`. The trade-off is that Node needs exact file paths, so these files import
`./pseudo.ts` with the extension, which is why `tsconfig.json` has
`allowImportingTsExtensions`.

### `src/i18n/messages.test.ts`: the parity checks

1. **Keys.** It flattens both files to key lists (`Common.close`, `Home.title`, …) and
   compares them. If someone adds a key to `en.json` and forgets to run the script,
   `pnpm test` fails and lists exactly which key is missing.
2. **Placeholders and tags (#76).** For every key it compares what a translation must
   carry over unchanged: the ICU argument names (`{year}`, the `count` in
   `{count, plural, …}`) and the rich-text tags (`<green>`, `</red>`). A translator who
   translates `{year}` to `{ano}`, or drops a `<green>`, would break that string at runtime
   (a formatting error, or a highlight that silently vanishes); the test catches it
   first and names the key. Plural keywords (`one`, `other`) and the words inside branches are ignored,
   because those are translated.

### `src/i18n/release-guard.ts`: the launch safety net

```
pnpm build                     → ⚠ warning, lists pseudo keys, build succeeds
RELEASE_BUILD=1 pnpm build     → ✖ build FAILS
VERCEL_ENV=production          → ✖ build FAILS (Vercel sets this automatically)
pnpm check:release             → ✖ always strict, for a pre-launch check
```

It's called from `next.config.ts`, which runs at the start of every build. Two details
worth understanding:

1. **`phase === PHASE_PRODUCTION_BUILD`**: it only runs on builds, not on `pnpm dev`,
   because dev shouldn't nag you on every save.
2. **`RELEASE_GUARD_CHECKED` env flag**: Next.js loads `next.config.ts` more than once
   during a build, in its worker processes. Without the flag, the warning printed twice.
   The first run sets the flag, and the workers inherit it and skip the warning. In
   strict mode we always check, because failing is what matters there.

**Consequence:** a production deployment fails whenever a pseudo string is left. Since the
first full translation (#76) the guard passes, so an English change that hasn't been
translated yet blocks production until its Portuguese arrives. That is intended: it is
what stops English text from shipping on the Portuguese site.

## 5. How the tests protect this

| What could go wrong                   | What catches it                                                 |
| ------------------------------------- | --------------------------------------------------------------- |
| Proxy redirects the wrong way         | `src/proxy.test.ts` (unit) + `tests/e2e/i18n.spec.ts` (browser) |
| Missing translation key               | `src/i18n/messages.test.ts`                                     |
| Translation breaks `{year}` or a tag  | `src/i18n/messages.test.ts` (placeholders and tags)             |
| Pseudo string breaks `{placeholders}` | `src/i18n/pseudo.test.ts`                                       |
| Partial translation gets wiped        | `src/i18n/pseudo.test.ts` ("keeps real translations")           |
| Launch with fake Portuguese           | release guard + `src/i18n/release-guard.test.ts`                |
| Page missing hreflang or wrong `lang` | page harness `tests/e2e/pages.spec.ts`, every page × locale     |
| Long PT text breaks the mobile layout | page harness 390 px overflow check, on the real Portuguese      |
| A copy change breaks an e2e spec      | specs read copy through `tests/e2e/copy.ts`, not typed in       |

## 6. Day-to-day rules

1. **New text?** Add it to `en.json` under the right namespace, then run
   `pnpm i18n:pseudo`. Never type copy directly into a component.
2. **New link?** Import `Link` from `@/i18n/navigation`.
3. **New page?** Add `generateMetadata` with `localeAlternates(...)`, and add one line to
   `tests/e2e/routes.ts`.
4. **Changed the meaning of an English string that already has a real PT translation?**
   Delete the PT value, so it becomes pseudo again and goes back to the translator. The
   script can't detect this on its own.
5. **Before launch:** `pnpm check:release` must pass.

### Translation changes until launch (#76)

The first full translation is in, but copy can still change on either side until
30 November. Each change takes one of three routes:

| What changed                    | What you do                                                                                              | What protects it                                     |
| ------------------------------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| English wording, same meaning   | Edit `en.json` only (a typo, a comma). The Portuguese stands.                                            | Review                                               |
| English meaning, or a new key   | Edit `en.json`, delete the PT value, run `pnpm i18n:pseudo`. The key is now `[[…]]` for the translators. | Release guard: production can't ship it untranslated |
| Portuguese from the translators | Paste their values into `pt.json`, key for key. Never edit `en.json` in the same step.                   | `pnpm test`: keys, placeholders and tags             |

- **Finding what needs translating:** `pnpm build` lists every pseudo key; send the
  translators those keys with the English, never the whole file again.
- **Importing a batch:** run `pnpm test` (parity), then check the pages it touches at
  390 px in PT. Long Portuguese is the usual cause of overflow; the page harness catches
  it in CI (`tests/e2e/pages.spec.ts`).
- **Blog posts are not here.** They are translated in the Studio
  ([Editing the blog](./editing-the-blog.md)).

### Copy in e2e specs (`tests/e2e/copy.ts`)

When the real translation landed (#76), 16 specs failed although every page worked.
Each one had copy typed into it: an English heading the final copy had reworded, or a
Portuguese check that only passed because pseudo strings still contained the English
(`/Subscribe|\[\[/`). So a spec that names copy reads it from `messages/`:

```ts
import { copy, localeOf, tagText } from "./copy";

page.getByRole("button", { name: copy("pt", "Contact.form.submit") }); // "Enviar pedido"
copy("en", "Services.hero.title"); // rich-text tags dropped: "What your business needs…"
tagText("pt", "Newsletter.card.consent", "link"); // the text inside <link>: "Política de Privacidade"
localeOf("/pt/contact"); // "pt", for helpers that take a path
```

- `copy` throws on an unknown key, so a renamed key fails loudly instead of matching
  nothing.
- Fixture data (post titles, the `[PT]` marker, typed form values) stays literal: it
  comes from the fake backend, not from `messages/`.
- Older specs still type copy that hasn't changed. Move each to `copy()` when you next
  touch it, or when a copy change breaks it.
