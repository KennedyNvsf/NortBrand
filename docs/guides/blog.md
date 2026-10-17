# Blog

The public blog: the listing at `/[locale]/blog` (#60, sections 1–7) and the post page at
`/[locale]/blog/[slug]` (#61, section 8). Blog SEO (#62) extends this guide. Where content comes from (Sanity, the content layer, the
revalidation webhook) is in [CMS](./cms.md).

## 1. What we built

The listing (Figma 05 Blog › Listing `204:3`, tablet `370:260`, mobile `370:628`):

- **Header:** green eyebrow, the page's H1 and a lead. The red squiggle follows the
  headline's last word at every size. It is the Sticky CTA trigger
  (`data-sticky-cta-trigger`).
- **Featured article:** the newest post, with a 4:3 cover, badge, title, excerpt,
  byline and Read More.
- **Articles:** the section heading, then the control bar (search, category chips,
  sort). Below it come eight `ArticleCard`s per page and the pagination. When nothing
  matches, the designed **No Results** state shows instead (`321:469`).
- **Newsletter card**, then the **CTA band** with its default copy, which is the blog's
  own.
- **Loading:** the designed skeleton (`320:80`) in the real layout.

## 2. How it works at runtime

```text
GET /en/blog?q=brand&category=design&sort=oldest&page=2
  │
  ├─ prerendered shell: nav, header, Newsletter card, CTA band, footer   (◐ in the build)
  │
  └─ <Suspense fallback={<ListingSkeleton/>}>  BlogListing  (per request)
        parseListingParams(searchParams)        untrusted → zod → defaults
        isFiltered? no  → getFeaturedPost(locale)              "use cache"
        getBlogListing(locale, params, featured._id)            "use cache"
        getBlogCategories(locale)                               "use cache"
        → FeaturedArticle · ArticlesSection (grid | NoResults) · Pagination
```

- **The URL is the state.** Search, category, sort and page live only in the query
  string. A view can be shared and reloaded, and back/forward work. There is no client
  store and no client data fetching (brief).
- **Shell plus streamed listing.** The listing depends on `searchParams`, so it cannot
  be prerendered. Everything around it is, so the page still answers instantly. The
  build shows `/en/blog` as ◐ (Partial Prerender); that is expected for this page and
  only this page.
- **Cached data.** Each function in `data.ts` is `"use cache"`, keyed by its arguments
  and tagged `blog-list`. A request reaches Sanity only after an editor publishes and
  the webhook expires the tag ([CMS § 6](./cms.md)).
- **Featured:** shown on page 1 of the unfiltered view (no `q`, no category). On every
  unfiltered page its id goes to the listing query as `excludeId`, so it never appears
  in the grid and page boundaries stay the same from page 1 to page 2.

### Interactions

| Control  | Element                                      | What happens                                                                                    |
| -------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Category | `Link` (server)                              | `?category=` and back to page 1. Works without JavaScript. `aria-current` marks the active one. |
| Search   | `BlogSearch` (client)                        | `router.replace` 250 ms after the last keystroke, inside `startTransition`; Enter searches now. |
| Sort     | `BlogSortSelect` (client, the shared Select) | `router.push` with `?sort=`; `latest` is the default and is left out of the URL.                |
| Page     | `Link` (server)                              | `?page=`, keeping the other filters.                                                            |
| Clear    | `Link` to `/blog`                            | Resets everything; the search field follows the URL.                                            |

`listingQuery(current, change)` in `listing-params.ts` builds every one of these URLs.
It drops defaults (`/blog`, not `/blog?sort=latest&page=1`), and any change to search,
category or sort resets the page to 1. It is unit-tested.

## 3. Files

| File                                                   | What it does, and why                                                                                                                                                      |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/[locale]/(site)/blog/page.tsx`                | Composes the page. The listing sits in a Suspense boundary so the shell stays static.                                                                                      |
| `_components/blog-hero.tsx`                            | Header with the one H1, `enterItem` entrances and the squiggle (`LogoMark draw="once"`), tied to the last word.                                                            |
| `_components/featured-article.tsx`                     | The featured post. Read More is the one link; a hidden suffix names the post ("Read More: …") so the link makes sense on its own. The cover is decorative (`alt=""`).      |
| `_components/articles-section.tsx`                     | Section heading, control bar grid (three layouts, one markup), cards, pagination or No Results, and the result count line.                                                 |
| `_components/blog-search.tsx`                          | Debounced search. It never overwrites what the visitor is typing, and follows the URL when it changes elsewhere. A GET form underneath, so Enter works without JavaScript. |
| `_components/blog-sort.tsx`                            | Latest/Oldest on the shared `Select`, with a type guard instead of a cast.                                                                                                 |
| `_components/category-chips.tsx`                       | "All" plus categories, as `Badge` links. Scrolls sideways on mobile.                                                                                                       |
| `_components/pagination.tsx`                           | Previous, numbers, next. Ends render as disabled text. 36 px on desktop, 44 px on touch.                                                                                   |
| `_components/no-results.tsx`                           | The designed empty state, with the search term, Clear filters and three topics.                                                                                            |
| `_components/listing-skeleton.tsx`                     | The Suspense fallback: `role="status"`, `aria-busy`, bars hidden from assistive tech, pulse only with motion allowed.                                                      |
| `_components/search-analytics.tsx`                     | GA4 `blog_search { term_length, results }`. Never the words typed. Sent only with consent.                                                                                 |
| `src/features/blog/format.ts`                          | Post dates on Lisbon time. English "Sep 29, 2026"; Portuguese spells the month ("29 de setembro de 2026"), since pt-PT's short form is numeric.                            |
| `src/features/blog/e2e-backend.ts`                     | Fixtures for Playwright (`E2E_FAKE_BACKEND=1`): 10 EN and 3 PT posts without covers. They mirror the GROQ filter, search, sort and paging.                                 |
| `src/features/blog/queries.ts`                         | Adds `BLOG_FEATURED_QUERY` and `excludeId` to the listing.                                                                                                                 |
| `src/components/site/article-card.tsx`                 | A card without a cover now shows the designed red/50 placeholder with an image icon.                                                                                       |
| `src/app/[locale]/[...rest]/page.tsx`, `site-pages.ts` | `/blog` is no longer a known 404; it joins the sitemap.                                                                                                                    |

## 4. Motion

The listing uses the same motion vocabulary as Home, and invents no new timings
([Motion](./motion.md)):

- **Hero (CSS, first paint):** eyebrow, headline and lead enter 110 ms apart
  (`enterItem`). The squiggle then draws itself (`LogoMark draw="once"`), timed like a
  hero underline: `--mark-delay` is `500ms + index × --enter-step`.
- **The squiggle's placement:** it follows the headline's last word at cap height, in
  em units (45 × 37 at 44 px, as in Figma). The last word and the mark share a
  `nowrap` span, so they always wrap together, never collide with the line above, and
  never overflow at 390 px with long Portuguese.
- **Scroll reveals (`RevealGroup`):**
  - The featured cover slides in from the left, then its copy rises in.
  - The Articles eyebrow and heading rise in, and "newest" draws its underline. Then the
    control bar, then the cards, 100 ms apart, row by row.
  - The Newsletter card rises in. In No Results the icon pops in before the copy.
- Filtering, searching and paging keep the group mounted, so new results appear at
  once instead of replaying the entrance. Content already on screen at load is never
  hidden.
- **Reduced motion:** opacity only, 150 ms; the squiggle and underline are simply drawn.

## 5. Accessibility

- One H1 (the header). The featured title is an H2, the Articles heading is an H2, and
  No Results is an H3 under it.
- Filters are a `nav` named "Filter by category"; pagination is a `nav` named
  "Pagination", with `aria-current="page"` and a label per page.
- The search is a `role="search"` form with a visually hidden label.
- The count line ("Showing 8 of 9 articles") is a polite live region at every size. It
  is visible on mobile as designed, and screen-reader-only above, so a search or a
  filter always announces its result.
- Touch targets are 44 px below desktop: chips, pagination, search and sort.

## 6. Tests

- **Unit:** `listing-params.test.ts` (`listingQuery`, parsing), `format.test.ts`
  (Lisbon date across midnight, both languages).
- **e2e:** `tests/e2e/blog.spec.ts`, against the fixtures. It covers the featured post
  and paging, category filter with reload and back, search as you type, No Results and
  Clear, sort, a malformed URL, PT, and mobile (count line, no overflow, Sticky CTA).
  Axe runs on the listing and on No Results.
- **Harness:** `/blog` is in `tests/e2e/routes.ts`, so both locales get the shared
  checks: status, `hreflang`, canonical, one H1, axe and 390 px overflow.
- Typing into the search before hydration does nothing, so the test retries until the
  URL follows (like `nav.spec.ts`).

## 7. Day-to-day

- **Page size** is `PAGE_SIZE` (8) in `listing-params.ts`, the same at every breakpoint
  (CLAUDE.md). Figma's mobile frame shows four only to save space.
- **A new listing control:** add it to `ListingParams` (zod, with a default), to
  `listingQuery`, to the GROQ in `queries.ts` and to `fakeListing`. Then add a case to
  `listing-params.test.ts`.
- **The featured post** is the newest one. An editor choice ("pin this post") would be
  a schema field and a change to `BLOG_FEATURED_QUERY` (see tech debt).
- **Copy** lives under `Blog` in `messages/en.json`; run `pnpm i18n:pseudo` after
  editing it.

## 8. The post page (#61)

Figma 05 Blog › Post `285:3` (tablet `372:511`, mobile `372:777`), top to bottom:

- **Header:** breadcrumb (Blog › category), the one H1, then the byline: photo, name,
  date and "N min read".
- **Cover:** the editor's image, with its alt text, since here it carries meaning.
- **Article:** a 680 px reading column. On desktop a 240 px rail sticks 120 px from the
  top, holding "On this page", Back to top and Get started. Below desktop there is no
  rail, and Get started follows the tags and share row.
- **Author card**, then **Keep reading** (three cards), then the **Newsletter card**.
  There is no CTA band and no Sticky CTA, and no reading progress bar (removed at
  review, 17 October 2026; the table of contents shows the reader's place).

### How a request is served

```text
GET /pt/blog/renovar-a-marca
  │
  ├─ prerendered at build: generateStaticParams lists every slug per language
  │    (fixtures under E2E_FAKE_BACKEND, Sanity otherwise; a sample 404 slug if none)
  │
  └─ BlogPostPage
       getBlogPost(locale, slug)             "use cache", tag blog-posts
       ├─ found → page; getRelatedPosts(...) "use cache", tag blog-list
       └─ not found
            ├─ another language has this slug → redirect to its translation here,
            │                                   or to this language's listing
            └─ otherwise → notFound(): the designed 404
```

- **Unlisted slugs.** `ensureStatic = "navigation"`, as on the catch-all 404, renders
  an unlisted slug fully on the server on its first request. A 404 or a redirect is
  then real HTML, not a fallback shell resolved in the browser.
- **The language switcher.** A post's slug differs per language, so the page declares
  its address in each language with `<AlternatePaths>`
  (`src/components/site/alternate-paths.tsx`): the translation, or the other
  language's listing when there is none (`postPaths` in `src/features/blog/post.ts`).
  The `LocaleSwitcher` uses those paths. The provider stores them with the pathname
  that set them, so a client navigation never shows the previous page's links.
- **Before hydration.** Until the page hydrates, the switcher still links to the same
  slug. The redirect branch above catches that case, so switching language never ends
  on a 404.
- **Metadata.** The title and description come from the post's SEO fields, falling
  back to the title and excerpt. The canonical is the post. Hreflang lists only real
  translations (`localeAlternates(..., paths)`), and x-default follows the PT version
  when there is one. Article structured data comes in #62.

### Files

| File                                             | What it does, and why                                                                                                                                                      |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `blog/[slug]/page.tsx`                           | Static params, metadata, the not-found and redirect branch, and the page's composition.                                                                                    |
| `_components/post-header.tsx`                    | Breadcrumb (a `nav` named "Breadcrumb"), H1, byline with `<time>`, and the cover (`PostCover`). Hero entrance with `enterItem`.                                            |
| `_components/post-article.tsx`                   | Reading column (`PostBody`), tags and share, and the desktop rail.                                                                                                         |
| `_components/share-links.tsx`                    | Native share (shown only where the browser has a share sheet), email (a `mailto`, works without JS), and copy link with a Sonner toast.                                    |
| `_components/author-card.tsx`                    | Photo, "Written by", name, the bio in the page language, and "More articles".                                                                                              |
| `_components/related-posts.tsx`                  | "Keep reading": three cards on desktop, two on tablet (as in Figma), one per row on mobile.                                                                                |
| `src/features/blog/components/post-body.tsx`     | Portable Text to Figma's article: the first paragraph is the lead, then 32/28 px h2s, 18 px copy, the pull quote (bold words turn red), and bullets as the red-check list. |
| `src/features/blog/components/author-avatar.tsx` | The round author photo, or the red/50 circle. Also used in the listing's featured byline now.                                                                              |
| `src/features/blog/post.ts`                      | `readingMinutes` (200 words a minute, at least 1), `postPaths` and `translatedLocales`. Unit-tested.                                                                       |
| `src/components/site/table-of-contents.tsx`      | Now with the travelling red marker. Legal shares it, so its list gets the marker too.                                                                                      |
| `queries.ts`                                     | The post returns `category._id`, and cards return the author's photo. Related posts: the same category first, then the newest of the rest, so the section is always full.  |

### Motion

- **Hero:** breadcrumb, title, byline and cover enter 110 ms apart (CSS).
- **Table of contents:** the red marker slides to the section being read on the
  gentle spring (Motion Spec). It is a 1 px bar scaled to the link's height, so only
  transforms animate. It is placed without travel on first paint and under reduced
  motion.
- **Author card, Keep reading and Newsletter** reveal on scroll, as on the listing, and
  "studio" draws its underline. The article body itself never animates: reading text
  should not move.

### Accessibility

- One H1. Body headings are H2/H3, and "Keep reading" is an H2.
- The table of contents marks the current section with `aria-current="location"` and
  SemiBold text, not colour alone. Its links are plain anchors, and headings have a
  112 px scroll margin, so the sticky nav never covers them and a heading reached
  from the list counts as read (the reading line is at 120 px).
- Every share control has a name ("Share by email", "Copy link"). Touch targets are
  44 px below desktop, including the tag badge, through an invisible hit area.

### Tests

- **Unit:** `post.test.ts`, and the new `localeAlternates` cases in `metadata.test.ts`.
- **e2e:** `tests/e2e/blog-post.spec.ts` covers:
  - the article, breadcrumb and related posts, with axe;
  - the table of contents following a click;
  - switching language with and without a translation;
  - the pre-hydration redirect;
  - hreflang;
  - an unknown slug;
  - mobile: no rail, Get started, no Sticky CTA, no overflow in PT.
- **Harness:** `/blog/no-such-post` is in `routes.ts`, so both locales check the
  designed 404.
- **CI:** the build job sets `E2E_FAKE_BACKEND=1`. Posts prerender at build time, and
  CI's Sanity project is a placeholder.

### Extending it

- **A new block type in the body** (a callout, an embed):
  1. Add it to the schema's `body` array.
  2. Run `pnpm sanity:types`.
  3. Add a renderer to `components()` in `post-body.tsx`. Anything without a renderer
     renders nothing.
- **Tags:** add a `tags` array to the schema and project it in `BLOG_POST_QUERY`. The
  tags row in `post-article.tsx` already lays out several badges (see tech debt).
- **Another page with per-language addresses:** render `<AlternatePaths>` with its
  paths. The switcher picks them up.
