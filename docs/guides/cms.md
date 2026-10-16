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

## 6. The content layer (#59)

```text
Server Component → src/features/blog/data.ts ("use cache", cacheTag, cacheLife "max")
                 → getSanityClient() (server-only, read token, published, no CDN)
                 → GROQ from queries.ts (typed by pnpm sanity:types)
Editor publishes → Sanity webhook → POST /api/revalidate (signature first)
                 → revalidateTag("blog-list" | "blog-posts", { expire: 0 })
```

- **`queries.ts`**: every GROQ query, as `defineQuery`, so TypeGen types each result.
  - Listing: count plus one page; latest or oldest.
  - A post: its translations come from the plugin's `translation.metadata`.
  - Related posts, categories, and all slugs (static params and the sitemap).
  - Card fields are one projection, shared by every card.
- **`listing-params.ts`**: the URL state (`q`, `category`, `sort`, `page`) is untrusted, so
  zod bounds it. Anything malformed falls back to its default. Search words become
  prefix patterns (`bra*`), and a typed `*` is removed. Values only ever reach GROQ as
  parameters.
- **`data.ts`**: cached functions. Their arguments are the cache key, so each listing
  state caches on its own. `cacheLife("max")` means only the webhook expires them.
- **`cache-tags.ts`**: `blog-list` and `blog-posts`. Any blog document refreshes both.
  A slug change must clear the old page, and authors and categories show on every card.
  With a few dozen posts, that is cheaper than tracking pages one by one.
- **`src/app/api/revalidate`**: `parseBody` checks the signature, then waits for the
  Content Lake to be consistent.
  - Bad or missing signature: 401, nothing changes.
  - No document type: 400.
  - Signed blog change: both tags expire at once (`expire: 0`), so the next visitor sees
    the new version.
  - Set it up per environment: runbook § 8.
- **`src/lib/sanity/image.ts`**: `next/image` props for an aspect ratio, honouring the
  editor's hotspot. webp/avif come from the CDN, and `next.config.ts` allows
  `cdn.sanity.io`.
- **`components/post-body.tsx`**: Portable Text through an explicit component map.
  - Headings get the ids the table of contents uses (`table-of-contents.ts`).
  - External links get `rel="noopener noreferrer"`.
  - Images get their alt text and caption.
  - Unknown types render nothing; there is never raw HTML.
- **Seed**: `pnpm sanity:seed` (`sanity/seed/seed.mts`) writes test content to
  `development` only, with fixed ids, so a re-run replaces it: 10 EN posts, 6 PT
  translations and 1 PT-only post, enough for page 2 and both translation cases.

## 7. The Sanity MCP server (optional, for Claude Code)

Sanity's hosted MCP server (`https://mcp.sanity.io`) lets Claude Code query content, read
the schema and write drafts. Each developer installs it for themselves:

```sh
claude mcp add Sanity -t http https://mcp.sanity.io --scope user
```

It signs in as you, with your full project rights, and the Free plan cannot scope a token
to one dataset. So `.claude/settings.json` (in the repo, for everyone) limits what Claude
Code may call:

| Tools                                                                                    | Setting | Why                                                          |
| ---------------------------------------------------------------------------------------- | ------- | ------------------------------------------------------------ |
| create project or dataset, update dataset, CORS changes, deploy Studio, `run_sanity_cli` | deny    | Account and infrastructure changes need approval (CLAUDE.md) |
| publish, unpublish                                                                       | deny    | Publishing is the editor's call in Studio                    |
| generate or transform image                                                              | deny    | Spends AI credits                                            |
| `deploy_schema`                                                                          | ask     | Helps the MCP understand the schema, but changes the project |
| queries, reads, drafts                                                                   | allowed | Test content in `development`; launch-post drafts (#63)      |

**Working rule:** Claude writes only to `development`, and only drafts. Anything touching
`production` needs approval in the conversation, like a database migration.
