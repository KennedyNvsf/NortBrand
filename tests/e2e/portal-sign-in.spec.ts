import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { copy } from "./copy";

/*
 * Client sign-in (#131), on Playwright's fake backend (src/features/portal/auth/
 * e2e-backend.ts): Project ID NB-1234, emails `client…@e2e.example`, code 123456.
 * Each test uses its own email, because wrong codes are counted per email. Headings are
 * found by role: Next keeps the previous page in the DOM, hidden, after a navigation.
 */

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const PROJECT = "NB-1234";

const isDesktop = (page: Page) => (page.viewportSize()?.width ?? 0) >= 1024;

async function requestCode(page: Page, email: string, projectId = PROJECT) {
  await page.goto("/en/portal");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Project ID").fill(projectId);
  // A click before React hydrates the form does nothing: retry until the step changes
  // (the button goes) or a notice appears (no match, locked, rate limited: the button
  // stays on the details step).
  const send = page.getByRole("button", { name: "Send me a code" });
  const notice = page.getByText(
    new RegExp(
      [
        copy("en", "Portal.signIn.noMatch"),
        copy("en", "Portal.signIn.locked"),
        copy("en", "Portal.signIn.rateLimited"),
      ]
        .map((text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        .join("|"),
    ),
  );
  await expect(async () => {
    await send.click();
    await expect
      .poll(async () => (await send.isHidden()) || (await notice.count()) > 0, {
        timeout: 2000,
      })
      .toBe(true);
  }).toPass();
}

async function typeCode(page: Page, code: string) {
  await page.getByRole("textbox", { name: "6-digit code 1/6" }).click();
  await page.keyboard.type(code);
}

test.describe("Track Project", () => {
  test("the nav links to the portal and marks it active", async ({ page }) => {
    await page.goto("/en/portal");
    test.skip(!isDesktop(page), "desktop nav");
    const link = page
      .getByRole("navigation", { name: "Main" })
      .getByRole("link", { name: "Track Project" });
    await expect(link).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      copy("en", "Portal.signIn.title"),
    );
  });

  test("checks the fields before asking the server", async ({ page }) => {
    await page.goto("/en/portal");
    await expect(async () => {
      await page.getByRole("button", { name: "Send me a code" }).click();
      await expect(
        page.getByText(copy("en", "Portal.signIn.errors.emailInvalid")),
      ).toBeVisible({ timeout: 2000 });
    }).toPass();
    await expect(
      page.getByText(copy("en", "Portal.signIn.errors.projectIdInvalid")),
    ).toBeVisible();
    await expect(page.getByLabel("Email")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  test("shows one message for a wrong email or a wrong Project ID", async ({
    page,
  }) => {
    await requestCode(page, "nobody@e2e.example");
    await expect(
      page.getByText(copy("en", "Portal.signIn.noMatch")),
    ).toBeVisible();

    await requestCode(page, "client-noid@e2e.example", "NB-9999");
    await expect(
      page.getByText(copy("en", "Portal.signIn.noMatch")),
    ).toBeVisible();
  });

  test("signs in with the code, opens the project and signs out", async ({
    page,
  }) => {
    await requestCode(page, "client-flow@e2e.example");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      copy("en", "Portal.signIn.codeTitle"),
    );
    await expect(page.getByText("c•••@e2e.example")).toBeVisible();

    await typeCode(page, "000000");
    await expect(
      page.getByText("That code didn't match. You have 2 tries left."),
    ).toBeVisible();

    await typeCode(page, "123456");
    await expect(page).toHaveURL(new RegExp(`/en/portal/${PROJECT}$`));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "E2E Café website",
    );

    // Sign out lives in the account menu (#133). Retry the first click until the menu
    // has hydrated.
    await expect(async () => {
      await page
        .getByRole("button", { name: copy("en", "Portal.shell.account") })
        .click();
      await page
        .getByRole("menuitem", { name: copy("en", "Portal.shell.signOut") })
        .click({ timeout: 2000 });
      await expect(page).toHaveURL(/\/en\/portal$/, { timeout: 3000 });
    }).toPass();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      copy("en", "Portal.signIn.title"),
    );
  });

  test("three wrong codes cancel the code", async ({ page }) => {
    await requestCode(page, "client-three@e2e.example");
    for (const tries of ["2 tries left", "1 try left"]) {
      await typeCode(page, "000000");
      await expect(page.getByText(new RegExp(tries))).toBeVisible();
    }
    await typeCode(page, "000000");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      copy("en", "Portal.signIn.expiredTitle"),
    );
  });

  test("tells a locked or rate-limited visitor what to do", async ({
    page,
  }) => {
    await requestCode(page, "locked@e2e.example");
    await expect(
      page.getByText(copy("en", "Portal.signIn.locked")),
    ).toBeVisible();

    await requestCode(page, "ratelimited@e2e.example");
    await expect(
      page.getByText(copy("en", "Portal.signIn.rateLimited")),
    ).toBeVisible();
  });

  test("a project URL without a session goes back to sign-in", async ({
    page,
  }) => {
    await page.goto(`/en/portal/${PROJECT}`);
    await expect(page).toHaveURL(/\/en\/portal$/);
  });

  test("shows the signed-out screen after a session ends", async ({ page }) => {
    await page.goto("/en/portal?reason=signed-out");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      copy("en", "Portal.signIn.signedOutTitle"),
    );
    // A click before React hydrates the button does nothing: retry until it acts.
    await expect(async () => {
      await page
        .getByRole("button", {
          name: copy("en", "Portal.signIn.signedOutAction"),
        })
        .click();
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        copy("en", "Portal.signIn.title"),
        { timeout: 2000 },
      );
    }).toPass();
  });

  test("speaks Portuguese and passes axe on the code step", async ({
    page,
  }) => {
    await page.goto("/pt/portal");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      copy("pt", "Portal.signIn.title"),
    );

    await requestCode(page, "client-axe@e2e.example");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      copy("en", "Portal.signIn.codeTitle"),
    );
    const { violations } = await new AxeBuilder({ page })
      .include("main")
      .withTags(WCAG_TAGS)
      .analyze();
    expect(violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
});
