import { expect, test } from "@playwright/test";

/*
 * CtaBand (ticket #8). It ends the placeholder home page today; Home (#9) keeps it.
 * StickyCta behaviour is unit-tested (sticky-cta.test.tsx); it is mounted on the blog
 * listing in the blog milestone, where it gets its e2e test.
 */
test.describe("CTA band", () => {
  test("has a headline with the highlighted keyword and links to contact", async ({
    page,
  }) => {
    await page.goto("/en");
    const band = page.getByRole("region", { name: /Let’s talk/ });
    await expect(band).toBeVisible();
    await expect(
      band.getByRole("heading", { level: 2 }).locator(".text-action-primary"),
    ).toHaveText("talk");
    await expect(
      band.getByRole("link", { name: "Book a Consultation" }),
    ).toHaveAttribute("href", "/en/contact");
  });
});
