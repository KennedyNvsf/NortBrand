import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { copy } from "./copy";
import { findSmallTouchTargets } from "./touch-targets";

/*
 * The portal shells and states (#133), on the fake backend: the client portal for NB-1234
 * (code 123456; a second project NB-1235 for the switcher) and the team workspace
 * (admin@e2e.example, member@e2e.example). Headings by role: Next keeps the previous page
 * in the DOM, hidden, after a navigation.
 */

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const PROJECT = "NB-1234";

async function hydratedClick(
  page: Page,
  button: string,
  until: () => Promise<void>,
) {
  await expect(async () => {
    await page.getByRole("button", { name: button }).click();
    await until();
  }).toPass();
}

async function clientSignIn(page: Page, locale: "en" | "pt" = "en") {
  await page.goto(`/${locale}/portal`);
  await page
    .getByLabel(copy(locale, "Portal.signIn.email"))
    .fill("client-shell@e2e.example");
  await page.getByLabel(copy(locale, "Portal.signIn.projectId")).fill(PROJECT);
  const send = copy(locale, "Portal.signIn.send");
  await hydratedClick(page, send, () =>
    expect(page.getByRole("button", { name: send })).toBeHidden({
      timeout: 2000,
    }),
  );
  await page
    .getByRole("textbox", {
      name: `${copy(locale, "Portal.signIn.codeLabel")} 1/6`,
    })
    .click();
  await page.keyboard.type("123456");
  await expect(page).toHaveURL(new RegExp(`/${locale}/portal/${PROJECT}$`));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "E2E Café website",
  );
}

async function teamSignIn(page: Page, email: string) {
  await page.goto("/team/sign-in");
  await page.getByLabel("Email").fill(email);
  await hydratedClick(page, "Send me a code", () =>
    expect(page.getByRole("button", { name: "Send me a code" })).toBeHidden({
      timeout: 2000,
    }),
  );
  await page.getByRole("textbox", { name: "6-digit code 1/6" }).click();
  await page.keyboard.type("123456");
  await expect(page).toHaveURL(/\/team$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Projects");
}

const isDesktop = (page: Page) => (page.viewportSize()?.width ?? 0) >= 1024;

test.describe("Client portal shell", () => {
  test("desktop: sidebar sections with counts, team, message link and switcher", async ({
    page,
  }) => {
    await clientSignIn(page);
    test.skip(!isDesktop(page), "desktop sidebar");

    const nav = page.getByRole("navigation", {
      name: copy("en", "Portal.shell.navLabel"),
    });
    await expect(nav.getByRole("link")).toHaveCount(5);
    await expect(nav.getByRole("link", { name: /Overview/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(nav.getByRole("link", { name: /Tasks/ })).toContainText("14");
    await expect(
      page.getByRole("heading", { name: copy("en", "Portal.shell.yourTeam") }),
    ).toBeVisible();
    await expect(
      page
        .getByRole("banner")
        .getByRole("link", { name: copy("en", "Portal.shell.messageTeam") }),
    ).toHaveAttribute("href", /^mailto:ana@e2e\.example\?subject=/);

    await nav.getByRole("link", { name: /Tasks/ }).click();
    await expect(page).toHaveURL(new RegExp(`/en/portal/${PROJECT}/tasks$`));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      copy("en", "Portal.tasks.title"),
    );
    await expect(nav.getByRole("link", { name: /Tasks/ })).toHaveAttribute(
      "aria-current",
      "page",
    );

    await page.getByRole("button", { name: /Switch project/ }).click();
    await expect(page.getByRole("menuitem")).toHaveCount(2);
    await page.keyboard.press("Escape");

    const { violations } = await new AxeBuilder({ page })
      .withTags(WCAG_TAGS)
      .analyze();
    expect(violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    await expect(page.locator("h1:visible")).toHaveCount(1);
  });

  test("keyboard reaches every section", async ({ page }) => {
    await clientSignIn(page);
    test.skip(!isDesktop(page), "desktop sidebar");
    const links = page
      .getByRole("navigation", { name: copy("en", "Portal.shell.navLabel") })
      .getByRole("link");
    await links.first().focus();
    for (let i = 1; i < 5; i += 1) {
      await page.keyboard.press("Tab");
      await expect(links.nth(i)).toBeFocused();
    }
  });

  test("tablet: tabs under the top bar", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await clientSignIn(page);
    const tabs = page.getByRole("navigation", {
      name: copy("en", "Portal.shell.navLabel"),
    });
    await expect(tabs).toHaveCount(1);
    await expect(tabs.getByRole("link", { name: "Timeline" })).toBeVisible();
    await expect(
      page
        .getByRole("banner")
        .getByRole("link", { name: copy("en", "Portal.shell.messageTeam") }),
    ).toBeVisible();
  });

  test("mobile: a bottom tab bar, no overflow, 44 px targets, in Portuguese", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 390, height: 844 });
    await clientSignIn(page, "pt");
    const bar = page.getByRole("navigation", {
      name: copy("pt", "Portal.shell.navLabel"),
    });
    await expect(
      bar.getByRole("link", { name: copy("pt", "Portal.shell.nav.tasks") }),
    ).toBeVisible();
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    expect(await findSmallTouchTargets(page)).toEqual([]);

    await bar
      .getByRole("link", { name: copy("pt", "Portal.shell.nav.updates") })
      .click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      copy("pt", "Portal.updates.title"),
    );
  });

  test("an unknown project shows the not-found page", async ({ page }) => {
    await clientSignIn(page);
    // Inside a streamed layout Next answers 200 with the not-found UI (the response has
    // started); what matters is that a guessed ID looks missing.
    await page.goto(`/en/portal/NB-9999`);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "find that page",
    );
  });
});

test.describe("Team workspace shell", () => {
  test("admin: sections, first run, settings and the states page", async ({
    page,
  }) => {
    await teamSignIn(page, "admin@e2e.example");
    await expect(page.getByText("No projects yet")).toBeVisible();

    await page.goto("/team/settings");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Settings",
    );
    await expect(page.getByText("Only admins can change settings")).toHaveCount(
      0,
    );

    await page.goto("/team/states");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Off the happy path",
    );
    await expect(page.getByText("No results for “cuya”")).toBeVisible();

    // Guarded delete: opens with focus on Cancel; Esc closes it.
    await hydratedClick(page, "Delete ticket", () =>
      expect(page.getByRole("dialog")).toBeVisible({ timeout: 2000 }),
    );
    await expect(
      page.getByRole("dialog").getByRole("button", { name: "Cancel" }),
    ).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();

    // Save failed keeps the typed value; Retry succeeds and toasts.
    await page.getByLabel("Title").fill("Home page build v2");
    await page.getByRole("button", { name: "Retry" }).click();
    await expect(page.getByText("Saved")).toBeVisible();
    await expect(page.getByLabel("Title")).toHaveValue("Home page build v2");

    const { violations } = await new AxeBuilder({ page })
      .withTags(WCAG_TAGS)
      .analyze();
    expect(violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });

  test("member: settings are read-only", async ({ page }) => {
    await teamSignIn(page, "member@e2e.example");
    await page.goto("/team/settings");
    await expect(
      page.getByText("Only admins can change settings"),
    ).toBeVisible();
    await expect(page.getByText("Ask E2E Admin")).toBeVisible();
  });

  test("mobile: bottom tab bar without overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await teamSignIn(page, "admin@e2e.example");
    const bar = page.getByRole("navigation", { name: "Workspace sections" });
    await expect(bar.getByRole("link")).toHaveCount(4);
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    expect(await findSmallTouchTargets(page)).toEqual([]);
  });

  test("the workspace needs a session", async ({ page }) => {
    await page.goto("/team/settings");
    await expect(page).toHaveURL(/\/team\/sign-in/);
  });
});
