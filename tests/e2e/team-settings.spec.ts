import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { findSmallTouchTargets } from "./touch-targets";

/*
 * Workspace Settings (#159) on the fake backend. That each saved value takes effect, and
 * that the server refuses a member's save, is proven in SQL (pgTAP 16) and in
 * settings.test.ts; here: the page, the editor and a save.
 *
 * The fake settings store is shared by every spec on the server, so this spec never
 * saves the stage template (the new-project specs read it), and the one save it makes
 * is undone at the end. Only one browser project saves, so two runs can't race.
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

test.describe("Settings", () => {
  test("an admin sees every setting from TM-13", async ({ page }) => {
    await teamSignIn(page);
    await page.goto("/team/settings");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Settings",
    );
    const form = page.getByRole("form", { name: "Workspace settings" });
    for (const section of [
      "Client sign-in",
      "Notifications",
      "Team sign-in",
      "Stage template",
    ]) {
      await expect(
        form.getByRole("heading", { level: 2, name: section }),
      ).toBeVisible();
    }
    await expect(
      form.getByRole("combobox", { name: "Wrong codes allowed" }),
    ).toHaveText("3");
    await expect(
      form.getByRole("combobox", { name: "Stay signed in for" }),
    ).toHaveText("30 days");
    await expect(
      form.getByRole("switch", { name: /Needs you/ }),
    ).toBeDisabled();
    await expect(
      form.getByRole("list", { name: "Stages in the template" }),
    ).toContainText("Development6 weeks");
    // Nothing changed yet: nothing to save or discard.
    await expect(
      form.getByRole("button", { name: "Save settings" }),
    ).toBeDisabled();
    await checkPage(page);
  });

  test("the template editor checks names and weeks, and Discard undoes it", async ({
    page,
  }) => {
    await teamSignIn(page);
    await page.goto("/team/settings");
    const form = page.getByRole("form", { name: "Workspace settings" });
    await form.getByRole("button", { name: "Edit template" }).click();
    const editor = form.getByRole("group", { name: "Edit the stage template" });

    await editor.getByRole("textbox", { name: "Stage 3 name" }).fill("Build");
    await editor.getByRole("spinbutton", { name: "Stage 3 weeks" }).fill("60");
    await editor.getByRole("button", { name: "Add stage" }).click();
    await expect(
      editor.getByRole("textbox", { name: "Stage 5 name" }),
    ).toHaveValue("New stage");
    await checkPage(page);

    await form.getByRole("button", { name: "Save settings" }).click();
    await expect(editor.getByText("Use 1 to 52 weeks.")).toBeVisible();
    await expect(form.getByRole("alert")).toHaveText(
      "Check the highlighted fields.",
    );

    await form.getByRole("button", { name: "Discard" }).click();
    await expect(
      form.getByRole("list", { name: "Stages in the template" }),
    ).toContainText("Development6 weeks");
    await expect(
      form.getByRole("button", { name: "Save settings" }),
    ).toBeDisabled();
  });

  test("an admin saves a setting, and it's there after a reload", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop",
      "Saves change the shared fake store; one project saves.",
    );
    await teamSignIn(page);
    await page.goto("/team/settings");
    const form = page.getByRole("form", { name: "Workspace settings" });

    const domain = form.getByRole("textbox", { name: "Allowed team domain" });
    await domain.fill("not a domain");
    await form.getByRole("button", { name: "Save settings" }).click();
    await expect(
      form.getByText("Enter a domain like studio.pt, without the @."),
    ).toBeVisible();
    await domain.fill("");

    await form.getByRole("combobox", { name: "Wrong codes allowed" }).click();
    await page.getByRole("option", { name: "5" }).click();
    await form.getByRole("button", { name: "Save settings" }).click();
    await expect(page.getByText("Settings saved")).toBeVisible();

    await page.reload();
    await expect(
      form.getByRole("combobox", { name: "Wrong codes allowed" }),
    ).toHaveText("5");

    // Undo, so other specs see the defaults.
    await form.getByRole("combobox", { name: "Wrong codes allowed" }).click();
    await page.getByRole("option", { name: "3" }).click();
    await form.getByRole("button", { name: "Save settings" }).click();
    await expect(
      form.getByRole("combobox", { name: "Wrong codes allowed" }),
    ).toHaveText("3");
    await expect(
      form.getByRole("button", { name: "Save settings" }),
    ).toBeDisabled();
  });

  test("members see the settings read-only, under the TM-09 notice", async ({
    page,
  }) => {
    await teamSignIn(page, "member@e2e.example");
    await page.goto("/team/settings");
    await expect(
      page.getByRole("heading", { name: "Only admins can change settings" }),
    ).toBeVisible();
    const form = page.getByRole("form", { name: "Workspace settings" });
    await expect(
      form.getByRole("combobox", { name: "Wrong codes allowed" }),
    ).toBeDisabled();
    await expect(
      form.getByRole("switch", { name: /signs in for the first time/ }),
    ).toBeDisabled();
    await expect(
      form.getByRole("textbox", { name: "Allowed team domain" }),
    ).toBeDisabled();
    await expect(
      form.getByRole("button", { name: "Edit template" }),
    ).toHaveCount(0);
    await expect(
      form.getByRole("button", { name: "Save settings" }),
    ).toHaveCount(0);
    await checkPage(page);
  });
});
