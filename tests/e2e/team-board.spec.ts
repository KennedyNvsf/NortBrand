import AxeBuilder from "@axe-core/playwright";
import {
  expect,
  test,
  type Browser,
  type Locator,
  type Page,
} from "@playwright/test";

import { findSmallTouchTargets } from "./touch-targets";

/*
 * Team board and ticket editor (#137) on the fake backend
 * (src/features/portal/team/board/e2e-store.ts, project NB-1234). The store is shared by
 * every test on the server, so each test creates its own ticket with a unique title.
 * Hidden tickets never reaching the client is proven in SQL (pgTAP 10), where RLS lives.
 */

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const BOARD = "/team/projects/NB-1234/board";

const isDesktop = (page: Page) => (page.viewportSize()?.width ?? 0) >= 1024;
const isMobile = (page: Page) => (page.viewportSize()?.width ?? 0) < 768;

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

/** The open editor: the column on desktop, the sheet below. */
function editor(page: Page): Locator {
  return page
    .locator("aside[aria-label], [role=dialog]")
    .filter({ visible: true })
    .last();
}

async function createTicket(page: Page, title: string) {
  await page.goto(BOARD);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "E2E Café website",
  );
  await page
    .getByRole("link", { name: "New ticket" })
    .filter({ visible: true })
    .first()
    .click();
  await expect(page).toHaveURL(/ticket=new/);
  const panel = editor(page);
  await panel.getByLabel("Title").fill(title);
  await panel.getByLabel("Due").fill("2026-12-02");
  await panel.getByRole("button", { name: "+ Add item" }).click();
  await panel.getByLabel("New checklist item").fill("First step");
  await panel.getByLabel("New checklist item").press("Enter");
  await panel.getByLabel("New checklist item").press("Escape");
  await panel
    .getByRole("button", {
      name: isMobile(page) ? "Save" : "Create ticket",
      exact: true,
    })
    .click();
  await expect(page.getByText(`Created “${title}”.`)).toBeVisible();
  await expect(page).not.toHaveURL(/ticket=/);
}

function card(page: Page, title: string): Locator {
  return page
    .getByRole("article")
    .filter({ hasText: title })
    .filter({ visible: true });
}

async function openTicket(page: Page, title: string) {
  await card(page, title).getByRole("link", { name: title }).click();
  await expect(page).toHaveURL(/ticket=\d+/);
  await expect(editor(page).getByLabel("Title")).toHaveValue(title);
}

const unique = (label: string) => `${label} ${String(Date.now()).slice(-6)}`;

test.describe("Team board", () => {
  test("shows the project, its columns and filters by owner", async ({
    page,
  }) => {
    await teamSignIn(page);
    await page.goto(BOARD);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "E2E Café website",
    );
    if (!isMobile(page)) {
      for (const column of ["To do", "In progress", "In review", "Done"]) {
        await expect(
          page.getByRole("heading", { level: 2, name: new RegExp(column) }),
        ).toBeVisible();
      }
    }
    await page.getByRole("combobox", { name: "Owner" }).click();
    await page.getByRole("option", { name: "Rui Matos" }).click();
    await expect(page).toHaveURL(/owner=/);
    await expect(
      page
        .getByRole("link", { name: "Home page copy review" })
        .filter({ visible: true }),
    ).toHaveCount(0);
  });

  test("creates a ticket and moves it with the keyboard", async ({ page }) => {
    await teamSignIn(page);
    const title = unique("Keyboard move");
    await createTicket(page, title);

    const trigger = card(page, title).getByRole("button", {
      name: `Move “${title}”`,
    });
    await trigger.focus();
    await page.keyboard.press("Enter");
    const menu = page.getByRole("menu");
    await expect(menu).toBeVisible();
    await menu.getByRole("menuitemradio", { name: "In review" }).focus();
    await page.keyboard.press("Enter");
    await expect(
      page.getByText(`Moved “${title}” to In review.`),
    ).toBeAttached();

    if (!isMobile(page)) {
      const column = page.getByRole("region", { name: /In review/ });
      await expect(column.getByRole("link", { name: title })).toBeVisible();
    }
  });

  test("drags a card to another column (desktop)", async ({ page }) => {
    await teamSignIn(page);
    test.skip(
      !isDesktop(page),
      "drag is desktop-only; touch uses the status menu",
    );
    const title = unique("Drag me");
    await createTicket(page, title);
    await card(page, title).dragTo(page.getByRole("region", { name: /^Done/ }));
    await expect(page.getByText(`Moved “${title}” to Done.`)).toBeAttached();
    await expect(
      page
        .getByRole("region", { name: /^Done/ })
        .getByRole("link", { name: title }),
    ).toBeVisible();
  });

  test("detects a concurrent edit and lets the person choose", async ({
    page,
    browser,
  }) => {
    await teamSignIn(page);
    const title = unique("Two editors");
    await createTicket(page, title);
    await openTicket(page, title);

    // Someone else saves first.
    const other = await secondTeammate(browser, page);
    await other.goto(BOARD);
    await openTicket(other, title);
    await editor(other).getByLabel("Due").fill("2026-12-09");
    await editor(other)
      .getByRole("button", {
        name: isMobile(other) ? "Save" : "Save changes",
        exact: true,
      })
      .click();
    await expect(other.getByText(`Saved “${title}”.`)).toBeVisible();
    await other.context().close();

    // This editor's save is refused, and says who changed what.
    const panel = editor(page);
    await panel.getByLabel("Title").fill(`${title} (mine)`);
    await panel
      .getByRole("button", {
        name: isMobile(page) ? "Save" : "Save changes",
        exact: true,
      })
      .click();
    await expect(
      panel.getByText(
        "E2E Member changed the due date to 9 Dec while you were editing.",
      ),
    ).toBeVisible();
    await expect(panel.getByLabel("Title")).toHaveValue(`${title} (mine)`);

    await panel.getByRole("button", { name: "Keep mine" }).click();
    await expect(page.getByText(`Saved “${title} (mine)”.`)).toBeVisible();
  });

  test("deletes a ticket after saying what the client loses", async ({
    page,
  }) => {
    await teamSignIn(page);
    const title = unique("Delete me");
    await createTicket(page, title);
    await openTicket(page, title);
    await editor(page).getByRole("button", { name: "Delete ticket" }).click();
    const dialog = page.getByRole("dialog", { name: `Delete “${title}”?` });
    await expect(
      dialog.getByText(
        "E2E Café will no longer see this task, its checklist or the updates linked to it. This can't be undone.",
      ),
    ).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Cancel" })).toBeFocused();
    await dialog.getByRole("button", { name: "Delete ticket" }).click();
    await expect(page.getByText(`Deleted “${title}”.`)).toBeVisible();
    await expect(card(page, title)).toHaveCount(0);
  });

  test("passes axe on the board and in the editor; fits 390 px", async ({
    page,
  }) => {
    await teamSignIn(page);
    await page.goto(`${BOARD}?ticket=new`);
    await expect(editor(page).getByLabel("Title")).toBeVisible();
    const editorScan = await new AxeBuilder({ page })
      .withTags(WCAG_TAGS)
      .analyze();
    expect(editorScan.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);

    await page.goto(BOARD);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "E2E Café website",
    );
    const boardScan = await new AxeBuilder({ page })
      .withTags(WCAG_TAGS)
      .analyze();
    expect(boardScan.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);

    if (isMobile(page)) {
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

/** A second teammate in their own browser context (same base URL, size and consent). */
async function secondTeammate(browser: Browser, like: Page): Promise<Page> {
  const baseURL = test.info().project.use.baseURL ?? "http://localhost:3100";
  const context = await browser.newContext({
    baseURL,
    viewport: like.viewportSize(),
  });
  await context.addCookies([
    { name: "nb_consent", value: "v1.0", url: baseURL },
  ]);
  const page = await context.newPage();
  await teamSignIn(page, "member@e2e.example");
  return page;
}
