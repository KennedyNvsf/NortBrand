import { expect, test, type Page } from "@playwright/test";

import { copy } from "./copy";

/*
 * Portal security, end to end (#143; docs/guides/portal.md § 21). Sessions are kept
 * apart: a client's session opens no team page, a teammate's session opens no client
 * portal, and no session opens either. The routes refuse callers without their secret.
 * The database side (every function and table across projects and roles) is pgTAP 19;
 * every team server action checks the team viewer first (unit tests per feature).
 */

const PROJECT = "NB-1234";

const TEAM_PAGES = [
  "/team",
  "/team/my-tickets",
  "/team/team",
  "/team/settings",
  `/team/projects/${PROJECT}`,
  `/team/projects/${PROJECT}/board`,
  `/team/projects/${PROJECT}/access`,
  `/team/projects/${PROJECT}/preview/pt`,
];

const CLIENT_PAGES = [
  `/en/portal/${PROJECT}`,
  `/en/portal/${PROJECT}/tasks`,
  `/pt/portal/${PROJECT}/files`,
];

async function clientSignIn(page: Page) {
  await page.goto("/en/portal");
  await page
    .getByLabel(copy("en", "Portal.signIn.email"))
    .fill("client-security@e2e.example");
  await page.getByLabel(copy("en", "Portal.signIn.projectId")).fill(PROJECT);
  const send = page.getByRole("button", {
    name: copy("en", "Portal.signIn.send"),
  });
  await expect(async () => {
    await send.click();
    await expect(send).toBeHidden({ timeout: 2000 });
  }).toPass();
  await page
    .getByRole("textbox", {
      name: `${copy("en", "Portal.signIn.codeLabel")} 1/6`,
    })
    .click();
  await page.keyboard.type("123456");
  await expect(page).toHaveURL(new RegExp(`/en/portal/${PROJECT}$`));
}

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

test.describe("Portal sessions stay apart", () => {
  test("without a session, every portal page leads to its sign-in", async ({
    page,
  }) => {
    test.slow();
    for (const path of TEAM_PAGES) {
      await page.goto(path);
      await expect(page, path).toHaveURL(/\/team\/sign-in/);
    }
    for (const path of CLIENT_PAGES) {
      await page.goto(path);
      await expect(page, path).toHaveURL(/\/(en|pt)\/portal(\?|$)/);
    }
  });

  test("a client's session opens no team page", async ({ page }) => {
    test.slow();
    await clientSignIn(page);
    for (const path of TEAM_PAGES) {
      await page.goto(path);
      await expect(page, path).toHaveURL(/\/team\/sign-in/);
      await expect(page.getByText("E2E Café website")).toHaveCount(0);
    }
  });

  test("a teammate's session opens no client portal", async ({ page }) => {
    test.slow();
    await teamSignIn(page);
    for (const path of CLIENT_PAGES) {
      await page.goto(path);
      await expect(page, path).toHaveURL(/\/(en|pt)\/portal(\?|$)/);
    }
  });
});

test.describe("Portal routes refuse callers without their secret", () => {
  test("the digest needs the cron bearer", async ({ request }) => {
    for (const authorization of [undefined, "Bearer wrong-secret"]) {
      const response = await request.get("/api/portal/digest", {
        headers: authorization ? { authorization } : {},
      });
      // 401 with a wrong or missing secret; 503 where no secret is configured.
      expect([401, 503], authorization ?? "no header").toContain(
        response.status(),
      );
    }
  });

  test("a file download needs a session and a readable file", async ({
    request,
  }) => {
    const anonymous = await request.get(
      "/api/portal/files/00000000-0000-4000-9000-000000000999",
      { maxRedirects: 0 },
    );
    expect(anonymous.status()).not.toBe(200);
    expect(anonymous.headers()["location"] ?? "").not.toContain("token=");
    const junk = await request.get("/api/portal/files/not-a-uuid", {
      maxRedirects: 0,
    });
    expect(junk.status()).toBe(404);
  });
});
