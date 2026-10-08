import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { locales, localizedPath, routes } from "./routes";

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

    test.describe(`${route.name} (${locale})`, () => {
      test("has no axe violations", async ({ page }) => {
        await page.goto(url);
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

      test("does not overflow horizontally at 390 px", async ({ page }) => {
        await page.setViewportSize(MOBILE_VIEWPORT);
        await page.goto(url);

        const overflow = await page.evaluate(
          () =>
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        );
        expect(overflow).toBeLessThanOrEqual(0);
      });
    });
  }
}
