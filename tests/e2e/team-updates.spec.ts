import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

import { findSmallTouchTargets } from "./touch-targets";

/*
 * Team updates (#139) on the fake backend (src/features/portal/team/updates/e2e-store.ts,
 * project NB-1234). The store is shared by every test on the server, so each test posts
 * its own uniquely worded update. The digest's at-most-once rule and its secret check in
 * SQL are proven in pgTAP (12); here the cron route refuses calls without its secret.
 */

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const UPDATES = "/team/projects/NB-1234/updates";
const unique = (label: string) => `${label} ${String(Date.now()).slice(-6)}`;

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

async function openComposer(page: Page) {
  const dialog = page.getByRole("dialog", {
    name: "What's new on the project?",
  });
  await expect(async () => {
    await page.getByRole("button", { name: /^Share an update with/ }).click();
    await expect(dialog).toBeVisible({ timeout: 2000 });
  }).toPass();
  return dialog;
}

function post(scope: Page | Locator, text: string) {
  return scope.getByRole("article").filter({ hasText: text });
}

test.describe("Team updates", () => {
  test("posts a Needs you update with a linked task, previewed as the client sees it", async ({
    page,
  }) => {
    await teamSignIn(page);
    await page.goto(UPDATES);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "E2E Café website",
    );

    const text = unique("We need the menu photos");
    const dialog = await openComposer(page);
    await dialog.getByLabel("Update", { exact: true }).fill(text);
    await dialog.getByRole("combobox", { name: "Link a task" }).click();
    await page.getByRole("option", { name: "Home page build" }).click();
    await dialog
      .getByRole("switch", { name: "Ask the client for something" })
      .click();

    const preview = dialog.getByRole("region", {
      name: "How E2E Café will see it",
    });
    await expect(preview.getByText(text)).toBeVisible();
    await expect(preview.getByText("Needs you")).toBeVisible();
    await expect(preview.getByText("Home page build")).toBeVisible();

    const { violations } = await new AxeBuilder({ page })
      .include("[role=dialog]")
      .withTags(WCAG_TAGS)
      .analyze();
    expect(violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);

    await dialog.getByRole("button", { name: "Post update" }).click();
    await expect(
      page.getByText("Update posted and emailed to the client."),
    ).toBeVisible();
    const today = page.getByRole("region", { name: "Today" });
    await expect(post(today, text).getByText("Needs you")).toBeVisible();
    await expect(
      post(today, text).getByRole("link", { name: "Task: Home page build" }),
    ).toBeVisible();
  });

  test("edits a post (shows edited) and deletes it after saying what the client loses", async ({
    page,
  }) => {
    await teamSignIn(page);
    await page.goto(UPDATES);
    const text = unique("Story section next");
    const dialog = await openComposer(page);
    await dialog.getByLabel("Update", { exact: true }).fill(text);
    await dialog.getByRole("button", { name: "Post update" }).click();
    await expect(
      page.getByText("Update posted.", { exact: true }),
    ).toBeVisible();

    await post(page, text)
      .getByRole("button", { name: /^Edit the update from/ })
      .click();
    const editor = page.getByRole("dialog", { name: "Edit the update" });
    await editor
      .getByLabel("Update", { exact: true })
      .fill(`${text} (revised)`);
    await editor.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Update saved.")).toBeVisible();
    await expect(
      post(page, `${text} (revised)`).getByText(/· edited/),
    ).toBeVisible();

    await post(page, `${text} (revised)`)
      .getByRole("button", { name: /^Delete the update from/ })
      .click();
    const confirm = page.getByRole("dialog", { name: "Delete this update?" });
    await expect(
      confirm.getByText(
        "It disappears from E2E Café's feed. This can't be undone.",
      ),
    ).toBeVisible();
    await confirm.getByRole("button", { name: "Delete update" }).click();
    await expect(page.getByText("Update deleted.")).toBeVisible();
    await expect(post(page, `${text} (revised)`)).toHaveCount(0);
  });

  test("passes axe and fits 390 px with 44 px targets", async ({ page }) => {
    await teamSignIn(page);
    await page.goto(UPDATES);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "E2E Café website",
    );
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
      const dialog = await openComposer(page);
      const box = await dialog.boundingBox();
      expect(box && box.width).toBeLessThanOrEqual(390);
      expect(await findSmallTouchTargets(page)).toEqual([]);
    }
  });
});

test.describe("Client digest cron", () => {
  test("refuses calls without the cron secret", async ({ request }) => {
    const none = await request.get("/api/portal/digest");
    expect([401, 503]).toContain(none.status());
    const wrong = await request.get("/api/portal/digest", {
      headers: { authorization: "Bearer not-the-secret" },
    });
    expect([401, 503]).toContain(wrong.status());
    expect(none.headers()["cache-control"]).toContain("no-store");
  });
});
