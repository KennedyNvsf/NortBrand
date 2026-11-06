import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { settleAnimations } from "./settle";

/*
 * Cookie banner and preferences (#42, ADR-007). Every other spec starts with a choice
 * already made (playwright.config.ts); these start without one.
 */

test.use({ storageState: { cookies: [], origins: [] } });

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

function banner(page: Page) {
  return page.getByRole("region", { name: "Cookies, kept simple." });
}

async function consentCookie(page: Page) {
  const cookies = await page.context().cookies();
  return cookies.find((cookie) => cookie.name === "nb_consent");
}

test.describe("cookie banner", () => {
  test("appears on a first visit, without blocking the page", async ({
    page,
  }) => {
    await page.goto("/en");
    await expect(banner(page)).toBeVisible();
    // Not modal: nothing behind it is inert or hidden, and focus stays put.
    await expect(page.locator("main")).not.toHaveAttribute("inert");
    await expect(page.locator("[role=dialog]")).toHaveCount(0);
    const pageLink = page.locator("main a").first();
    await pageLink.focus();
    await expect(pageLink).toBeFocused();

    await settleAnimations(page);

    const { violations } = await new AxeBuilder({ page })
      .include("[data-consent-banner]")
      .withTags(WCAG_TAGS)
      .analyze();
    expect(violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });

  test("gives Accept and Reject the same size", async ({ page }) => {
    await page.goto("/en");
    const reject = banner(page).getByRole("button", {
      name: "Reject non-essential",
    });
    const accept = banner(page).getByRole("button", { name: "Accept all" });
    await expect(accept).toBeVisible();
    const [a, r] = await Promise.all([
      accept.boundingBox(),
      reject.boundingBox(),
    ]);
    expect(Math.round(a?.width ?? 0)).toBe(Math.round(r?.width ?? 0));
    expect(Math.round(a?.height ?? 0)).toBe(Math.round(r?.height ?? 0));
  });

  test("Reject stores the choice for 6 months and does not ask again", async ({
    page,
  }) => {
    await page.goto("/en");
    await banner(page)
      .getByRole("button", { name: "Reject non-essential" })
      .click();
    await expect(banner(page)).toHaveCount(0);

    const cookie = await consentCookie(page);
    expect(cookie?.value).toBe("v1.0");
    const days = ((cookie?.expires ?? 0) - Date.now() / 1000) / 86_400;
    expect(days).toBeGreaterThan(181);
    expect(days).toBeLessThan(183);

    await page.goto("/en/about");
    await expect(page.locator("h1")).toBeVisible();
    await expect(banner(page)).toHaveCount(0);
  });

  test("works with the keyboard alone", async ({ page }) => {
    await page.goto("/en");
    const accept = banner(page).getByRole("button", { name: "Accept all" });
    await expect(accept).toBeVisible();
    await accept.focus();
    await page.keyboard.press("Enter");
    await expect(banner(page)).toHaveCount(0);
    expect((await consentCookie(page))?.value).toBe("v1.1");
  });

  test("shows on the 404 too", async ({ page }) => {
    await page.goto("/en/no-such-page");
    await expect(banner(page)).toBeVisible();
  });
});

test.describe("cookie preferences", () => {
  test("Manage preferences saves analytics on", async ({ page }) => {
    await page.goto("/en");
    await banner(page)
      .getByRole("button", { name: "Manage preferences" })
      .click();

    const dialog = page.getByRole("dialog", { name: "Cookie preferences" });
    await expect(dialog).toBeVisible();
    const essential = dialog.getByRole("switch", { name: "Essential cookies" });
    const analytics = dialog.getByRole("switch", { name: "Analytics cookies" });
    await expect(essential).toBeChecked();
    await expect(essential).toBeDisabled();
    await expect(analytics).not.toBeChecked();

    await settleAnimations(page);

    const { violations } = await new AxeBuilder({ page })
      .include("[data-consent-preferences]")
      .withTags(WCAG_TAGS)
      .analyze();
    expect(violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);

    await analytics.click();
    await expect(analytics).toBeChecked();
    await dialog.getByRole("button", { name: "Save preferences" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(banner(page)).toHaveCount(0);
    expect((await consentCookie(page))?.value).toBe("v1.1");
  });

  test("Escape closes without saving, and the banner stays", async ({
    page,
  }) => {
    await page.goto("/en");
    await banner(page)
      .getByRole("button", { name: "Manage preferences" })
      .click();
    const dialog = page.getByRole("dialog", { name: "Cookie preferences" });
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(banner(page)).toBeVisible();
    expect(await consentCookie(page)).toBeUndefined();
  });

  test("the footer reopens them with the saved choice", async ({ page }) => {
    await page.goto("/en");
    await banner(page).getByRole("button", { name: "Accept all" }).click();

    await page.getByRole("button", { name: "Cookie settings" }).click();
    const dialog = page.getByRole("dialog", { name: "Cookie preferences" });
    const analytics = dialog.getByRole("switch", { name: "Analytics cookies" });
    await expect(analytics).toBeChecked();

    await dialog.getByRole("button", { name: "Reject all" }).click();
    await expect(dialog).toHaveCount(0);
    expect((await consentCookie(page))?.value).toBe("v1.0");
  });
});

test.describe("sticky CTA", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("appears only after a cookie choice", async ({ page }) => {
    await page.goto("/en");
    const sticky = page.locator('[data-slot="sticky-cta"]');
    await expect(banner(page)).toBeVisible();
    // Past the hero (mobile WebKit has no mouse wheel).
    await page.evaluate(() => {
      window.scrollTo(0, 1200);
    });
    await expect(sticky).not.toHaveAttribute("data-visible");

    await banner(page)
      .getByRole("button", { name: "Reject non-essential" })
      .click();
    await expect(sticky).toHaveAttribute("data-visible", "true");
  });
});
