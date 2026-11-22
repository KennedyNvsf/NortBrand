import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { findSmallTouchTargets } from "./touch-targets";

/*
 * View as client (#160) on the fake backend. That the preview holds exactly what a
 * client of the project reads, and nothing team-only, is proven in SQL (pgTAP 17);
 * here: the way in, the client frame under the banner, the language switch, the
 * sections, and that nothing in it can change anything.
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

test.describe("View as client", () => {
  test("opens from the project page in the clients' language, read-only", async ({
    page,
  }) => {
    await teamSignIn(page);
    await page.goto("/team/projects/NB-1234");
    const viewAsClient = page.getByRole("link", { name: "View as client" });
    // The header's actions show from tablet up (Portal responsive rules).
    if (await viewAsClient.isVisible()) {
      await viewAsClient.click();
    } else {
      await page.goto("/team/projects/NB-1234/preview");
    }
    await expect(page).toHaveURL(/\/team\/projects\/NB-1234\/preview\/pt$/);

    const banner = page.getByRole("region", { name: "Client preview" });
    await expect(banner).toContainText("Previewing as the client · read-only");
    await expect(page.locator("div[lang=pt]")).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "E2E Café website",
    );

    // Nothing in the frame acts: no team actions, no client account or sign-out.
    for (const name of ["Post update", "New ticket", "Sign out"]) {
      await expect(page.getByRole("button", { name })).toHaveCount(0);
    }
    await expect(page.getByRole("button", { name: /account/i })).toHaveCount(0);
    await expect(page.locator("form")).toHaveCount(0);
    await checkPage(page);
  });

  test("switches language and keeps the section, and every section opens", async ({
    page,
  }) => {
    test.slow(); // six navigations, slow on the mobile project
    await teamSignIn(page);
    await page.goto("/team/projects/NB-1234/preview/pt/tasks");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    await page
      .getByRole("region", { name: "Client preview" })
      .getByRole("link", { name: "English" })
      .click();
    await expect(page).toHaveURL(/\/preview\/en\/tasks$/);
    await expect(page.locator("div[lang=en]")).toHaveCount(1);
    await checkPage(page);

    for (const section of ["timeline", "files", "updates"]) {
      await page.goto(`/team/projects/NB-1234/preview/en/${section}`);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(
        page.getByRole("region", { name: "Client preview" }),
      ).toBeVisible();
    }
    await checkPage(page);

    await page
      .getByRole("region", { name: "Client preview" })
      .getByRole("link", { name: "Back to project" })
      .click();
    await expect(page).toHaveURL(/\/team\/projects\/NB-1234$/);
  });

  test("a project the teammate can't preview is a 404, and it needs a session", async ({
    page,
  }) => {
    await page.goto("/team/projects/NB-1234/preview/pt");
    await expect(page).toHaveURL(/\/team\/sign-in/);

    await teamSignIn(page);
    // Inside a streamed layout Next answers 200 with the not-found UI (the response has
    // started); what matters is that the project looks missing.
    await page.goto("/team/projects/NB-0000/preview/pt");
    await expect(page.getByText("This page could not be found.")).toBeVisible();
    await page.goto("/team/projects/NB-1234/preview/fr");
    await expect(page.getByText("This page could not be found.")).toBeVisible();
  });
});
