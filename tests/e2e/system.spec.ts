import { expect, test } from "@playwright/test";

/*
 * System states (ticket #14): the designed 404 and the first-load splash. The page
 * harness also covers an unknown page in both locales (status, noindex, axe, one H1,
 * overflow).
 */

test.describe("404", () => {
  for (const [path, lang, home] of [
    ["/en/no-such-page", "en", "/en"],
    ["/pt/no-such-page", "pt", "/pt"],
    ["/en/no/such/page", "en", "/en"],
    ["/blog", "pt", "/pt"],
  ] as const) {
    test(`${path} serves the localized 404 with the nav and no footer`, async ({
      page,
    }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(404);

      await expect(page.locator("h1")).toBeVisible();
      await expect(page.locator("html")).toHaveAttribute("lang", lang);
      await expect(page.getByRole("banner")).toHaveCount(1);
      await expect(page.locator("footer")).toHaveCount(0);
      await expect(page.locator('[data-slot="sticky-cta"]')).toHaveCount(0);
      await expect(
        page.getByRole("main").getByRole("link").first(),
      ).toHaveAttribute("href", home);
    });
  }
});

test.describe("404 title (#94)", () => {
  // The boundary renders in the browser, so the title arrives with it: React hoists the
  // <title> in front of the layout's default one, which stays in the minimal server
  // document. The first <title> is the document title. Before #94 the tab kept Home's.
  for (const [path, title] of [
    ["/en/no-such-page", "Page not found · NortBrand"],
    ["/pt/no-such-page", "Página não encontrada · NortBrand"],
    ["/en/blog/no-such-post", "Page not found · NortBrand"],
    ["/pt/blog/no-such-post", "Página não encontrada · NortBrand"],
  ] as const) {
    test(`${path} has its own localized title`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(404);
      await expect(page).toHaveTitle(title);
      await expect(page.locator("head title").first()).toHaveJSProperty(
        "textContent",
        title,
      );
    });
  }

  test("leaving the 404 restores the next page's title", async ({ page }) => {
    await page.goto("/en/no-such-page");
    await expect(page).toHaveTitle("Page not found · NortBrand");
    await page.getByRole("main").getByRole("link").first().click();
    await page.waitForURL("**/en");
    await expect(page).not.toHaveTitle(/Page not found/);
    await expect(page.locator("head title")).toHaveCount(1);
  });
});

test.describe("loading splash", () => {
  test("never appears on a fast load", async ({ page }) => {
    await page.goto("/en");
    await expect(page.locator("html")).toHaveAttribute("data-splash", "done");
    await expect(page.locator('[data-slot="loading-splash"]')).toBeHidden();
  });

  test("covers a slow first load after 400 ms, then gets out of the way", async ({
    page,
  }) => {
    // Hold every image so the window load event is late.
    await page.route("**/_next/image**", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2500));
      await route.continue();
    });
    await page.goto("/en/services", { waitUntil: "commit" });

    const splash = page.locator('[data-slot="loading-splash"]');
    // Read the state and the CSS in one synchronous call while the load is pending,
    // so the two cannot drift apart. Assert the CSS contract rather than visibility:
    // Playwright treats opacity 0 as visible, and the fade-in's timing depends on how
    // busy the browser is.
    const pending = await page.waitForFunction(() => {
      const element = document.querySelector('[data-slot="loading-splash"]');
      if (document.documentElement.dataset.splash !== "pending" || !element) {
        return null;
      }
      const style = getComputedStyle(element);
      return {
        display: style.display,
        animationName: style.animationName,
        animationDelay: style.animationDelay,
        pointerEvents: style.pointerEvents,
      };
    });
    expect(await pending.jsonValue()).toEqual({
      display: "flex",
      animationName: "splash-in",
      animationDelay: "0.4s",
      pointerEvents: "none",
    });

    await page.waitForLoadState("load");
    await expect(page.locator("html")).toHaveAttribute("data-splash", "done");
    await expect(splash).toBeHidden();
  });

  test.describe("without JavaScript", () => {
    test.use({ javaScriptEnabled: false });

    test("never covers the page", async ({ page }) => {
      await page.goto("/en/services");
      await page.waitForTimeout(800);
      await expect(page.locator('[data-slot="loading-splash"]')).toBeHidden();
      await expect(page.locator("h1")).toBeVisible();
    });
  });

  test.describe("with reduced motion", () => {
    test.use({ reducedMotion: "reduce" });

    test("keeps the mark and bar static", async ({ page }) => {
      await page.goto("/en");
      const animations = await page
        .locator(
          '[data-slot="loading-splash"] path, [data-slot="loading-splash"] .origin-left',
        )
        .evaluateAll((elements) =>
          elements.map((element) => getComputedStyle(element).animationName),
        );
      expect(animations.length).toBe(2);
      expect(animations.every((name) => name === "none")).toBe(true);
    });
  });
});
