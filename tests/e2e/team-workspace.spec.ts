import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { findSmallTouchTargets } from "./touch-targets";

/*
 * My tickets, Team and search (#142) on the fake backend. Search's access rule (never a
 * project the teammate can't read) and the last-admin rule are proven in SQL (pgTAP 15);
 * here: the pages and flows. Role changes use a teammate invited by the test, so the
 * shared fake roster's admin and member stay as they are for other specs.
 */

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function teamSignIn(page: Page, email = "admin@e2e.example") {
  await page.goto("/team/sign-in");
  await page.getByLabel("Email").fill(email);
  const send = page.getByRole("button", { name: "Send me a code" });
  await expect(async () => {
    await send.click();
    await expect(send).toBeHidden({ timeout: 2000 });
  }).toPass();
  await page.getByRole("textbox", { name: "6-digit code 1/6" }).click();
  await page.keyboard.type("123456");
  await expect(page).toHaveURL(/\/team$/);
}

async function checkPage(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(WCAG_TAGS)
    .analyze();
  expect(violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  await expect(page.locator("h1:visible")).toHaveCount(1);
  if ((page.viewportSize()?.width ?? 0) < 768) {
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    expect(await findSmallTouchTargets(page)).toEqual([]);
  }
}

test.describe("My tickets", () => {
  test("groups my tickets by due date and opens one on its board", async ({
    page,
  }) => {
    await teamSignIn(page);
    await page.goto("/team/my-tickets");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "My tickets",
    );
    for (const group of ["Overdue", "This week", "Later"]) {
      await expect(
        page.getByRole("heading", { level: 2, name: new RegExp(`^${group}`) }),
      ).toBeVisible();
    }
    const overdue = page.getByRole("region", { name: /^Overdue/ });
    await expect(
      overdue.getByText("Menu photos for the menu page"),
    ).toBeVisible();
    await checkPage(page);

    await overdue
      .getByRole("link", { name: /Menu photos for the menu page/ })
      .click();
    await expect(page).toHaveURL(/\/team\/projects\/NB-1234\/board\?ticket=9$/);
  });
});

test.describe("Team", () => {
  test("shows the people table and changes an invited teammate's role", async ({
    page,
  }, testInfo) => {
    const run = `${testInfo.project.name}-${String(Date.now()).slice(-6)}`;
    const name = `Role Person ${run}`;
    await teamSignIn(page);
    await page.goto("/team/team");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Team");
    await expect(page.getByRole("table", { name: "Teammates" })).toBeVisible();
    await checkPage(page);

    await page.getByRole("button", { name: "Invite teammate" }).click();
    await page.getByLabel("Name").fill(name);
    await page.getByLabel("Email").fill(`role-${run}@e2e.example`);
    await page.getByRole("button", { name: "Send invite" }).click();
    await expect(page.getByText("Invited.")).toBeVisible();

    await page.getByRole("combobox", { name: `Role for ${name}` }).click();
    await page.getByRole("option", { name: "Admin" }).click();
    await expect(page.getByText(`${name} is now admin.`)).toBeVisible();

    // Clean up: remove the teammate again.
    await page.getByRole("button", { name: `Remove ${name}` }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Remove", exact: true })
      .click();
    await expect(page.getByText("Removed.")).toBeVisible();
  });

  test("members see roles without a way to change them", async ({ page }) => {
    await teamSignIn(page, "member@e2e.example");
    await page.goto("/team/team");
    await expect(page.getByRole("table", { name: "Teammates" })).toBeVisible();
    await expect(
      page.getByRole("combobox", { name: /^Role for / }),
    ).toHaveCount(0);
  });
});

test.describe("Search", () => {
  test("finds projects and tickets, and explains what it covers", async ({
    page,
  }) => {
    await teamSignIn(page);
    const dialog = page.getByRole("dialog", { name: "Search" });
    // ⌘K / Ctrl+K works once the page has hydrated; retry until it does.
    await expect(async () => {
      await page.keyboard.press("ControlOrMeta+k");
      await expect(dialog).toBeVisible({ timeout: 1000 });
    }).toPass();
    const field = dialog.getByRole("searchbox", {
      name: "Search projects and tickets",
    });

    await field.fill("menu");
    await expect(
      dialog.getByRole("link", { name: /Menu photos for the menu page/ }),
    ).toBeVisible();
    await field.fill("nb-1234");
    await expect(
      dialog.getByRole("link", { name: /E2E Café website/ }),
    ).toBeVisible();

    await field.fill("cuya");
    await expect(
      dialog.getByRole("heading", { name: "No results for “cuya”" }),
    ).toBeVisible();
    await expect(
      dialog.getByText(
        "Search covers project names, Project IDs like NB-4821, and ticket titles.",
      ),
    ).toBeVisible();
    const { violations } = await new AxeBuilder({ page })
      .withTags(WCAG_TAGS)
      .analyze();
    expect(violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);

    await field.fill("home page");
    await expect(
      dialog.getByRole("link", { name: /Home page build/ }),
    ).toBeVisible();
    await field.press("Enter");
    await expect(page).toHaveURL(
      /\/team\/projects\/NB-1234\/board\?ticket=10$/,
    );
  });
});
