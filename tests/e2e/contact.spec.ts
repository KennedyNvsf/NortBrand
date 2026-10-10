import { expect, test, type Page } from "@playwright/test";

/* Contact page (ticket #12). Accessibility and overflow are covered by the page harness. */

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
      details.getByRole("link", { name: /hello@nortbrand\.com/ }),
    ).toHaveAttribute("href", "mailto:hello@nortbrand.com");
    await expect(
      details.getByRole("link", { name: /\+351 000 000 000/ }),
    ).toHaveAttribute("href", "tel:+351000000000");
    await expect(details).toContainText("Mon – Fri · 9:00 – 18:00");
  });

  test("the consultation form cannot be submitted yet", async ({ page }) => {
    await page.goto("/en/contact");
    const card = page.locator('[data-form-slot="consultation"]');

    await expect(page.locator("form")).toHaveCount(0);
    for (const name of [
      "Name",
      "Email",
      "Phone (optional)",
      "Tell us about your project",
    ]) {
      await expect(card.getByLabel(name, { exact: true })).toBeDisabled();
    }
    await expect(
      card.getByRole("combobox", { name: "I’m interested in" }),
    ).toBeDisabled();
    await expect(
      card.getByRole("button", { name: "Send Request" }),
    ).toBeDisabled();
    await expect(
      card.getByRole("link", { name: "hello@nortbrand.com" }),
    ).toHaveAttribute("href", "mailto:hello@nortbrand.com");
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
