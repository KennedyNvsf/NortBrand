# SEO

**Covers:** #15. **Source:** the brief, "Performance, SEO and accessibility" › SEO.

## 1. What we built

| Output                                  | Where                                                   | Notes                                                                          |
| --------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Title, description, canonical, hreflang | every page's `generateMetadata`                         | one call: `localizedPageMetadata`                                              |
| Open Graph + Twitter card               | same                                                    | locale `en_GB` / `pt_PT`, large image card                                     |
| Share image (1200 × 630 PNG)            | `app/[locale]/opengraph-image.tsx`                      | prerendered per locale, ~32 KB                                                 |
| `sitemap.xml`                           | `app/sitemap.ts`                                        | every page × locale, with hreflang + x-default                                 |
| `robots.txt`                            | `app/robots.ts`                                         | blocks `/studio`, `/api/`; previews block everything                           |
| Organization JSON-LD                    | `[locale]/layout.tsx`                                   | every page; `logo` is the 512 px square PNG                                    |
| Favicon, Apple touch icon               | `app/favicon.ico`, `app/apple-icon.png`, `app/icon.svg` | generated from the mark (`pnpm icons:generate`)                                |
| Service JSON-LD                         | Services page                                           | the five services, one per block                                               |
| `nortbrand.pt` → `nortbrand.com/pt`     | `next.config.ts` redirects                              | host-matched 308s (`lib/seo/domain-redirects.ts`); [Go-live](./go-live.md) § 1 |
| noindex on Vercel previews              | `pageMetadata` + `robots.txt`                           | from `VERCEL_ENV` at build time                                                |

Every page stays static. The image, sitemap and robots routes are prerendered too.

## 2. Where the code lives

```
src/i18n/metadata.ts          localeAlternates, pageMetadata, openGraphLocales, share image
src/i18n/page-metadata.ts     localizedPageMetadata(path, copy): what pages call
src/lib/seo/crawl.ts          buildSitemap, buildRobots (pure, unit-tested)
src/lib/seo/structured-data.ts organizationJsonLd, servicesJsonLd, serializeJsonLd
src/lib/seo/deployment.ts     isPreviewDeployment
src/content/site-pages.ts     the indexable pages (sitemap source)
src/components/site/json-ld.tsx
src/app/sitemap.ts · robots.ts · [locale]/opengraph-image.tsx
```

The pattern throughout: **pure builders in `src/lib` or `src/i18n`, thin Next.js files in
`src/app`.** Builders take plain inputs (a site URL, a list of pages, a preview flag),
so the unit tests run without Next.js.

## 3. How a page gets its metadata

```ts
export function generateMetadata() {
  return localizedPageMetadata("/services", (t) => ({
    title: t("servicesTitle"),
    description: t("servicesDescription"),
  }));
}
```

`localizedPageMetadata` resolves the locale from the route, loads the `Metadata`
messages and the preview flag, then calls `pageMetadata`. The callback receives the typed
translator, so a mistyped key fails the type check.

- **Titles:** the page title is "Services". The layout template turns it into
  "Services · NortBrand", and `pageMetadata` builds the same full string for Open Graph
  and Twitter, which don't use the template. Home passes `{ absolute: … }`.
- **The share image is referenced explicitly.** A page that sets its own `openGraph`
  _replaces_ the layout's, including the image the file convention attaches. I found this
  in the built HTML: pages had no `og:image` and the 404 did. `pageMetadata` therefore
  adds `/<locale>/opengraph-image` itself, sized by `SHARE_IMAGE_SIZE`, which the image
  file uses too.

## 4. Decisions

- **Share image design.** Figma has no share card. The first version put the sea photo
  under the logo, but a photo rendered to PNG is ~1.5 MB, too heavy for some apps' link
  previews. The card now follows the site's dark logomark panels: ink background, white
  wordmark, red mark, all drawn from the logo's own vector paths (no font files), at
  ~32 KB.
- **Making the image static.** Under `[locale]`, the image route rendered per request
  until it exported `generateStaticParams` (one PNG per locale, built once).
- **Placeholder contact details stay out of JSON-LD.** `organizationJsonLd` only includes
  email, phone and `sameAs` links whose `site.ts` entry is confirmed (`placeholder:
false`), so search engines never learn stand-in data. They appear automatically once
  the client confirms them, and a unit test covers both cases.
- **Safe JSON-LD.** `serializeJsonLd` escapes `<`, so translated copy can never close the
  `<script>` early. A unit test feeds it `</script>`.
- **Service @ids** are the block URLs (`/en/services#web-design`), and each Service
  points at the Organization by `@id` instead of repeating it.
- **Previews.** `isPreviewDeployment()` reads `VERCEL_ENV === "preview"`. Pages are
  prerendered per deployment, so preview builds bake in `noindex`, and their
  `robots.txt` disallows everything. Local and production builds are indexable.
- **Icons (#81).** Figma has no favicon or touch-icon artwork, so every icon is the
  squiggle mark from `LOGONORT` (54:16), which `src/app/icon.svg` already holds.
  `scripts/generate-icons.mts` (`pnpm icons:generate`) renders that SVG in Playwright's
  Chromium, so no image library is needed, and writes:
  - `favicon.ico`: 16, 32 and 48 px, transparent, stored as PNGs inside the ICO;
  - `apple-icon.png`: 180 px on white (`--color-bg-surface`) with a 20% inset, because
    iOS fills transparency with black and rounds the corners;
  - `public/images/logo-square.png`: 512 px on white, the Organization `logo`. Google
    wants a raster logo of at least 112 px and doesn't use SVG there.

  The files are committed. Re-run the script whenever `icon.svg` changes. Next.js adds
  the `<link>` tags itself from the file names.

- **Sitemap without dates.** There are no reliable per-page modification dates yet, so
  `lastModified` is left out rather than faked. The blog will add real dates from Sanity.

## 5. Tests

- **Unit:**
  - `pageMetadata`: share titles, absolute titles, Open Graph locale and alternate, image
    on Open Graph and Twitter, noindex only on previews
  - `buildSitemap`: every page × locale, absolute hreflang + x-default, no blog or studio
  - `buildRobots`: production and preview
  - `legacyDomainRedirects`: the four `nortbrand.pt` rules in order, the anchored host, page sections from `sitePages`
  - `organizationJsonLd`: required properties; placeholders left out; confirmed details
    included
  - `servicesJsonLd` and `serializeJsonLd`
- **e2e (`seo.spec.ts`)** against the production build:
  - the served `sitemap.xml` and `robots.txt`
  - Open Graph, Twitter and Organization JSON-LD on every page (PT)
  - the share image's real PNG dimensions
  - the favicon (a 3-image ICO), the Apple touch icon (180 px PNG) and the 512 px
    Organization logo
  - the five Service entries on Services

## 6. Adding a page

1. Add its path to `src/content/site-pages.ts` (sitemap) and `tests/e2e/routes.ts`
   (harness).
2. Add `<page>Title` / `<page>Description` to `Metadata` in the messages.
3. In the page, call `localizedPageMetadata("/path", (t) => ({ … }))`.
