# Pre-launch accessibility and QA audit

The written report for #84. It records what was checked, on which pages, and the result
of each check. Target: WCAG 2.2 AA plus the project rules in CLAUDE.md › Accessibility.

| Pass                          | Date       | Build                           | Status                                                   |
| ----------------------------- | ---------- | ------------------------------- | -------------------------------------------------------- |
| Early pass (1440, 768, 390)   | 2026-10-25 | `main` before #93               | Done. Three failures found, each fixed in its own ticket |
| Automated pass (this report)  | 2026-11-06 | `main` at `152d8ec` (after #95) | Done. No open failure                                    |
| Screen readers                | —          | —                               | **Pending**, needs a person (§ 5)                        |
| Safari (macOS and iOS)        | —          | —                               | **Pending** (§ 5)                                        |
| Rerun with final copy + legal | —          | after #77 and #78               | **Pending** (§ 5)                                        |

#84 stays open until the pending passes are recorded here.

## 1. Summary

- **Every page passes every automated check** at 1440, 768, 390 and 320, in EN and PT
  (28 pages × 4 widths = 112 page checks).
- **Three failures from the early pass are fixed:**

  | Ticket | Failure                                                   | WCAG                        |
  | ------ | --------------------------------------------------------- | --------------------------- |
  | #93    | Services tab panel took focus with no visible ring        | 2.4.7 Focus Visible (AA)    |
  | #94    | The 404 showed the Home page's title                      | 2.4.2 Page Titled (A)       |
  | #95    | Logo links, chips and short footer links were under 44 px | Project rule (2.5.8 passes) |

- **One accepted exception:** the Services hero video loops with no pause control, which
  fails WCAG 2.2.2 Pause, Stop, Hide (A). It is the lead's decision (#80 closed as not
  planned, 2026-10-25; `docs/tech-debt.md`). Reduced motion and Data Saver never start it,
  and this audit confirmed no video plays with reduced motion.
- **Lighthouse accessibility is 100** on all 10 pages it measures (CI, #83).

## 2. Pages

Every route in `tests/e2e/routes.ts`, in EN and PT, plus the three translated blog posts
in each locale, taken from the sitemap.

| Route                     | Path                                                       | Notes                   |
| ------------------------- | ---------------------------------------------------------- | ----------------------- |
| Home                      | `/[locale]`                                                |                         |
| Services                  | `/[locale]/services`                                       |                         |
| About                     | `/[locale]/about`                                          |                         |
| Contact                   | `/[locale]/contact`                                        | Consultation form       |
| Privacy Policy, Terms     | `/[locale]/legal/privacy`, `/legal/terms`                  | Draft legal text        |
| Newsletter confirm, unsub | `/[locale]/newsletter/confirm`, `/unsubscribe`             | noindex                 |
| Blog                      | `/[locale]/blog`                                           |                         |
| 404                       | `/[locale]/no-such-page`, `/[locale]/blog/no-such-post`    | noindex, status 404     |
| Blog posts 1–3            | `/en/blog/…`, `/pt/blog/pt-…` (the three translated posts) | Test content (fixtures) |

## 3. Results per page

Each cell is the result across every width the check runs at (§ 4). ✓ = pass at every
width, ✗ = fail.

| Page                   | Locale | Status | axe | One H1, one `main` | `lang`, title | Canonical, `hreflang` | No overflow | Reduced motion | 44 px targets | Keyboard |
| ---------------------- | ------ | ------ | --- | ------------------ | ------------- | --------------------- | ----------- | -------------- | ------------- | -------- |
| Home                   | EN     | 200    | ✓   | ✓                  | ✓             | ✓                     | ✓           | ✓              | ✓             | ✓        |
| Home                   | PT     | 200    | ✓   | ✓                  | ✓             | ✓                     | ✓           | ✓              | ✓             | ✓        |
| Services               | EN     | 200    | ✓   | ✓                  | ✓             | ✓                     | ✓           | ✓ ²            | ✓             | ✓        |
| Services               | PT     | 200    | ✓   | ✓                  | ✓             | ✓                     | ✓           | ✓ ²            | ✓             | ✓        |
| About                  | EN     | 200    | ✓   | ✓                  | ✓             | ✓                     | ✓           | ✓              | ✓             | ✓        |
| About                  | PT     | 200    | ✓   | ✓                  | ✓             | ✓                     | ✓           | ✓              | ✓             | ✓        |
| Contact                | EN     | 200    | ✓   | ✓                  | ✓             | ✓                     | ✓           | ✓              | ✓             | ✓        |
| Contact                | PT     | 200    | ✓   | ✓                  | ✓             | ✓                     | ✓           | ✓              | ✓             | ✓        |
| Privacy Policy         | EN     | 200    | ✓   | ✓                  | ✓             | ✓                     | ✓           | ✓              | ✓             | ✓        |
| Privacy Policy         | PT     | 200    | ✓   | ✓                  | ✓             | ✓                     | ✓           | ✓              | ✓             | ✓        |
| Terms of Use           | EN     | 200    | ✓   | ✓                  | ✓             | ✓                     | ✓           | ✓              | ✓             | ✓        |
| Terms of Use           | PT     | 200    | ✓   | ✓                  | ✓             | ✓                     | ✓           | ✓              | ✓             | ✓        |
| Newsletter confirm     | EN     | 200    | ✓   | ✓                  | ✓             | n/a (noindex) ³       | ✓           | ✓              | ✓             | ✓        |
| Newsletter confirm     | PT     | 200    | ✓   | ✓                  | ✓             | n/a (noindex) ³       | ✓           | ✓              | ✓             | ✓        |
| Newsletter unsubscribe | EN     | 200    | ✓   | ✓                  | ✓             | n/a (noindex) ³       | ✓           | ✓              | ✓             | ✓        |
| Newsletter unsubscribe | PT     | 200    | ✓   | ✓                  | ✓             | n/a (noindex) ³       | ✓           | ✓              | ✓             | ✓        |
| Blog                   | EN     | 200    | ✓   | ✓                  | ✓             | ✓                     | ✓           | ✓              | ✓             | ✓        |
| Blog                   | PT     | 200    | ✓ ¹ | ✓                  | ✓             | ✓                     | ✓           | ✓              | ✓             | ✓        |
| 404 (unknown page)     | EN     | 404    | ✓   | ✓                  | ✓             | n/a (noindex) ³       | ✓           | ✓              | ✓             | ✓        |
| 404 (unknown page)     | PT     | 404    | ✓   | ✓                  | ✓             | n/a (noindex) ³       | ✓           | ✓              | ✓             | ✓        |
| 404 (unknown post)     | EN     | 404    | ✓   | ✓                  | ✓             | n/a (noindex) ³       | ✓           | ✓              | ✓             | ✓        |
| 404 (unknown post)     | PT     | 404    | ✓   | ✓                  | ✓             | n/a (noindex) ³       | ✓           | ✓              | ✓             | ✓        |
| Post 1                 | EN     | 200    | ✓   | ✓                  | ✓             | ✓                     | ✓           | ✓              | ✓             | ✓        |
| Post 2                 | EN     | 200    | ✓   | ✓                  | ✓             | ✓                     | ✓           | ✓              | ✓             | ✓        |
| Post 3                 | EN     | 200    | ✓   | ✓                  | ✓             | ✓                     | ✓           | ✓              | ✓             | ✓        |
| Post 1                 | PT     | 200    | ✓   | ✓                  | ✓             | ✓                     | ✓           | ✓              | ✓             | ✓        |
| Post 2                 | PT     | 200    | ✓   | ✓                  | ✓             | ✓                     | ✓           | ✓              | ✓             | ✓        |
| Post 3                 | PT     | 200    | ✓   | ✓                  | ✓             | ✓                     | ✓           | ✓              | ✓             | ✓        |

1. **Blog (PT) at 320:** one run reported 23 `color-contrast` nodes. Three reruns at 320 and
   three at 390 reported none, and the same page passed at every other width. axe most
   likely sampled the results while they were streaming in. Not reproduced, so no ticket;
   the e2e harness runs axe on this page on every PR.
2. **Services:** the hero video is the accepted WCAG 2.2.2 exception (§ 1). With reduced
   motion it never starts, which is what this column checks.
3. **noindex pages** have no canonical or `hreflang`, by design (`newsletter.md`,
   `system-states.md`). They return `noindex`, and the 404s return status 404.

Also clean on every page and width: no `<img>` without `alt`, and no skipped heading levels.

## 4. How each check was run

A temporary Playwright script ran against the production build (`pnpm build`, then
`pnpm start` with `E2E_FAKE_BACKEND=1`) in Chromium, with reduced motion emulated and a
consent choice already made. Touch was emulated below 1024 px. The script was not
committed; the checks it ran are the same as, or stricter than, the shared harness in
`tests/e2e/pages.spec.ts`.

| Check                 | Widths              | Pass means                                                                                                  |
| --------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------- |
| axe                   | 1440, 768, 390, 320 | No violations for `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`                                    |
| One H1, one `main`    | all                 | Exactly one of each                                                                                         |
| `lang`, title         | all                 | `<html lang>` matches the locale; the document has a title                                                  |
| Canonical, `hreflang` | all                 | One canonical, and `hreflang` for `en`, `pt` and `x-default`                                                |
| No overflow           | all                 | No horizontal scroll. 320 px is also the WCAG 1.4.10 Reflow width (1280 px at 400 % zoom)                   |
| Reduced motion        | all                 | After scrolling the whole page: no animation over 150 ms, none infinite, no playing video                   |
| 44 px targets         | 768, 390, 320       | Every control hit-tests across a 44 px circle (`tests/e2e/touch-targets.ts`); inline links exempt           |
| Keyboard              | 1440, 390           | Tab through the page: the skip link is first, every stop shows a focus ring, no stop is off-screen, no trap |

Keyboard stops per page ranged from 11 to 45 at 1440, and from 5 to 39 at 390, where the
navigation is behind the menu button.

**Error states** are covered by the e2e suite, which runs axe on each state on every PR:

- consultation form: field errors (EN and PT, focus moves to the first error), send
  failed, too many requests, success (`tests/e2e/consultation-form.spec.ts`);
- newsletter: field error on the dark card, too many attempts, sending failed, and the
  invalid, expired and failed link pages (`tests/e2e/newsletter.spec.ts`).

Both forms render errors through `FieldError` (`src/components/ui/field-error.tsx`),
which always pairs a `CircleAlert` icon with the text, as CLAUDE.md requires.

## 5. Still to do before #84 closes

| Item                          | Who                   | What                                                                                                                      |
| ----------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| VoiceOver (macOS Safari, iOS) | a person              | Home, Services (tabs), Contact (form: errors, send failed, success), Blog (filters), one post, mobile menu, cookie banner |
| NVDA (Windows, Firefox)       | a person              | The same pages                                                                                                            |
| Safari                        | a person, or CI       | Same pages at 1440 and 390. CI's WebKit runs are informational only (`docs/guides/ci.md`)                                 |
| Rerun with the final content  | Claude, after #77/#78 | This automated pass again, with the final English copy, the final Portuguese and the final legal text                     |

For each screen-reader pass, record here: landmarks and headings read in order; every
control has a name and role; form errors are announced; the menu, dialog and banner move
and return focus correctly; and the PT pages are read in Portuguese.

Any failure found becomes its own ticket (`|A11Y| …`) and is listed in § 1.
