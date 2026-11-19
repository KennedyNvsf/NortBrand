import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { locales, localizedPath, routes } from "./routes";
import { findSmallTouchTargets } from "./touch-targets";
import { settleAnimations } from "./settle";
import { onPreview } from "./target";

/*
 * Shared page harness: the per-page checks from the definition of done in CLAUDE.md,
 * run for every route in every locale. Add new pages to routes.ts, not here.
 */

const WCAG_TAGS = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "wcag22aa",
] as const;

const MOBILE_VIEWPORT = { width: 390, height: 844 } as const;

for (const route of routes) {
  for (const locale of locales) {
    const url = localizedPath(locale, route.path);
    const isNotFound = "notFound" in route;
    const isNoindex = isNotFound || "noindex" in route;

    test.describe(`${route.name} (${locale})`, () => {
      test("has no axe violations", async ({ page }) => {
        await page.goto(url);
        // Audit the rendered page: the 404 boundary renders in the browser.
        await expect(page.locator("h1")).toBeVisible();
        await settleAnimations(page);
        const { violations } = await new AxeBuilder({ page })
          .withTags([...WCAG_TAGS])
          .analyze();

        const summary = violations.map(
          (v) =>
            `${v.id} (${v.impact ?? "unknown"}): ${v.help} × ${v.nodes.length}`,
        );
        expect(summary).toEqual([]);
      });

      test("has exactly one h1, one site header and the right lang", async ({
        page,
      }) => {
        await page.goto(url);
        await expect(page.locator("h1")).toHaveCount(1);
        await expect(page.getByRole("banner")).toHaveCount(1);
        await expect(page.locator("html")).toHaveAttribute("lang", locale);
      });

      test("emits canonical and hreflang alternates", async ({ page }) => {
        test.skip(isNoindex, "a noindex page has no canonical URL");
        await page.goto(url);

        const canonical = page.locator('link[rel="canonical"]');
        await expect(canonical).toHaveCount(1);
        await expect(canonical).toHaveAttribute("href", new RegExp(`${url}$`));

        for (const hreflang of [...locales, "x-default"]) {
          await expect(
            page.locator(`link[rel="alternate"][hreflang="${hreflang}"]`),
          ).toHaveCount(1);
        }
      });

      test("answers with the right status and indexing", async ({ page }) => {
        const response = await page.goto(url);
        expect(response?.status()).toBe(isNotFound ? 404 : 200);
        const robots = page.locator('meta[name="robots"]');
        // Every page of a Vercel preview is noindex (src/lib/seo/deployment.ts).
        if (isNoindex || onPreview) {
          // Every robots tag must say noindex. The prerendered sample blog 404 gets
          // identical copies after hydration on Next.js 16.4.6 (one in the server HTML;
          // docs/tech-debt.md), so the count isn't asserted here.
          await expect(robots.first()).toHaveAttribute("content", /noindex/);
          const contents = await robots.evaluateAll((tags) =>
            tags.map((tag) => tag.getAttribute("content") ?? ""),
          );
          expect(contents.every((content) => content.includes("noindex"))).toBe(
            true,
          );
        } else {
          await expect(robots).toHaveCount(0);
        }
      });

      test("does not overflow horizontally at 390 px", async ({ page }) => {
        await page.setViewportSize(MOBILE_VIEWPORT);
        await page.goto(url);
        await expect(page.locator("h1")).toBeVisible();

        const overflow = await page.evaluate(
          () =>
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        );
        expect(overflow).toBeLessThanOrEqual(0);
      });

      test("has 44 px touch targets at 390 px", async ({ page }) => {
        // Reduced motion: scroll reveals become opacity only, so nothing is mid-slide
        // while it is hit-tested.
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.setViewportSize(MOBILE_VIEWPORT);
        await page.goto(url);
        await expect(page.locator("h1")).toBeVisible();

        expect(await findSmallTouchTargets(page)).toEqual([]);
      });
    });
  }
}
