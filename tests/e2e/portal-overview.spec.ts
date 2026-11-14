import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { copy } from "./copy";
import { findSmallTouchTargets } from "./touch-targets";

/*
 * Client overview and tasks (#134) on the fake backend's project (src/features/portal/
 * overview/e2e-fixture.ts): NB-1234 in Development, 14 client-visible tasks, 8 done (57%),
 * "Menu photos for the menu page" waiting on the client, launch 12 Feb 2027.
 * Text assertions match visible elements only: Next can keep a hidden copy of streamed
 * content in the DOM (seen on CI), and getByText also matches hidden elements.
 */

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const PROJECT = "NB-1234";

async function signIn(page: Page, locale: "en" | "pt" = "en") {
  await page.goto(`/${locale}/portal`);
  await page
    .getByLabel(copy(locale, "Portal.signIn.email"))
    .fill("client-overview@e2e.example");
  await page.getByLabel(copy(locale, "Portal.signIn.projectId")).fill(PROJECT);
  const send = page.getByRole("button", {
    name: copy(locale, "Portal.signIn.send"),
  });
  await expect(async () => {
    await send.click();
    await expect(send).toBeHidden({ timeout: 2000 });
  }).toPass();
  await page
    .getByRole("textbox", {
      name: `${copy(locale, "Portal.signIn.codeLabel")} 1/6`,
    })
    .click();
  await page.keyboard.type("123456");
  await expect(page).toHaveURL(new RegExp(`/${locale}/portal/${PROJECT}$`));
}

const main = (page: Page) => page.getByRole("main");

test.describe("Client overview", () => {
  test("shows progress from visible tasks, the stage, the week and launch", async ({
    page,
  }) => {
    await signIn(page);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "E2E Café website",
    );
    await expect(main(page).getByText("Waiting on you").first()).toBeVisible();
    await expect(
      main(page).getByRole("img", { name: "57% of tasks done" }),
    ).toBeVisible();
    await expect(
      main(page).getByText("8 of 14 tasks done", { exact: true }),
    ).toBeVisible();

    // The most urgent open task first: the one waiting on the client.
    const working = main(page).getByRole("region", {
      name: "What we're working on",
    });
    await expect(working.getByRole("listitem").first()).toContainText(
      "Menu photos for the menu page",
    );

    const { violations } = await new AxeBuilder({ page })
      .withTags(WCAG_TAGS)
      .analyze();
    expect(violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    await expect(page.locator("h1:visible")).toHaveCount(1);
  });

  test("mobile, in Portuguese: the waiting card, the stepper, no overflow", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(page, "pt");
    await expect(
      main(page).getByRole("heading", {
        name: copy("pt", "Portal.overview.waitingTitle"),
      }),
    ).toBeVisible();
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    expect(await findSmallTouchTargets(page)).toEqual([]);
  });

  test("a working-on row opens that task", async ({ page }) => {
    await signIn(page);
    await main(page)
      .getByRole("link", { name: /Home page build/ })
      .first()
      .click();
    await expect(page).toHaveURL(new RegExp(`/tasks\\?task=10$`));
    await expect(
      page.locator("h2:visible", { hasText: "Home page build" }).last(),
    ).toBeVisible();
  });
});

test.describe("Client tasks", () => {
  test("filters by status and opens the detail with its checklist", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await signIn(page);
    await page.goto(`/en/portal/${PROJECT}/tasks`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      copy("en", "Portal.tasks.title"),
    );

    const filters = page.getByRole("navigation", {
      name: copy("en", "Portal.tasks.filterLabel"),
    });
    await filters.getByRole("link", { name: /Blocked/ }).click();
    await expect(page).toHaveURL(/status=blocked/);
    await expect(
      main(page).getByRole("link", { name: /Open task/ }),
    ).toHaveCount(1);

    await main(page)
      .getByRole("link", { name: /Open task/ })
      .click();
    await expect(page).toHaveURL(/status=blocked&task=9/);
    const detail = page.getByRole("complementary", {
      name: "Menu photos for the menu page",
    });
    await expect(detail).toBeVisible();

    await page.goto(`/en/portal/${PROJECT}/tasks?task=10`);
    await expect(
      page.getByText("3 of 5").filter({ visible: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Hero and menu highlights are on staging."),
    ).toBeVisible();

    const { violations } = await new AxeBuilder({ page })
      .withTags(WCAG_TAGS)
      .analyze();
    expect(violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);

    await page
      .getByRole("link", { name: copy("en", "Portal.tasks.close") })
      .click();
    await expect(page).toHaveURL(new RegExp(`/tasks$`));
  });

  test("mobile: the detail is a bottom sheet that closes with Esc", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(page);
    await page.goto(`/en/portal/${PROJECT}/tasks?task=10`);
    const sheet = page.getByRole("dialog", { name: "Home page build" });
    await expect(sheet).toBeVisible();
    await expect(sheet.getByText("3 of 5")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page).toHaveURL(new RegExp(`/tasks$`));
    await expect(sheet).toBeHidden();
  });

  test("tablet: the detail is a sheet from the right", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await signIn(page);
    await page.goto(`/en/portal/${PROJECT}/tasks?task=10`);
    await expect(
      page.getByRole("dialog", { name: "Home page build" }),
    ).toBeVisible();
  });

  test("an unknown task says so", async ({ page }) => {
    await signIn(page);
    await page.goto(`/en/portal/${PROJECT}/tasks?task=999`);
    await expect(
      page
        .getByText(copy("en", "Portal.tasks.notFound"))
        .filter({ visible: true }),
    ).toBeVisible();
  });
});
