import { expect, test } from "@playwright/test";

test.describe("locale routing", () => {
  test("bare / falls back to pt without a cookie or matching Accept-Language", async ({
    browser,
  }) => {
    const context = await browser.newContext({ locale: "fr-FR" });
    const page = await context.newPage();
    await page.goto("/");
    await expect(page).toHaveURL(/\/pt$/);
    await context.close();
  });

  test("bare / honours Accept-Language", async ({ browser }) => {
    const context = await browser.newContext({ locale: "en-GB" });
    const page = await context.newPage();
    await page.goto("/");
    await expect(page).toHaveURL(/\/en$/);
    await context.close();
  });

  test("prefixed URLs are never redirected", async ({ browser }) => {
    const context = await browser.newContext({ locale: "pt-PT" });
    const page = await context.newPage();
    await page.goto("/en");
    await expect(page).toHaveURL(/\/en$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await context.close();
  });
});
