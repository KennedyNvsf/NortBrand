import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/*
 * The blog post page (#61) against the e2e fixtures (src/features/blog/e2e-backend.ts,
 * E2E_FAKE_BACKEND=1). The first three posts exist in English and Portuguese with
 * different slugs; the others are English only. Every fixture body has four h2
 * sections, a quote and a three-point list.
 */

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

const translated = {
  en: "/en/blog/why-your-website-should-work-like-a-product-not-a-brochure",
  pt: "/pt/blog/pt-why-your-website-should-work-like-a-product-not-a-brochure",
};
const englishOnly = "/en/blog/the-real-cost-of-a-slow-website";

const isDesktop = (page: Page) => (page.viewportSize()?.width ?? 0) >= 1024;

function toc(page: Page) {
  return page.getByRole("navigation", { name: "On this page" });
}

test.describe("blog post", () => {
  test("renders the article, its byline and related posts", async ({
    page,
  }) => {
    await page.goto(translated.en);
    await expect(page.locator("h1")).toHaveText(
      "Why Your Website Should Work Like a Product, Not a Brochure",
    );
    await expect(page.locator("h1")).toHaveCount(1);

    const breadcrumb = page.getByRole("navigation", { name: "Breadcrumb" });
    await expect(
      breadcrumb.getByRole("link", { name: "Blog" }),
    ).toHaveAttribute("href", "/en/blog");
    await expect(
      breadcrumb.getByRole("link", { name: "Web Design" }),
    ).toHaveAttribute("href", "/en/blog?category=design");

    await expect(page.getByText(/\d+ min read/)).toBeVisible();
    await expect(page.locator("article h2")).toHaveCount(4);
    await expect(page.locator("article blockquote")).toContainText(
      "They use them.",
    );

    const related = page.getByRole("region", { name: /More from/ });
    await expect(related.locator('[data-slot="article-card"]')).toHaveCount(3);
    // The same category first: both other design posts lead.
    await expect(
      related.locator('[data-slot="article-card"]').first(),
    ).toContainText("How to Choose Colors That Actually Convert");

    const { violations } = await new AxeBuilder({ page })
      .include("main")
      .withTags(WCAG_TAGS)
      .analyze();
    expect(violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });

  test("the table of contents follows the section being read", async ({
    page,
  }) => {
    await page.goto(translated.en);
    test.skip(!isDesktop(page), "the table of contents is desktop only");

    const list = toc(page);
    await expect(list.getByRole("link")).toHaveCount(4);
    await expect(list.getByRole("link").first()).toHaveAttribute(
      "aria-current",
      "location",
    );

    await list.getByRole("link", { name: "Start with the action" }).click();
    await expect(page).toHaveURL(/#start-with-the-action$/);
    await expect(
      list.getByRole("link", { name: "Start with the action" }),
    ).toHaveAttribute("aria-current", "location");
  });

  test("switching language opens the translation", async ({ page }) => {
    await page.goto(translated.en);
    test.skip(!isDesktop(page), "the switcher is in the menu below desktop");
    await page.getByRole("link", { name: "PT – Português" }).click();
    await expect(page).toHaveURL(translated.pt);
    // By role: after a client navigation Next keeps the previous page hidden in the
    // DOM, so a bare "h1" selector would also match the English title.
    await expect(page.getByRole("heading", { level: 1 })).toContainText("[PT]");
  });

  test("switching language without a translation opens the listing", async ({
    page,
  }) => {
    await page.goto(englishOnly);
    test.skip(!isDesktop(page), "the switcher is in the menu below desktop");
    await page.getByRole("link", { name: "PT – Português" }).click();
    await expect(page).toHaveURL(/\/pt\/blog$/);
  });

  test("a slug from the other language redirects instead of a 404", async ({
    page,
  }) => {
    // What a language switch clicked before hydration (or without JavaScript) requests.
    const withTranslation = await page.goto(
      translated.en.replace("/en/", "/pt/"),
    );
    expect(withTranslation?.status()).toBe(200);
    await expect(page).toHaveURL(translated.pt);

    await page.goto(englishOnly.replace("/en/", "/pt/"));
    await expect(page).toHaveURL(/\/pt\/blog$/);
  });

  test("canonical and hreflang list the post's real translations", async ({
    page,
  }) => {
    const alternate = (lang: string) =>
      page.locator(`head link[rel="alternate"][hreflang="${lang}"]`);

    await page.goto(translated.pt);
    await expect(page.locator('head link[rel="canonical"]')).toHaveAttribute(
      "href",
      new RegExp(`${translated.pt}$`),
    );
    await expect(alternate("en")).toHaveAttribute(
      "href",
      new RegExp(`${translated.en}$`),
    );
    await expect(alternate("x-default")).toHaveCount(1);

    await page.goto(englishOnly);
    await expect(alternate("en")).toHaveCount(1);
    await expect(alternate("pt")).toHaveCount(0);
  });

  test("an unknown slug is the designed 404", async ({ page }) => {
    const response = await page.goto("/en/blog/no-such-post");
    expect(response?.status()).toBe(404);
  });
});

test.describe("blog post on mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("stacks the page, offers Get started and no Sticky CTA", async ({
    page,
  }) => {
    await page.goto(translated.pt);
    await expect(toc(page)).toBeHidden();
    await expect(
      page.getByRole("link", { name: /Agendar|Book a Consultation/ }).last(),
    ).toBeVisible();

    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);

    await page.evaluate(() => {
      window.scrollTo(0, 1600);
    });
    await expect(page.locator('[data-slot="sticky-cta"]')).not.toHaveAttribute(
      "data-visible",
    );
  });
});
