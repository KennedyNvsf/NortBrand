# CMS (Sanity)

The blog's content model and the embedded Studio (#58, ADR-003). Fetching, rendering and
revalidation come in #59; the editor how-to in #63.

## 1. What we built

- **A Sanity project.** `nortbrand-website` (`p4bc960d`), datasets `production` and
  `development`. Runbook: [Environments](./environments.md) § 8.
- **Three document types** in `sanity/schema-types/`: `post`, `author` and `category`.
  Blog content only; services, FAQ and page copy stay in `src/content/`.
- **The Studio**, embedded at `/studio`, inside this app.
- **Type generation**: `pnpm sanity:types` → `sanity/schema.json` +
  `src/lib/sanity/sanity.types.ts`.

## 2. The content model

| Type       | One document per | Fields                                                                                                                      |
| ---------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `post`     | language         | title, slug (unique per language), excerpt (≤ 220), cover + alt, category, author, publishedAt, body, SEO title/description |
| `author`   | person           | name, photo + alt, role and bio per language                                                                                |
| `category` | category         | name per language, slug (shared, used in `?category=`)                                                                      |

**Why two translation models.** A post is a document per language, linked to its
translation by `@sanity/document-internationalization` (ADR-003):

- each language has its own slug, title, excerpt and SEO fields;
- a post may exist in one language only.

A category name or an author's role is a short label, so it is one document with a value
per language (`sanity-plugin-internationalized-array`). A document per language there
would only add linking work.

**Body.** Portable Text with exactly what the post design shows:

- paragraphs, h2/h3 (the page's H1 is the title; the table of contents lists h2), quotes,
  bullet and numbered lists, bold, italic;
- links (https, mailto or relative only);
- images, each with alt text and an optional caption.

There is no raw HTML, no colours and no embeds.

**Alternative text is required** on the cover, body images and author photos; Sanity
refuses to publish without it (nb-se 2.1). `schema.test.ts` walks the whole schema, so a
new image field without alt text fails CI.

## 3. Files

- **`sanity/env.ts`.** Project id and dataset, read straight from `process.env`. The
  Sanity CLI bundles `sanity/` itself and does not know the `@/` alias. It throws with a
  pointer to the runbook when a value is missing.
- **`sanity/api-version.ts`.** A fixed API date, so a query's behaviour never changes
  under us. It sits apart from `env.ts`, so the schemas (and their tests) need no
  connection settings.
- **`sanity/languages.ts`.** `en` and `pt`. The test keeps them equal to the site's
  locales.
- **`sanity/schema-types/*.ts`.** The three types. The `post` slug's uniqueness check is a
  GROQ count within the same language, which allows `/en/blog/x` and `/pt/blog/x`.
- **`sanity.config.ts`.** The Studio: `basePath: /studio`, structure tool, both
  translation plugins. The plain "Post" template is removed, so every new post is created
  from a language template and always has a language.
- **`sanity.cli.ts`.** For `pnpm sanity:types`. The script runs the CLI with
  `node --env-file-if-exists=.env.local`, because the CLI only reads `SANITY_STUDIO_*`
  variables on its own.
- **`src/app/studio/[[...tool]]/`.** `page.tsx` renders `NextStudio`. `layout.tsx` is
  the Studio's own root layout: no site fonts, styles, providers or cookie banner, plus
  `noindex, nofollow`.

## 4. Keeping the Studio out of the site

- **Locale proxy.** It handles only the bare `/` (ADR-006), so `/studio` is never
  redirected.
- **Indexing.** `robots.txt` disallows `/studio`, and the Studio layout sets
  `noindex, nofollow`. It is not in `sitePages`, so it is not in the sitemap.
- **Bundles.** The Studio has its own root layout, so none of its code (`sanity`,
  `styled-components`) reaches the public pages.

## 5. Day-to-day

- **Change a schema** → `pnpm sanity:types` → commit `sanity/schema.json` and the types.
  CI does not regenerate them.
- **Add a language** → `sanity/languages.ts` and `src/i18n/routing.ts` together (the test
  checks).
- **Dev server.** The first `/studio` request compiles the whole Studio and can take
  several minutes on a busy machine. Production builds are unaffected.
