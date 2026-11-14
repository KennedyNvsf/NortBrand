import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { copy } from "./copy";
import { findSmallTouchTargets } from "./touch-targets";

/*
 * Client timeline, files and updates (#135) on the fake backend's project
 * (src/features/portal/overview/e2e-fixture.ts). Text assertions match visible elements
 * only (Next can keep a hidden copy of streamed content). Downloads are checked at the
 * route: a shared file redirects to a signed URL; anything else is a 404, and no session
 * is a 401.
 */

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const PROJECT = "NB-1234";
const SHARED_FILE = "00000000-0000-4000-a000-00000000f2e1";
const UNSHARED_FILE = "00000000-0000-4000-a000-0000000000ff";

async function signIn(page: Page, locale: "en" | "pt" = "en") {
  await page.goto(`/${locale}/portal`);
  await page
    .getByLabel(copy(locale, "Portal.signIn.email"))
    .fill("client-content@e2e.example");
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

async function noAxeViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(WCAG_TAGS)
    .analyze();
  expect(violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
}

test.describe("Client timeline", () => {
  test("shows the stages, today and the milestones", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await signIn(page);
    await page.goto(`/en/portal/${PROJECT}/timeline`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      copy("en", "Portal.timeline.title"),
    );
    const chart = page.getByRole("group", { name: /Project timeline/ });
    await expect(
      chart.getByText("Development").filter({ visible: true }),
    ).toBeVisible();
    await expect(
      chart.getByText(/^Today · /).filter({ visible: true }),
    ).toBeVisible();

    const milestones = page.getByRole("region", {
      name: copy("en", "Portal.timeline.milestonesTitle"),
    });
    await expect(milestones.getByRole("listitem")).toHaveCount(4);
    await expect(
      milestones.getByText("Design sign-off").filter({ visible: true }),
    ).toBeVisible();
    await noAxeViolations(page);
  });

  test("mobile, in Portuguese: a stage list, no overflow", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(page, "pt");
    await page.goto(`/pt/portal/${PROJECT}/timeline`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      copy("pt", "Portal.timeline.title"),
    );
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    expect(await findSmallTouchTargets(page)).toEqual([]);
  });
});

test.describe("Client files", () => {
  test("lists shared files by group with download links", async ({ page }) => {
    await signIn(page);
    await page.goto(`/en/portal/${PROJECT}/files`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      copy("en", "Portal.files.title"),
    );
    await expect(page.getByRole("region", { name: "Design" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Documents" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Download Home page design" }),
    ).toHaveAttribute("href", `/api/portal/files/${SHARED_FILE}`);
    await noAxeViolations(page);
  });

  test("a shared file downloads through a signed URL; anything else is refused", async ({
    page,
  }) => {
    await signIn(page);
    const shared = await page.request.get(`/api/portal/files/${SHARED_FILE}`, {
      maxRedirects: 0,
    });
    expect(shared.status()).toBe(302);
    expect(shared.headers()["location"]).toContain(SHARED_FILE);
    expect(shared.headers()["cache-control"]).toContain("no-store");

    const unshared = await page.request.get(
      `/api/portal/files/${UNSHARED_FILE}`,
      { maxRedirects: 0 },
    );
    expect(unshared.status()).toBe(404);
    const junk = await page.request.get(`/api/portal/files/not-a-uuid`, {
      maxRedirects: 0,
    });
    expect(junk.status()).toBe(404);
  });

  test("no session, no download", async ({ request }) => {
    const response = await request.get(`/api/portal/files/${SHARED_FILE}`, {
      maxRedirects: 0,
    });
    expect(response.status()).toBe(401);
  });

  test("mobile: stacked files, no overflow, 44 px targets", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(page);
    await page.goto(`/en/portal/${PROJECT}/files`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      copy("en", "Portal.files.title"),
    );
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    expect(await findSmallTouchTargets(page)).toEqual([]);
  });
});

test.describe("Client updates", () => {
  test("marks what needs the client, milestones and edits, and links tasks", async ({
    page,
  }) => {
    await signIn(page);
    await page.goto(`/en/portal/${PROJECT}/updates`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      copy("en", "Portal.updates.title"),
    );
    const main = page.getByRole("main");
    await expect(
      main
        .getByText(copy("en", "Portal.updates.needsYou"))
        .filter({ visible: true }),
    ).toBeVisible();
    await expect(
      main
        .getByText(copy("en", "Portal.updates.milestone"))
        .filter({ visible: true }),
    ).toBeVisible();
    await expect(
      main.getByText(/· edited/).filter({ visible: true }),
    ).toBeVisible();

    await main.getByRole("link", { name: "Task: Home page build" }).click();
    await expect(page).toHaveURL(/\/tasks\?task=10$/);
  });

  test("passes axe and fits 390 px", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(page);
    await page.goto(`/en/portal/${PROJECT}/updates`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      copy("en", "Portal.updates.title"),
    );
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    expect(await findSmallTouchTargets(page)).toEqual([]);
    await noAxeViolations(page);
  });
});
