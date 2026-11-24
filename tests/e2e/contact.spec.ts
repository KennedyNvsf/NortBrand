import { expect, test, type Page } from "@playwright/test";

/* Contact page (ticket #12). Accessibility and overflow are covered by the page harness;
   the consultation form has its own spec (consultation-form.spec.ts). */

const isMobile = (page: Page) => (page.viewportSize()?.width ?? 0) < 768;

test.describe("contact page", () => {
  test("hero has the H1 and contact details as links", async ({ page }) => {
    await page.goto("/en/contact");
    const hero = page.getByRole("region", { name: /Let’s start with a/ });

    await expect(hero.getByRole("heading", { level: 1 })).toHaveText(
      "Let’s start with a conversation.",
    );
    const details = hero.getByRole("list", { name: "Contact details" });
    await expect(
      details.getByRole("link", { name: /studio@nortbrand.pt/ }),
    ).toHaveAttribute("href", "mailto:studio@nortbrand.pt");
    await expect(details).toContainText("Mon – Fri · 9:00 – 18:00");
    // No public phone number (#79).
    await expect(details.locator('a[href^="tel:"]')).toHaveCount(0);
    await expect(details.getByRole("listitem")).toHaveCount(2);
  });

  test("has no sticky CTA", async ({ page }) => {
    await page.goto("/en/contact");
    test.skip(!isMobile(page), "the sticky CTA is mobile only");

    await page.evaluate(() => {
      window.scrollTo(0, 1600);
    });
    await expect(
      page.getByRole("complementary", { name: "Book a free consultation" }),
    ).not.toHaveAttribute("data-visible");
  });

  test("FAQ opens one answer at a time", async ({ page }) => {
    await page.goto("/en/contact");
    const faq = page.getByRole("region", { name: /Frequently asked/ });
    const first = faq.getByRole("button", {
      name: "How much does a website cost?",
    });
    const second = faq.getByRole("button", {
      name: "How long does a project take?",
    });
    await expect(first).toHaveAttribute("aria-expanded", "true");

    // Retry the click until React has hydrated the accordion.
    await expect(async () => {
      if ((await second.getAttribute("aria-expanded")) !== "true") {
        await second.click();
      }
      await expect(second).toHaveAttribute("aria-expanded", "true", {
        timeout: 1000,
      });
    }).toPass({ timeout: 15_000 });
    await expect(first).toHaveAttribute("aria-expanded", "false");
  });
});
