# Images and media

**Covers:** #82 (launch imagery and licences), with the image work from #68 (Services
hero video) and the CTA band. **Decisions:** CLAUDE.md › Content, translation and assets.

This guide is the **register of every photo and video the site ships**: where it is used,
where it came from, and under what licence. It also says how to add or swap one. Update the
register in the same pull request as any image change.

## 1. The register

All stock media come from **[Pexels](https://www.pexels.com/license/)** (the lead,
11 November 2026). The Pexels licence allows free commercial use and modification, and
does not require attribution. It does not clear what a photo depicts, such as brands,
logos or recognisable products, and it doesn't let us imply that people or brands shown
endorse us. Those cases are noted in the last column and logged in `docs/tech-debt.md`.

The photo page URLs and most photographers' names were not kept. "Credit in file" is the
author the original file's metadata named, recorded before the metadata was stripped.

### Stock (Pexels)

| File                                                       | Used on                                         | Subject                                         | Credit in file                  | Notes                                                            |
| ---------------------------------------------------------- | ----------------------------------------------- | ----------------------------------------------- | ------------------------------- | ---------------------------------------------------------------- |
| `src/assets/images/services-hero.jpg`                      | Services hero (poster and reduced-motion photo) | —                                               | —                               | 2400 px; first exported from the Figma file                      |
| `public/videos/services-hero.mp4`, `services-hero-720.mp4` | Services hero video (#68)                       | —                                               | —                               | H.264, 1080p and 720p                                            |
| `src/assets/images/sea-coast.jpg`                          | CTA band, every page with one                   | Sea and coastline                               | —                               | 2400 px (CTA band rule, [Calls to action](./calls-to-action.md)) |
| `service-web-design.jpg`                                   | Services › Web Design, main                     | Paper wireframes on a jute rug                  | —                               |                                                                  |
| `service-web-design-detail.jpg`                            | Services › Web Design, detail                   | Photoshop on a monitor                          | —                               | Screen shows third-party design mockups                          |
| `service-web-development.jpg`                              | Services › Web Development, main                | Laptop showing code                             | Daniil Komov                    |                                                                  |
| `service-web-development-detail.jpg`                       | Services › Web Development, detail              | JSX code close-up (portrait)                    | —                               | Shows third-party code                                           |
| `service-content-writing.jpg`                              | Services › Content Writing, main                | "SEO" notes on a notebook                       | —                               |                                                                  |
| `service-content-writing-detail.jpg`                       | Services › Content Writing, detail              | Hands typing on a laptop                        | Karolina Grabowska (Kaboompics) |                                                                  |
| `service-social-media-management.jpg`                      | Services › Social Media, main                   | Letter tiles: "Social Media"                    | —                               |                                                                  |
| `service-social-media-management-detail.jpg`               | Services › Social Media, detail                 | Phone folder of social apps                     | Bastian Riccardi                | App logos, incl. Twitter's retired bird                          |
| `service-website-maintenance.jpg`                          | Services › Website Maintenance, main            | Code editor close-up                            | —                               |                                                                  |
| `service-website-maintenance-detail.jpg`                   | Services › Website Maintenance, detail          | Typing beside a coffee cup                      | —                               | Cup shows a café's partial logo                                  |
| `approach-brand-identity.jpg`                              | Services › Our approach › Brand Identity        | "Brand personality & visual identity" lettering | —                               | English words, also on `/pt`                                     |
| `approach-visual-design.jpg`                               | Services › Our approach › Visual Design         | Hands on colour swatches                        | —                               |                                                                  |
| `approach-content-strategy.jpg`                            | Services › Our approach › Content Strategy      | Team planning around a table                    | —                               | Screen reads "Breakdown of Ad Spend" (English)                   |
| `approach-growth.jpg`                                      | Services › Our approach › Growth                | "Market research" bar chart                     | —                               | English words, also on `/pt`                                     |

Paths without a folder are in `src/assets/images/`.

### Not stock

| File                          | Used on                               | Source                                                                                                               |
| ----------------------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `home-why.jpg`, `asking.jpg`  | Home › Why it matters, Our philosophy | AI-generated, supplied by the lead (decided 2026-11-08). No licence to record; the tool is not recorded (tech debt). |
| `public/images/placeholder/*` | Figma placeholder glyphs              | Exported from the Figma file                                                                                         |
| Logo, icons, share image      | Everywhere                            | NortBrand's own artwork (`LOGONORT`, `54:16`)                                                                        |

## 2. Adding or swapping a photo

1. **Export it** at 1600 px wide (2400 px for full-bleed photos: the hero and the CTA
   band), with all metadata stripped, as JPEG quality 80. Metadata can carry GPS
   positions and personal names. The repo's sharp does both:

   ```js
   // node, from the repo root: read into memory first, or sharp keeps the file locked
   const buf = await sharp(fs.readFileSync(src))
     .rotate()
     .resize({ width: 1600 })
     .jpeg({ quality: 80, mozjpeg: true })
     .toBuffer();
   fs.writeFileSync(dest, buf);
   ```

   Before stripping, note any author in the file's metadata (`dc:creator`) for the
   register.

2. **Name it** after where it goes: `service-<slug>.jpg` and `-detail.jpg` for collages
   (`services/_components/service-photos.ts`), `approach-<point>.jpg` for the approach
   points (`points` in `services-approach.tsx`). Never commit the raw original.
3. **Set a crop anchor** (an `object-[x%_y%]` class) when the panel crops the subject,
   and check it at 1440, 768 and 390 **on a production build** (`pnpm build` then
   `pnpm start`). The dev server can serve stale CSS without a newly added class, so
   every crop looks centred there.
4. **Check `sizes`** describes the width the photo is drawn at. `object-cover` draws a
   photo wider than its panel when the photo's shape is wider than the panel's
   (`coverSizes()` in `service-collage.tsx` handles this for the collages).
5. **Decorative or not:** photos beside copy that already carries the meaning get
   `alt=""` (collages, approach points, Home panels). A photo that adds information of its
   own needs real alt text in both languages.
6. **Update this register** (file, place, subject, source, credit, notes) and
   `docs/tech-debt.md` if the photo shows brands, logos, people or English text.

## 3. Licence follow-ups

- The photo page URLs were not kept. If a licence is ever challenged, a reverse image
  search on Pexels finds the originals; record the URL here when you do.
- Photos showing third-party brands or English text are listed in `docs/tech-debt.md`
  (one row). They are allowed under the licence as decoration, but a photo without them
  is safer and reads better on `/pt`.
