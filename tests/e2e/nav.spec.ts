import { expect, test, type Page } from "@playwright/test";

/*
 * SiteNav behaviour (ticket #6). Layout per breakpoint is covered by the page harness
 * (axe, overflow); this file checks interaction.
 */

const isDesktop = (page: Page) => (page.viewportSize()?.width ?? 0) >= 1024;

/*
 * Opens the mobile menu. A tap that lands before React has hydrated the page does
 * nothing, so retry the tap until the dialog is open instead of racing hydration.
 */
async function openMenu(page: Page) {
  const dialog = page.getByRole("dialog", { name: "Menu" });
  await expect(async () => {
    await page.getByRole("button", { name: "Open menu" }).click();
    await expect(dialog).toBeVisible({ timeout: 1_000 });
  }).toPass();
  return dialog;
}

test.describe("site nav", () => {
  test("is sticky and shows the hairline only after scrolling", async ({
    page,
  }) => {
    await page.goto("/en");
    const header = page.locator("header").first();
    await expect(header).not.toHaveAttribute("data-scrolled");

    // mouse.wheel is unsupported in mobile WebKit; scroll the window directly.
    await page.evaluate(() => {
      window.scrollTo(0, 400);
    });
    await expect(header).toHaveAttribute("data-scrolled", "true");
    await expect(header).toBeInViewport();
  });

  test("language switcher keeps the page and remembers the choice", async ({
    page,
    context,
  }) => {
    await page.goto("/en");
    if (!isDesktop(page)) await openMenu(page);
    await page
      .getByRole("group", { name: "Language" })
      .getByRole("link", { name: /PT/ })
      .click();

    await expect(page).toHaveURL(/\/pt$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "pt");
    const cookies = await context.cookies();
    expect(cookies.find((c) => c.name === "NEXT_LOCALE")?.value).toBe("pt");
  });

  test("desktop shows the links; nothing is active on Home", async ({
    page,
  }) => {
    await page.goto("/en");
    test.skip(!isDesktop(page), "desktop only");

    const nav = page.getByRole("navigation", { name: "Main" });
    await expect(nav.getByRole("link")).toHaveCount(5);
    await expect(
      nav.getByRole("link", { name: "Track Project" }),
    ).toHaveAttribute("href", "/en/portal");
    await expect(nav.locator('[aria-current="page"]')).toHaveCount(0);
  });

  test("menu traps focus, closes on Esc and returns focus", async ({
    page,
  }) => {
    await page.goto("/en");
    test.skip(isDesktop(page), "tablet and mobile only");

    const trigger = page.getByRole("button", { name: "Open menu" });
    const dialog = await openMenu(page);
    await expect(dialog.getByRole("link", { name: "Services" })).toBeVisible();
    // The portal entry point is in the menu too (lead's decision, 2026-11-13).
    await expect(
      dialog.getByRole("link", { name: "Track Project" }),
    ).toBeVisible();

    for (let i = 0; i < 12; i += 1) await page.keyboard.press("Tab");
    expect(
      await dialog.evaluate((el) => el.contains(document.activeElement)),
    ).toBe(true);

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("menu links close the menu and navigate", async ({ page }) => {
    await page.goto("/en");
    test.skip(isDesktop(page), "tablet and mobile only");

    const dialog = await openMenu(page);
    await dialog.getByRole("link", { name: "Contact" }).click();

    await expect(page).toHaveURL(/\/en\/contact$/);
    await expect(dialog).toBeHidden();
  });
});
