# Page layout: the (site) route group and the footer

**Covers:** #7. **Design source:** Figma 02 Components › Footer (`337:128`), Handoff ›
Footer.

## 1. What we built

Every page now has the nav on top and the footer at the bottom, without any page
having to include them. The 404 (built in #14) will have neither footer, because the
Handoff says the footer appears "on every page except the 404".

```
Desktop  [logo + tagline]     SERVICES        COMPANY    FOLLOW US
                              Web Design      About      Instagram
                              …               Blog       LinkedIn
                                              Contact
         ─────────────────────────────────────────────────────────
         © 2026 NortBrand. All rights reserved.   Privacy Policy  Terms of Use
```

Tablet puts the brand above the three columns. Mobile shows Services alone, then
Company and Follow us side by side, and stacks the bottom bar.

## 2. Layouts in the App Router, and route groups

A `layout.tsx` wraps every page below it. We now have two:

```
src/app/[locale]/layout.tsx          <html>, <body>, fonts, skip link, i18n provider
src/app/[locale]/(site)/layout.tsx   <SiteNav />  {page}  <SiteFooter />
src/app/[locale]/(site)/page.tsx     the home page (today: the placeholder)
```

A folder in parentheses, `(site)`, is a **route group**: it organises files and can
have its own layout, but it adds **nothing to the URL**. `(site)/page.tsx` is still
served at `/en`.

Why bother? Because "every page except the 404" is now a matter of **where a file
lives**, not an `if` at runtime:

- pages inside `(site)/` get the nav and footer
- `[locale]/not-found.tsx` (#14) sits outside the group, so it gets only the root
  layout

No pathname checks, no client JavaScript, and a new page gets the chrome just by being
created in the right folder.

## 3. `site-footer.tsx`, piece by piece

It's a **server component**: links and text need no JavaScript at all.

### Data, not hard-coded links

| Column    | Comes from                                                  |
| --------- | ----------------------------------------------------------- |
| Services  | `src/content/services.ts` (slugs) + `ServiceNames` messages |
| Company   | `navItems` minus Services (`src/content/navigation.ts`)     |
| Follow us | `site.social` (`src/content/site.ts`)                       |
| Legal     | `legalLinks` (`src/content/navigation.ts`)                  |

So adding a page to the nav also adds it to the footer, and contact or social details
are still only in `site.ts`.

### `services.ts` and the slug

```ts
{ slug: "web-design", key: "webDesign" }
```

The **slug** is a stable identifier used in three places: the footer link anchor
(`/services#web-design`), the id of that block on the Services page (#10), and later the
`service` value stored with a consultation request. That's why the file warns never to
rename a slug without a database migration. The **key** only picks the translated name.

The link is written as an object, `href={{ pathname: "/services", hash: slug }}`, so
next-intl adds the locale _before_ the `#`: `/pt/services#web-design`.

### Touch targets

The Handoff asks for links "on a 44pt pitch on touch". Each link is
`min-h-11` (44 px) with no gap between rows, so the rows themselves create the rhythm.
On desktop, `lg:min-h-0 lg:gap-md` switches to the tighter 15 px text with 16 px gaps
from Figma.

### Headings and landmarks

- `<footer>` is the page's **contentinfo** landmark, so screen readers can jump to it.
- Each column is a `<section aria-labelledby>` with an `<h2>`, so the footer shows up in
  a screen reader's heading list ("Services", "Company", "Follow us"). It doesn't break
  the "one H1 per page" rule; these are H2s.
- The legal links are a `<nav aria-label="Legal">`.

### The copyright year and Cache Components

```ts
async function getCopyrightYear() {
  "use cache";
  return new Date().getFullYear();
}
```

The project uses Next.js **Cache Components** (`cacheComponents: true`). In that mode,
reading the clock during render counts as dynamic data, and a page that does it can't
be fully static. Wrapping it in a `"use cache"` function tells Next.js the result can be
computed once at build time and reused, so the pages stay static (○ in the build
output). The year updates with the next deploy, which for a copyright line is fine.

Next.js requires `"use cache"` functions to be `async`, even though nothing is awaited.
Our lint rule `require-await` objects, so that one line has a narrow, explained
`eslint-disable-next-line`.

## 4. How the tests protect this

| What could go wrong                        | Test                      |
| ------------------------------------------ | ------------------------- |
| Footer missing, columns missing            | `e2e/footer.spec.ts`      |
| Service links lose their anchor or locale  | `e2e/footer.spec.ts`      |
| Company column lists the wrong pages       | `e2e/footer.spec.ts` (PT) |
| Year or legal links wrong                  | `e2e/footer.spec.ts`      |
| A page accidentally becomes dynamic        | `pnpm build` output       |
| Contrast, landmarks, overflow at 390 in PT | page harness (axe)        |

## 5. Day-to-day rules

1. **New page?** Create it under `src/app/[locale]/(site)/` to get nav and footer.
2. **A page without the chrome** (like the 404) goes outside `(site)/`.
3. **Never hard-code** contact details or social links in the footer; use `site.ts`.
4. **New service?** Add it to `services.ts` (and its name to `ServiceNames`); the footer
   picks it up. Renaming a slug needs a migration once requests are stored.
