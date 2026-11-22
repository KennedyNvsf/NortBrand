import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { findSmallTouchTargets } from "./touch-targets";

/*
 * Archive and delete a client project (#165) on the fake backend. The rules (admins
 * only, read-only while archived, clients losing access, the cascade and the accounts
 * dropped) are proven in SQL (pgTAP 18) and lifecycle.test.ts; here: the flows. Each
 * run makes its own project, so the shared NB-1234 stays as other specs expect.
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

async function createProject(page: Page, name: string): Promise<string> {
  const dialog = page.getByRole("dialog", {
    name: "Start a project and invite the client",
  });
  await expect(async () => {
    await page
      .getByRole("button", { name: "New project" })
      .filter({ visible: true })
      .click();
    await expect(dialog).toBeVisible({ timeout: 2000 });
  }).toPass();
  const projectId =
    (await dialog.getByText(/^NB-\d{4}$/).textContent())?.trim() ?? "";
  await dialog.getByLabel("Project name").fill(name);
  await dialog.getByLabel("Company").fill(name);
  await dialog.getByLabel("Who can sign in").fill("someone@lifecycle.example");
  await dialog.getByLabel("Who can sign in").press("Enter");
  await dialog.getByLabel("Start").fill("2026-11-17");
  await dialog.getByLabel("Launch target").fill("2027-04-14");
  await dialog.getByRole("button", { name: "Create project" }).click();
  await expect(dialog).toBeHidden();
  return projectId;
}

async function checkPage(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(WCAG_TAGS)
    .analyze();
  expect(violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
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

test.describe("Archive and delete a project", () => {
  test("an admin archives, restores, then deletes a project", async ({
    page,
  }, testInfo) => {
    test.slow(); // creates a project and walks every state
    const name = `Lifecycle ${testInfo.project.name} ${String(Date.now()).slice(-6)}`;
    await teamSignIn(page);
    const projectId = await createProject(page, name);
    expect(projectId).toMatch(/^NB-\d{4}$/);

    await page.goto(`/team/projects/${projectId}`);
    const manage = page.getByRole("region", { name: "Manage project" });
    await expect(manage).toBeVisible();
    await checkPage(page);

    // Archive.
    await manage.getByRole("button", { name: "Archive project" }).click();
    const archive = page.getByRole("dialog", { name: `Archive “${name}”?` });
    await expect(archive.getByRole("button", { name: "Cancel" })).toBeFocused();
    await archive.getByRole("button", { name: "Archive project" }).click();
    await expect(page.getByText("Project archived")).toBeVisible();
    if ((page.viewportSize()?.width ?? 0) >= 768) {
      await expect(page.getByText("Archived · read-only")).toBeVisible();
    }
    await expect(
      manage.getByRole("button", { name: "Restore project" }),
    ).toBeVisible();

    await page.goto("/team?view=archived");
    await expect(
      page.getByRole("main").getByText(name).filter({ visible: true }).first(),
    ).toBeVisible();

    // Restore.
    await page.goto(`/team/projects/${projectId}`);
    await manage.getByRole("button", { name: "Restore project" }).click();
    await page
      .getByRole("dialog", { name: `Restore “${name}”?` })
      .getByRole("button", { name: "Restore project" })
      .click();
    await expect(page.getByText("Project restored")).toBeVisible();
    await expect(
      manage.getByRole("button", { name: "Archive project" }),
    ).toBeVisible();

    // Delete: held until the Project ID is typed.
    await manage.getByRole("button", { name: "Delete permanently" }).click();
    const remove = page.getByRole("dialog", {
      name: `Delete “${name}” permanently?`,
    });
    const confirm = remove.getByRole("button", { name: "Delete project" });
    await expect(confirm).toBeDisabled();
    const field = remove.getByLabel(`Type ${projectId} to confirm`);
    await field.fill("NB-0000");
    await expect(confirm).toBeDisabled();
    const { violations } = await new AxeBuilder({ page })
      .include("[role=dialog]")
      .withTags(WCAG_TAGS)
      .analyze();
    expect(violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);

    await field.fill(projectId.toLowerCase());
    await expect(confirm).toBeEnabled();
    await confirm.click();
    await expect(page).toHaveURL(/\/team$/);
    await expect(page.getByText(`${name} was deleted`)).toBeVisible();
    await expect(
      page.getByRole("main").getByText(name).filter({ visible: true }),
    ).toHaveCount(0);

    await page.goto(`/team/projects/${projectId}`);
    await expect(page.getByText("This page could not be found.")).toBeVisible();
  });

  test("members can't archive or delete", async ({ page }) => {
    await teamSignIn(page, "member@e2e.example");
    await page.goto("/team/projects/NB-1234");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Manage project" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: /Archive project|Delete permanently/ }),
    ).toHaveCount(0);
  });
});
