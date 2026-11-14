import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { findSmallTouchTargets } from "./touch-targets";

/*
 * Team sign-in and team access (#132), on Playwright's fake backend
 * (src/features/portal/team/e2e-backend.ts): admin@e2e.example (admin) and
 * member@e2e.example (member), code 123456. Invites to …@outside.example fall outside
 * the allowed domain. The roster lives in the server process, so each run invites its
 * own address. Headings are found by role: Next keeps the previous page in the DOM,
 * hidden, after a navigation.
 */

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function signIn(page: Page, email: string) {
  await page.goto("/team/sign-in");
  await page.getByLabel("Email").fill(email);
  // A click before React hydrates the form does nothing: retry until the step changes.
  await expect(async () => {
    await page.getByRole("button", { name: "Send me a code" }).click();
    await expect(
      page.getByRole("button", { name: "Send me a code" }),
    ).toBeHidden({
      timeout: 2000,
    });
  }).toPass();
  await page.getByRole("textbox", { name: "6-digit code 1/6" }).click();
  await page.keyboard.type("123456");
  await expect(page).toHaveURL(/\/team$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Team");
}

test.describe("Team portal", () => {
  test("the sign-in page stands alone, in English, with no Project ID", async ({
    page,
  }) => {
    await page.goto("/team/sign-in");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Team sign-in.",
    );
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.getByLabel("Project ID")).toHaveCount(0);
    await expect(page.getByRole("navigation", { name: "Main" })).toHaveCount(0);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex/,
    );
    await expect(
      page.getByText("Only invited teammates can sign in here."),
    ).toBeAttached();
    await expect(
      page.getByRole("link", { name: "Track your project" }),
    ).toHaveAttribute("href", "/en/portal");

    const { violations } = await new AxeBuilder({ page })
      .withTags(WCAG_TAGS)
      .analyze();
    expect(violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });

  test("fits 390 px with 44 px touch targets", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/team/sign-in");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    expect(await findSmallTouchTargets(page)).toEqual([]);
  });

  test("shows one message for someone who isn't on the team", async ({
    page,
  }) => {
    await page.goto("/team/sign-in");
    await page.getByLabel("Email").fill("stranger@e2e.example");
    await expect(async () => {
      await page.getByRole("button", { name: "Send me a code" }).click();
      await expect(
        page.getByText("We couldn't find a teammate with that email."),
      ).toBeVisible({ timeout: 2000 });
    }).toPass();
  });

  test("the workspace needs a session", async ({ page }) => {
    await page.goto("/team");
    await expect(page).toHaveURL(/\/team\/sign-in$/);
  });

  test("an admin invites and removes a teammate", async ({
    page,
  }, testInfo) => {
    const run = `${testInfo.project.name}-${String(Date.now())}`;
    const email = `new-${run}@e2e.example`;
    const name = `New Person ${run}`;
    await signIn(page, "admin@e2e.example");

    await page.getByLabel("Name").fill(name);
    await page.getByLabel("Email").fill(email);
    await page.getByRole("button", { name: "Send invite" }).click();
    await expect(page.getByText("Invited.")).toBeVisible();
    await expect(page.getByText(email)).toBeVisible();

    await page.getByLabel("Name").fill("Outsider");
    await page.getByLabel("Email").fill("someone@outside.example");
    await page.getByRole("button", { name: "Send invite" }).click();
    await expect(
      page.getByText("Invites are limited to the allowed email domain"),
    ).toBeVisible();

    await page.getByRole("button", { name: `Remove ${name}` }).click();
    await page.getByRole("button", { name: "Remove", exact: true }).click();
    await expect(page.getByText("Removed.")).toBeVisible();
    await expect(page.getByText(email)).toHaveCount(0);

    // The admin can't remove themselves: there's no button for their own row.
    await expect(
      page.getByRole("button", { name: "Remove E2E Admin" }),
    ).toHaveCount(0);
  });

  test("a member sees the team read-only", async ({ page }) => {
    await signIn(page, "member@e2e.example");
    await expect(
      page.getByRole("listitem").filter({ hasText: "admin@e2e.example" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Send invite" })).toHaveCount(
      0,
    );
    await expect(page.getByRole("button", { name: /^Remove / })).toHaveCount(0);
    await expect(
      page.getByText(
        "Only admins can invite or remove teammates. Ask E2E Admin",
      ),
    ).toBeVisible();

    const { violations } = await new AxeBuilder({ page })
      .withTags(WCAG_TAGS)
      .analyze();
    expect(violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
});
