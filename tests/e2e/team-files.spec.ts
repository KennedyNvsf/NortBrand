import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { findSmallTouchTargets } from "./touch-targets";

/*
 * Team files (#140) on the fake backend (src/features/portal/team/files/e2e-store.ts,
 * project NB-1234; uploads go to the fake-only /api/portal/files/fake-upload). The store is
 * shared per server, so each test uploads its own uniquely named file. Storage rules and
 * client access are proven in SQL (pgTAP 13); oversized and wrong-type checks in unit tests
 * (files-edit.test.ts, magic.test.ts). Here: the real flow, and a client refused a
 * team-only file.
 */

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const FILES = "/team/projects/NB-1234/files";
const TEAM_ONLY_FILE = "00000000-0000-4000-a000-00000000f2ff";
const unique = (label: string) => `${label}-${String(Date.now()).slice(-6)}`;

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

function row(page: Page, name: string) {
  return page
    .getByRole("listitem")
    .filter({ hasText: name })
    .filter({ visible: true });
}

async function upload(
  page: Page,
  name: string,
  body: string,
  mimeType: string,
) {
  // Uploads are wired up only after hydration.
  await expect(page.locator("[data-uploader-ready]")).toBeAttached();
  await page.getByLabel("Choose files to upload").setInputFiles({
    name,
    mimeType,
    buffer: Buffer.from(body),
  });
}

test.describe("Team files", () => {
  test("uploads a real PDF, team only until it's shared, then renames and deletes it", async ({
    page,
  }) => {
    await teamSignIn(page);
    await page.goto(FILES);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "E2E Café website",
    );

    const name = `${unique("proposal")}.pdf`;
    await upload(
      page,
      name,
      "%PDF-1.7\n%âãÏÓ\n1 0 obj\n<<>>\nendobj\n",
      "application/pdf",
    );
    await expect(
      page.getByText(`Uploaded ${name}. It's team only until you share it.`),
    ).toBeVisible();
    await expect(row(page, name).getByText("Team only")).toBeVisible();

    await row(page, name)
      .getByRole("button", { name: `Actions for ${name}` })
      .click();
    await page.getByRole("menuitem", { name: "Share with the client" }).click();
    await expect(
      page.getByText(`${name} is visible to the client.`),
    ).toBeVisible();
    await expect(row(page, name).getByText("Visible to client")).toBeVisible();

    await row(page, name)
      .getByRole("button", { name: `Actions for ${name}` })
      .click();
    await page.getByRole("menuitem", { name: "Rename" }).click();
    const renamed = `${name} (signed)`;
    await page.getByLabel("File name").fill(renamed);
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Renamed.")).toBeVisible();

    await row(page, renamed)
      .getByRole("button", { name: `Actions for ${renamed}` })
      .click();
    await page.getByRole("menuitem", { name: "Delete" }).click();
    const confirm = page.getByRole("dialog", { name: `Delete “${renamed}”?` });
    await expect(
      confirm.getByText(
        "E2E Café will no longer be able to download it. This can't be undone.",
      ),
    ).toBeVisible();
    await confirm.getByRole("button", { name: "Delete file" }).click();
    await expect(page.getByText(`Deleted ${renamed}.`)).toBeVisible();
    await expect(row(page, renamed)).toHaveCount(0);
  });

  test("refuses a file that isn't what its name says, on the server", async ({
    page,
  }) => {
    await teamSignIn(page);
    await page.goto(FILES);
    const name = `${unique("invoice")}.pdf`;
    // Plain text, named .pdf and sent as application/pdf: only its bytes tell the truth.
    await upload(
      page,
      name,
      "This is plain text pretending to be a PDF.",
      "application/pdf",
    );
    await expect(
      page.getByText(
        `${name} isn't a PDF, image or ZIP file, so it wasn't uploaded.`,
      ),
    ).toBeVisible();
    await expect(row(page, name)).toHaveCount(0);
  });

  test("passes axe and fits 390 px with 44 px targets", async ({ page }) => {
    await teamSignIn(page);
    await page.goto(FILES);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "E2E Café website",
    );
    await expect(
      row(page, "Internal estimate").getByText("Team only"),
    ).toBeVisible();
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

test.describe("Client and team-only files", () => {
  test("a client cannot download a team-only file", async ({ page }) => {
    await page.goto("/en/portal");
    await page.getByLabel("Email").fill("client-files@e2e.example");
    await page.getByLabel("Project ID").fill("NB-1234");
    const send = page.getByRole("button", { name: "Send me a code" });
    await expect(async () => {
      await send.click();
      await expect(send).toBeHidden({ timeout: 2000 });
    }).toPass();
    await page.getByRole("textbox", { name: /1\/6$/ }).click();
    await page.keyboard.type("123456");
    await expect(page).toHaveURL(/\/en\/portal\/NB-1234$/);
    const response = await page.request.get(
      `/api/portal/files/${TEAM_ONLY_FILE}`,
      { maxRedirects: 0 },
    );
    expect(response.status()).toBe(404);
  });
});
