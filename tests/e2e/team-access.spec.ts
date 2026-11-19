import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { findSmallTouchTargets } from "./touch-targets";

/*
 * Client access (#141) on the fake backend (src/features/portal/team/client-access/
 * e2e-store.ts, project NB-1234). The store is shared per server, so tests that change it
 * use their own addresses. Session revocation on rotation, the last-person rule and
 * admin-only writes are proven in SQL (pgTAP 14); here: the page and its flows.
 */

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const ACCESS = "/team/projects/NB-1234/access";
const unique = (label: string) =>
  `${label}-${String(Date.now()).slice(-6)}@e2e.example`;

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

const people = (page: Page) =>
  page
    .getByRole("list", { name: "People who can sign in" })
    .filter({ visible: true });

test.describe("Client access", () => {
  test("shows people, the Project ID and sign-in activity", async ({
    page,
  }) => {
    await teamSignIn(page);
    await page.goto(ACCESS);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "E2E Café website",
    );
    await expect(people(page).getByText("João Marques")).toBeVisible();
    await expect(people(page).getByText("Locked out")).toBeVisible();
    await expect(
      page
        .getByRole("heading", { name: "Sign-in activity" })
        .filter({ visible: true }),
    ).toBeVisible();
    await expect(
      page
        .getByText("Hugo Pinto entered too many wrong codes.", { exact: false })
        .filter({ visible: true }),
    ).toBeVisible();
  });

  test("adds a person inline, refuses a duplicate, then removes them", async ({
    page,
  }) => {
    await teamSignIn(page);
    await page.goto(ACCESS);
    const email = unique("marta");

    await page.getByRole("button", { name: "Add person" }).click();
    await page.getByLabel("Email", { exact: true }).fill("marta@");
    await page.getByRole("button", { name: "Send invite" }).click();
    await expect(
      page.getByText("Enter an email like name@company.pt."),
    ).toBeVisible();

    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Name (optional)").fill("Marta Reis");
    await page.getByRole("button", { name: "Send invite" }).click();
    await expect(page.getByText(`Invite sent to ${email}.`)).toBeVisible();
    await expect(people(page).getByText("Marta Reis")).toBeVisible();

    await page.getByRole("button", { name: "Add person" }).click();
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByRole("button", { name: "Send invite" }).click();
    await expect(
      page.getByText("That email can already sign in to this project."),
    ).toBeVisible();
    await page.getByRole("button", { name: "Cancel" }).click();

    await page.getByRole("button", { name: "Remove Marta Reis" }).click();
    const dialog = page.getByRole("dialog", { name: "Remove Marta Reis?" });
    await dialog.getByRole("button", { name: "Remove" }).click();
    await expect(
      page.getByText("Marta Reis can no longer sign in."),
    ).toBeVisible();
    await expect(people(page).getByText("Marta Reis")).toHaveCount(0);
  });

  test("regenerates the Project ID after a warning", async ({ page }) => {
    await teamSignIn(page);
    await page.goto(ACCESS);
    await page.getByRole("button", { name: "Regenerate ID" }).click();
    const dialog = page.getByRole("dialog", {
      name: "Regenerate the Project ID?",
    });
    await expect(
      dialog.getByText("Everyone at E2E Café is signed out now", {
        exact: false,
      }),
    ).toBeVisible();
    await dialog.getByRole("button", { name: "Regenerate ID" }).click();
    await expect(
      page.getByText(
        /^New Project ID NB-\d{4}\. Everyone was signed out and emailed\.$/,
      ),
    ).toBeVisible();
    await expect(
      page
        .getByText(
          "E2E Admin regenerated the Project ID. Everyone was signed out.",
          { exact: false },
        )
        .first(),
    ).toBeAttached();
  });

  test("members see the page but can't change it", async ({ page }) => {
    await teamSignIn(page, "member@e2e.example");
    await page.goto(ACCESS);
    await expect(people(page).getByText("João Marques")).toBeVisible();
    await expect(
      page
        .getByText("Only admins can change who signs in.")
        .filter({ visible: true }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Add person" })).toHaveCount(
      0,
    );
    await expect(
      page.getByRole("button", { name: "Regenerate ID" }),
    ).toHaveCount(0);
  });

  test("passes axe and fits 390 px with 44 px targets", async ({ page }) => {
    await teamSignIn(page);
    await page.goto(ACCESS);
    await expect(people(page).getByText("João Marques")).toBeVisible();
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
    }
  });
});
