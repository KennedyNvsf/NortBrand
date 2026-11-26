import { expect, test } from "@playwright/test";

import { copy } from "./copy";

/*
 * CtaBand (ticket #8), checked on Home, which ends with it and passes its own copy
 * (`Home.cta`, #77).
 * StickyCta behaviour is unit-tested (sticky-cta.test.tsx); its e2e test is on the blog
 * listing, the page that mounts it (blog.spec.ts).
 */
test.describe("CTA band", () => {
  test("has a headline with the highlighted keyword and links to contact", async ({
    page,
  }) => {
    await page.goto("/en");
    const band = page.getByRole("region", {
      name: copy("en", "Home.cta.headline"),
    });
    await expect(band).toBeVisible();
    await expect(
      band.getByRole("heading", { level: 2 }).locator(".text-action-primary"),
    ).toHaveText("converts");
    await expect(
      band.getByRole("link", { name: "Book a Consultation" }),
    ).toHaveAttribute("href", "/en/contact");
  });
});
