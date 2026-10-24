import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { copy, localeOf } from "./copy";

/*
 * The blog listing (#60) against the e2e fixtures (src/features/blog/e2e-backend.ts,
 * E2E_FAKE_BACKEND=1): 10 English posts, the newest featured, so the grid holds 9 over
 * two pages of 8; categories Web Design, Branding, Content; 3 Portuguese posts.
 */

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

function cards(page: Page) {
  return page.locator('[data-slot="article-card"]');
}

function featured(page: Page) {
  return page.getByRole("region", {
    name: copy(localeOf(new URL(page.url()).pathname), "Blog.featuredLabel"),
  });
}

async function expectNoAxeViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .include("main")
    .withTags(WCAG_TAGS)
    .analyze();
  expect(violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
}

test.describe("blog listing", () => {
  test("shows the featured article and eight cards per page", async ({
    page,
  }) => {
    await page.goto("/en/blog");
    await expect(page.locator("h1")).toHaveText(copy("en", "Blog.title"));
    await expect(featured(page)).toContainText(
      "Why Your Website Should Work Like a Product, Not a Brochure",
    );
    await expect(cards(page)).toHaveCount(8);
    await expect(cards(page).first()).toContainText(
      "5 Signs Your Brand Needs a Refresh",
    );
    // The featured post is not repeated in the grid.
    await expect(cards(page).filter({ hasText: "Like a Product" })).toHaveCount(
      0,
    );

    const pagination = page.getByRole("navigation", { name: "Pagination" });
    await expect(
      pagination.getByRole("link", { name: "Page 1" }),
    ).toHaveAttribute("aria-current", "page");
    await pagination.getByRole("link", { name: "Page 2" }).click();
    await expect(page).toHaveURL(/\/en\/blog\?page=2$/);
    await expect(cards(page)).toHaveCount(1);
    await expect(featured(page)).toHaveCount(0);
    await expectNoAxeViolations(page);
  });

  test("filters by category and keeps it in the URL", async ({ page }) => {
    await page.goto("/en/blog");
    const filters = page.getByRole("navigation", {
      name: "Filter by category",
    });
    await filters.getByRole("link", { name: "Branding" }).click();

    await expect(page).toHaveURL(/\?category=branding$/);
    await expect(
      filters.getByRole("link", { name: "Branding" }),
    ).toHaveAttribute("aria-current", "true");
    await expect(featured(page)).toHaveCount(0);
    await expect(cards(page)).toHaveCount(2);

    await page.reload();
    await expect(cards(page)).toHaveCount(2);
    await page.goBack();
    await expect(page).toHaveURL(/\/en\/blog$/);
    await expect(cards(page)).toHaveCount(8);
  });

  test("searches as you type and announces the result count", async ({
    page,
  }) => {
    await page.goto("/en/blog");
    const search = page.getByRole("searchbox", { name: "Search articles" });
    // Typing before React hydrates the field does nothing: retry until the URL follows.
    await expect(async () => {
      await search.fill("");
      await search.fill("bra ref");
      await expect(page).toHaveURL(/\?q=bra\+ref$/, { timeout: 1000 });
    }).toPass();
    await expect(cards(page)).toHaveCount(1);
    await expect(cards(page)).toContainText(
      "5 Signs Your Brand Needs a Refresh",
    );
    await expect(page.getByText(/^Showing \d+ of/)).toHaveText(
      "Showing 1 of 1 article",
    );
  });

  test("shows No Results and clears the filters", async ({ page }) => {
    await page.goto("/en/blog?q=zebra");
    await expect(
      page.getByRole("heading", { name: "No articles found." }),
    ).toBeVisible();
    await expect(page.locator("main")).toContainText(
      "We couldn’t find anything for “zebra”",
    );
    await expectNoAxeViolations(page);

    await page.getByRole("link", { name: "Clear filters" }).click();
    await expect(page).toHaveURL(/\/en\/blog$/);
    await expect(
      page.getByRole("searchbox", { name: "Search articles" }),
    ).toHaveValue("");
    await expect(cards(page)).toHaveCount(8);
  });

  test("sorts oldest first", async ({ page }) => {
    await page.goto("/en/blog");
    const oldest = page.getByRole("option", { name: "Oldest" });
    // A click before React hydrates the Select does nothing: retry until it opens.
    await expect(async () => {
      await page.getByRole("combobox", { name: "Sort articles" }).click();
      await expect(oldest).toBeVisible({ timeout: 1000 });
    }).toPass();
    await oldest.click();

    await expect(page).toHaveURL(/\?sort=oldest$/);
    await expect(cards(page).first()).toContainText(
      "Brand Voice for Small Teams",
    );
  });

  test("ignores a malformed URL instead of failing", async ({ page }) => {
    const response = await page.goto(
      "/en/blog?page=abc&sort=random&category=%3Cscript%3E",
    );
    expect(response?.status()).toBe(200);
    await expect(cards(page)).toHaveCount(8);
  });

  test("lists Portuguese posts with translated copy", async ({ page }) => {
    await page.goto("/pt/blog");
    await expect(page.locator("h1")).toHaveText(copy("pt", "Blog.title"));
    await expect(featured(page)).toContainText("[PT]");
    await expect(cards(page)).toHaveCount(2);
  });
});

test.describe("blog listing on mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("shows the count, scrolls the chips and offers the Sticky CTA", async ({
    page,
  }) => {
    await page.goto("/en/blog");
    await expect(page.getByText(/^Showing \d+ of/)).toBeVisible();
    await expect(page.getByText(/^Showing \d+ of/)).toHaveText(
      "Showing 8 of 9 articles",
    );

    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);

    const sticky = page.locator('[data-slot="sticky-cta"]');
    await expect(sticky).not.toHaveAttribute("data-visible");
    await page.evaluate(() => {
      window.scrollTo(0, 1400);
    });
    await expect(sticky).toHaveAttribute("data-visible", "true");
  });
});
