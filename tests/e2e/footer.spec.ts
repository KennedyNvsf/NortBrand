import { expect, test } from "@playwright/test";

/* SiteFooter (ticket #7). Layout and contrast are covered by the page harness. */

test.describe("site footer", () => {
  test("is the page's contentinfo landmark with every column", async ({
    page,
  }) => {
    await page.goto("/en");
    const footer = page.getByRole("contentinfo");
    await expect(footer).toBeVisible();

    for (const heading of ["Services", "Company", "Follow us"]) {
      await expect(
        footer.getByRole("heading", { level: 2, name: heading }),
      ).toBeVisible();
    }
  });

  test("links services to their anchors on the Services page", async ({
    page,
  }) => {
    await page.goto("/en");
    const services = page
      .getByRole("contentinfo")
      .getByRole("region", { name: "Services" });

    await expect(services.getByRole("link")).toHaveCount(5);
    await expect(
      services.getByRole("link", { name: "UX/UI & Brand Design" }),
    ).toHaveAttribute("href", "/en/services#web-design");
  });

  test("lists About, Blog and Contact under Company, in the page locale", async ({
    page,
  }) => {
    await page.goto("/pt");
    const company = page
      .getByRole("contentinfo")
      .locator("section[aria-labelledby='footer-company']");

    const hrefs = await company
      .getByRole("link")
      .evaluateAll((links) => links.map((link) => link.getAttribute("href")));
    expect(hrefs).toEqual(["/pt/about", "/pt/blog", "/pt/contact"]);
  });

  test("links Follow us to the NortBrand profiles (#171)", async ({ page }) => {
    await page.goto("/en");
    const follow = page
      .getByRole("contentinfo")
      .locator("section[aria-labelledby='footer-follow']");

    await expect(
      follow.getByRole("link", { name: "Instagram" }),
    ).toHaveAttribute("href", "https://www.instagram.com/nortbrand_pt/");
    await expect(
      follow.getByRole("link", { name: "LinkedIn" }),
    ).toHaveAttribute("href", "https://www.linkedin.com/company/nortbrand/");
  });

  test("shows the current year and the legal links", async ({ page }) => {
    await page.goto("/en");
    const footer = page.getByRole("contentinfo");

    await expect(footer).toContainText(
      `© ${new Date().getFullYear()} NortBrand`,
    );
    const legal = footer.getByRole("navigation", { name: "Legal" });
    await expect(
      legal.getByRole("link", { name: "Privacy Policy" }),
    ).toHaveAttribute("href", "/en/legal/privacy");
    await expect(
      legal.getByRole("link", { name: "Terms of Use" }),
    ).toHaveAttribute("href", "/en/legal/terms");
  });
});
