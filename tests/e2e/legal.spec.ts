import { expect, test, type Page } from "@playwright/test";

/* Legal pages (ticket #13). Accessibility and overflow are covered by the page harness. */

const isDesktop = (page: Page) => (page.viewportSize()?.width ?? 0) >= 1024;

test.describe("legal pages", () => {
  test("privacy: one H1, a numbered H2 per section, email from site config", async ({
    page,
  }) => {
    await page.goto("/en/legal/privacy");

    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Privacy Policy",
    );
    // Scoped to <main>: the footer has its own H2 column headings.
    await expect(
      page.getByRole("main").getByRole("heading", { level: 2 }),
    ).toHaveCount(8);
    await expect(page.locator("#your-rights h2")).toHaveText("Your rights");
    await expect(
      page
        .locator("article")
        .getByRole("link", { name: "studio@nortbrand.pt" }),
    ).toHaveCount(3);
    await expect(
      page.getByText(/^Last updated: November 25, 2026$/),
    ).toBeVisible();
  });

  test("terms: one H1 and nine sections", async ({ page }) => {
    await page.goto("/en/legal/terms");

    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Terms of Use",
    );
    await expect(
      page.getByRole("main").getByRole("heading", { level: 2 }),
    ).toHaveCount(9);
  });

  test("the on-this-page list follows the reader (desktop)", async ({
    page,
  }) => {
    await page.goto("/en/legal/privacy");
    test.skip(!isDesktop(page), "the list is desktop only");

    const toc = page.getByRole("navigation", { name: "On this page" });
    await expect(toc.getByRole("link")).toHaveCount(8);
    await expect(toc.getByRole("link", { name: "Who we are" })).toHaveAttribute(
      "aria-current",
      "location",
    );

    await toc.getByRole("link", { name: "Your rights" }).click();
    await expect(page).toHaveURL(/#your-rights$/);
    await expect(
      toc.getByRole("link", { name: "Your rights" }),
    ).toHaveAttribute("aria-current", "location");
    await expect(
      toc.getByRole("link", { name: "Who we are" }),
    ).not.toHaveAttribute("aria-current");
  });

  test("the questions note sits under the article below desktop", async ({
    page,
  }) => {
    await page.goto("/en/legal/terms");
    test.skip(isDesktop(page), "desktop shows it in the sidebar");

    await expect(
      page
        .getByRole("main")
        .getByText("Questions about this page?")
        .filter({ visible: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "On this page" }),
    ).toBeHidden();
  });
});
