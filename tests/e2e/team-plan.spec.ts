import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { findSmallTouchTargets } from "./touch-targets";

/*
 * Team project overview and timeline (#138) on the fake backend (NB-1234; stores in
 * src/features/portal/team/board/e2e-store.ts and plan/e2e-store.ts). Tests that change
 * the shared plan (health, completing a stage) run on desktop only and put it back, so
 * other specs see the fixture as it was. Completing a stage being one transaction is
 * proven in SQL (pgTAP 11).
 */

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const PROJECT = "/team/projects/NB-1234";

const isDesktop = (page: Page) => (page.viewportSize()?.width ?? 0) >= 1024;

async function teamSignIn(page: Page) {
  await page.goto("/team/sign-in");
  await page.getByLabel("Email").fill("admin@e2e.example");
  const send = page.getByRole("button", { name: "Send me a code" });
  await expect(async () => {
    await send.click();
    await expect(send).toBeHidden({ timeout: 2000 });
  }).toPass();
  await page.getByRole("textbox", { name: "6-digit code 1/6" }).click();
  await page.keyboard.type("123456");
  await expect(page).toHaveURL(/\/team$/);
}

test.describe("Team project overview", () => {
  test("shows what needs attention, progress, the stage and open work", async ({
    page,
  }) => {
    await teamSignIn(page);
    await page.goto(PROJECT);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "E2E Café website",
    );
    const attention = page.getByRole("region", { name: "Needs attention" });
    await expect(
      attention.getByText(
        /^Menu photos for the menu page: blocked on the client/,
      ),
    ).toBeVisible();
    await expect(
      attention.getByText(
        "Leonor Faria hasn't signed in since the invite on 2 Nov.",
      ),
    ).toBeVisible();
    await expect(
      page
        .getByRole("region", { name: "Current stage" })
        .getByText("Development"),
    ).toBeVisible();
    await expect(
      page
        .getByRole("region", { name: "Overall progress" })
        .getByText(/The client sees \d+ of \d+/),
    ).toBeVisible();

    await attention.getByRole("link", { name: "Open ticket" }).first().click();
    await expect(page).toHaveURL(/\/board\?ticket=\d+$/);
  });

  test("passes axe; fits 390 px with 44 px targets", async ({ page }) => {
    await teamSignIn(page);
    await page.goto(PROJECT);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "E2E Café website",
    );
    const { violations } = await new AxeBuilder({ page })
      .withTags(WCAG_TAGS)
      .analyze();
    expect(violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    if (!isDesktop(page)) {
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
      expect(await findSmallTouchTargets(page)).toEqual([]);
    }
  });
});

test.describe("Team timeline", () => {
  test("suggests a health and locks finished stages", async ({ page }) => {
    await teamSignIn(page);
    await page.goto(`${PROJECT}/timeline`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "E2E Café website",
    );
    await expect(
      page.getByText(
        /^Suggested: Waiting on client, because 1 ticket is blocked on them\./,
      ),
    ).toBeVisible();
    await expect(page.getByLabel("Start of Discovery")).toBeDisabled();
    await expect(page.getByLabel("Start of Development")).toBeEnabled();
    await expect(
      page.getByRole("button", { name: "Reopen Discovery" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Complete stage" }),
    ).toBeVisible();

    const { violations } = await new AxeBuilder({ page })
      .withTags(WCAG_TAGS)
      .analyze();
    expect(violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    if (!isDesktop(page)) {
      expect(await findSmallTouchTargets(page)).toEqual([]);
    }
  });

  test("changes health with an update for the client, by keyboard", async ({
    page,
  }) => {
    await teamSignIn(page);
    test.skip(!isDesktop(page), "changes the shared plan; runs once");
    await page.goto(`${PROJECT}/timeline`);
    const group = page.getByRole("radiogroup", { name: "Project health" });
    await group.getByRole("radio", { checked: true }).focus();
    await page.keyboard.press("ArrowLeft");
    await expect(group.getByRole("radio", { name: "At risk" })).toBeChecked();
    await expect(page.getByLabel("Update for the client")).toHaveValue(
      /heads-up/,
    );
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Saved and emailed the client.")).toBeVisible();
    await expect(
      page.locator("header").getByText("At risk").first(),
    ).toBeVisible();

    // Put it back.
    await group.getByRole("radio", { name: "Waiting on client" }).click();
    await page.getByLabel("Email the client").click();
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Saved.", { exact: true })).toBeVisible();
  });

  test("completes the current stage after saying what's open, then reopens it", async ({
    page,
  }) => {
    await teamSignIn(page);
    test.skip(!isDesktop(page), "changes the shared plan; runs once");
    await page.goto(`${PROJECT}/timeline`);
    await page.getByRole("button", { name: "Complete stage" }).click();
    const dialog = page.getByRole("dialog", {
      name: "Development isn't finished yet",
    });
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByText(/of its \d+ tickets are still open/),
    ).toBeVisible();
    await expect(
      dialog.getByRole("radio", { name: /Keep them in Development/ }),
    ).toBeChecked();
    await expect(
      dialog.getByRole("textbox", { name: "Milestone update" }),
    ).toHaveValue("Development is complete. We're now working on Review.");
    await dialog.getByRole("button", { name: "Complete anyway" }).click();
    await expect(
      page.getByText("Development is complete.", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Reopen Development" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Reopen Development" }).click();
    await expect(page.getByText("Development is open again.")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Complete stage" }),
    ).toBeVisible();
  });
});
