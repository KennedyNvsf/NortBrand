import { expect, test, type Page } from "@playwright/test";

/* Home page (ticket #9). Accessibility and overflow are covered by the page harness. */

const isMobile = (page: Page) => (page.viewportSize()?.width ?? 0) < 768;

test.describe("home page", () => {
  test("hero has the H1 and both calls to action", async ({ page }) => {
    await page.goto("/en");
    const hero = page.getByRole("region", { name: /Websites built like/ });

    await expect(hero.getByRole("heading", { level: 1 })).toHaveText(
      "Websites built like products, not brochures.",
    );
    await expect(
      hero.getByRole("link", { name: "Book a Consultation" }),
    ).toHaveAttribute("href", "/en/contact");
    await expect(
      hero.getByRole("link", { name: "View Services" }),
    ).toHaveAttribute("href", "/en/services");
  });

  test("lists the five services, each linking to its block", async ({
    page,
  }) => {
    await page.goto("/pt");
    const services = page.getByRole("region", { name: /studio/ });
    const cards = services.locator('[data-slot="service-card"]');

    await expect(cards).toHaveCount(5);
    await expect(cards.first()).toHaveAttribute(
      "href",
      "/pt/services#web-design",
    );
  });

  test("shows the four process steps in order", async ({ page }) => {
    await page.goto("/en");
    const steps = page
      .getByRole("region", { name: /A clear process/ })
      .getByRole("listitem");

    await expect(steps).toHaveCount(4);
    await expect(steps.getByRole("heading", { level: 3 })).toHaveText([
      "Discover",
      "Design",
      "Build",
      "Launch & Grow",
    ]);
  });

  test("sticky CTA appears after the hero and steps aside for the CTA band", async ({
    page,
  }) => {
    await page.goto("/en");
    test.skip(!isMobile(page), "mobile only");

    const sticky = page.getByRole("complementary", {
      name: "Book a free consultation",
    });
    await expect(sticky).not.toHaveAttribute("data-visible");

    await page.evaluate(() => {
      window.scrollTo(0, 1600);
    });
    await expect(sticky).toHaveAttribute("data-visible", "true");

    await page
      .locator('section[aria-labelledby="cta-band-title"]')
      .scrollIntoViewIfNeeded();
    await expect(sticky).not.toHaveAttribute("data-visible");
  });
});
