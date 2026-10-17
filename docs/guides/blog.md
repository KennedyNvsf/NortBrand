# Blog

The public blog: the listing at `/[locale]/blog` (#60). The post page (#61) and blog SEO
(#62) extend this guide. Where content comes from (Sanity, the content layer, the
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
