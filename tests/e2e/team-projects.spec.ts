import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { findSmallTouchTargets } from "./touch-targets";

/*
 * Team Projects list and New project (#136) on the fake backend
 * (src/features/portal/team/projects/e2e-store.ts): NB-1234 exists from the start;
 * admin@ and member@e2e.example are teammates; a welcome email to bounce@e2e.example
 * fails. Text assertions match visible elements only (the table and the cards both
 * render; CSS shows one).
 */

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function teamSignIn(page: Page, email: string) {
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
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Projects");
}

async function openNewProject(page: Page) {
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
  return dialog;
}

async function fillProject(page: Page, name: string, emails: string[]) {
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Project name").fill(name);
  await dialog.getByLabel("Company").fill(name.split(" · ")[0] ?? name);
  for (const email of emails) {
    await dialog.getByLabel("Who can sign in").fill(email);
    await dialog.getByLabel("Who can sign in").press("Enter");
  }
  await dialog.getByLabel("Start").fill("2026-11-17");
  await dialog.getByLabel("Launch target").fill("2027-04-14");
}

test.describe("Team projects", () => {
  test("lists projects with stage, health and launch, and filters by tab", async ({
    page,
  }) => {
    await teamSignIn(page, "admin@e2e.example");
    const main = page.getByRole("main");
    await expect(
      main.getByText("E2E Café website · NB-1234").filter({ visible: true }),
    ).toBeVisible();
    await expect(
      main.getByText("Waiting on client").filter({ visible: true }).last(),
    ).toBeVisible();

    await main
      .getByRole("link", { name: /Archived/ })
      .filter({ visible: true })
      .click();
    await expect(page).toHaveURL(/\?view=archived$/);
    await expect(
      main.getByText("Nothing archived.").filter({ visible: true }),
    ).toBeVisible();
  });

  test("an admin creates a project: stages previewed, clients invited", async ({
    page,
  }) => {
    await teamSignIn(page, "admin@e2e.example");
    const dialog = await openNewProject(page);
    const projectId = (
      await dialog.getByText(/^NB-\d{4}$/).textContent()
    )?.trim();
    expect(projectId).toMatch(/^NB-\d{4}$/);

    await fillProject(page, "Tasca do Largo · Website", [
      "ines@tascadolargo.pt",
      "pedro@tascadolargo.pt",
    ]);
    // The stage dates preview follows the dates.
    const preview = dialog.getByRole("list", { name: "Stage dates" });
    await expect(preview.getByRole("listitem")).toHaveCount(6);
    await expect(preview).toContainText("Care");

    const { violations } = await new AxeBuilder({ page })
      .include("[role=dialog]")
      .withTags(WCAG_TAGS)
      .analyze();
    expect(violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);

    await dialog.getByRole("button", { name: "Create project" }).click();
    await expect(dialog).toBeHidden();
    await expect(
      page.getByText(`Tasca do Largo · Website is ready · ${projectId ?? ""}`),
    ).toBeVisible();
    await expect(page.getByText("Welcome email sent to 2.")).toBeVisible();
    await expect(
      page
        .getByRole("main")
        .getByText(`Tasca do Largo · Website · ${projectId ?? ""}`)
        .filter({ visible: true }),
    ).toBeVisible();
  });

  test("checks emails before sending: invalid and teammates' addresses", async ({
    page,
  }) => {
    await teamSignIn(page, "admin@e2e.example");
    const dialog = await openNewProject(page);
    await fillProject(page, "Checks · Website", []);

    await dialog.getByLabel("Who can sign in").fill("not-an-email");
    await dialog.getByLabel("Who can sign in").press("Enter");
    await expect(
      dialog.getByText("That isn't a valid email address."),
    ).toBeVisible();

    await dialog.getByLabel("Who can sign in").fill("member@e2e.example");
    await dialog.getByLabel("Who can sign in").press("Enter");
    await dialog.getByRole("button", { name: "Create project" }).click();
    await expect(
      dialog.getByText(
        "member@e2e.example belongs to a teammate. Clients need their own email.",
      ),
    ).toBeVisible();
    await expect(dialog).toBeVisible();
  });

  test("a failed welcome email keeps the project and says so", async ({
    page,
  }) => {
    await teamSignIn(page, "admin@e2e.example");
    const dialog = await openNewProject(page);
    // The fake store is shared by every test on this server: make the name unique.
    const client = `Bounce ${String(Date.now())}`;
    await fillProject(page, `${client} · Website`, ["bounce@e2e.example"]);
    await dialog.getByRole("button", { name: "Create project" }).click();
    await expect(dialog).toBeHidden();
    await expect(
      page.getByText(/welcome email to bounce@e2e\.example didn't go out/),
    ).toBeVisible();
    await expect(
      page
        .getByRole("main")
        .getByText(new RegExp(`^${client} · Website · NB-[0-9]{4}$`))
        .filter({ visible: true }),
    ).toBeVisible();
  });

  test("members see the list without New project", async ({ page }) => {
    await teamSignIn(page, "member@e2e.example");
    await expect(page.getByRole("button", { name: "New project" })).toHaveCount(
      0,
    );
  });

  test("passes axe and fits 390 px with 44 px targets", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await teamSignIn(page, "admin@e2e.example");
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    expect(await findSmallTouchTargets(page)).toEqual([]);
    const { violations } = await new AxeBuilder({ page })
      .withTags(WCAG_TAGS)
      .analyze();
    expect(violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);

    const dialog = await openNewProject(page);
    // Mobile: a bottom sheet that fits the screen.
    const box = await dialog.boundingBox();
    expect(box && box.width).toBeLessThanOrEqual(390);
    expect(await findSmallTouchTargets(page)).toEqual([]);
  });
});
