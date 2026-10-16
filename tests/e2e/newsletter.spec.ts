import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { createHmac } from "node:crypto";
import { existsSync } from "node:fs";

/*
 * The Newsletter card and the link pages (#41) against the fake backend
 * (playwright.config.ts sets E2E_FAKE_BACKEND=1; src/features/newsletter/e2e-backend.ts).
 * The start of the address picks the outcome: e2e-failed@, e2e-rate-limited@,
 * e2e-slow@, e2e-used@; anything else succeeds. Link signatures and expiry are checked
 * for real, so links are signed here with the server's NEWSLETTER_TOKEN_SECRET.
 */

if (!process.env.NEWSLETTER_TOKEN_SECRET && existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
}
const SECRET = process.env.NEWSLETTER_TOKEN_SECRET ?? "";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const DAY = 24 * 60 * 60;

function sign(message: string): string {
  return createHmac("sha256", SECRET).update(message).digest("base64url");
}

function confirmPath(email: string, issued: number, token?: string): string {
  const query = new URLSearchParams({
    email,
    issued: String(issued),
    token: token ?? sign(`confirm|${email}|${issued}`),
  });
  return `/en/newsletter/confirm?${query.toString()}`;
}

function unsubscribePath(email: string, token?: string): string {
  const query = new URLSearchParams({
    email,
    token: token ?? sign(`unsubscribe|${email}`),
  });
  return `/en/newsletter/unsubscribe?${query.toString()}`;
}

const now = () => Math.floor(Date.now() / 1000);

async function expectNoAxeViolations(page: Page, selector = "main") {
  const { violations } = await new AxeBuilder({ page })
    .include(selector)
    .withTags(WCAG_TAGS)
    .analyze();
  expect(violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
}

/* The card appears on the link-expired page; a link without a query is invalid. */
async function openCard(page: Page, path = "/en/newsletter/confirm") {
  await page.goto(path);
  const card = page.locator("[data-newsletter-card]");
  await expect(
    card.getByRole("button", { name: /Subscribe|\[\[/ }),
  ).toBeEnabled();
  return card;
}

function emailField(card: Locator) {
  return card.getByRole("textbox");
}

test.describe("newsletter card", () => {
  test("subscribes and shows You're in", async ({ page }) => {
    const card = await openCard(page);
    await emailField(card).fill("Maria@Studio.pt");
    await card.getByRole("button", { name: "Subscribe" }).click();

    const title = card.getByRole("heading", { name: "You’re in." });
    await expect(title).toBeFocused();
    await expect(card).toContainText("maria@studio.pt");
    await expect(card).toContainText("You can unsubscribe at any time.");
    await expect(card.getByRole("textbox")).toHaveCount(0);
    await expectNoAxeViolations(page, "[data-newsletter-card]");
  });

  test("shows the error on the dark card and focuses the field", async ({
    page,
  }) => {
    const card = await openCard(page);
    await emailField(card).fill("maria@studio");
    await card.getByRole("button", { name: "Subscribe" }).click();

    const field = emailField(card);
    await expect(field).toBeFocused();
    await expect(field).toHaveAttribute("aria-invalid", "true");
    await expect(field).toHaveAccessibleDescription(
      "Enter a valid email address",
    );
    // red/300 on the dark card (Figma Newsletter States).
    await expect(card.locator('[data-slot="field-error"]')).toHaveCSS(
      "color",
      "rgb(255, 138, 138)",
    );
    await expectNoAxeViolations(page, "[data-newsletter-card]");
  });

  test("locks the form while subscribing", async ({ page }) => {
    const card = await openCard(page);
    await emailField(card).fill("e2e-slow@example.com");
    const submit = card.locator('button[type="submit"]');
    await submit.click();

    await expect(submit).toHaveText("Subscribing…");
    await expect(submit).toHaveAttribute("aria-busy", "true");
    await expect(emailField(card)).toBeDisabled();
    await expect(
      card.getByRole("heading", { name: "You’re in." }),
    ).toBeVisible();
  });

  test("says when there are too many attempts, or sending failed", async ({
    page,
  }) => {
    const card = await openCard(page);
    await emailField(card).fill("e2e-rate-limited@example.com");
    await card.getByRole("button", { name: "Subscribe" }).click();
    await expect(card.locator('[data-state="rate-limited"]')).toContainText(
      "Too many attempts",
    );

    await emailField(card).fill("e2e-failed@example.com");
    await card.getByRole("button", { name: "Subscribe" }).click();
    await expect(card.locator('[data-state="failed"]')).toContainText(
      "couldn’t subscribe you",
    );
    await expect(emailField(card)).toHaveValue("e2e-failed@example.com");
    await expectNoAxeViolations(page, "[data-newsletter-card]");
  });

  test("links the Privacy Policy and is translated in Portuguese", async ({
    page,
  }) => {
    const card = await openCard(page, "/pt/newsletter/confirm");
    await expect(
      card.getByRole("link", { name: /Privacy Policy/ }),
    ).toHaveAttribute("href", "/pt/legal/privacy");
    await expect(card.getByRole("heading", { level: 2 })).toContainText("[[");
  });

  test("stacks the field and button on mobile, one row from tablet", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    let card = await openCard(page);
    let field = await emailField(card).boundingBox();
    let button = await card.locator('button[type="submit"]').boundingBox();
    expect(button?.y).toBeGreaterThan((field?.y ?? 0) + (field?.height ?? 0));
    expect(Math.round(button?.width ?? 0)).toBe(Math.round(field?.width ?? 0));

    await page.setViewportSize({ width: 768, height: 1024 });
    card = await openCard(page);
    field = await emailField(card).boundingBox();
    button = await card.locator('button[type="submit"]').boundingBox();
    expect(Math.abs((button?.y ?? 0) - (field?.y ?? 0))).toBeLessThan(8);
  });
});

test.describe("confirm page", () => {
  test("confirms only when the button is pressed", async ({ page }) => {
    await page.goto(confirmPath("ana@example.com", now() - 60));

    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Confirm your subscription.",
    );
    await expect(page.locator("main")).toContainText("ana@example.com");
    await expectNoAxeViolations(page);

    await page.getByRole("button", { name: "Confirm subscription" }).click();
    const title = page.getByRole("heading", { level: 1 });
    await expect(title).toHaveText("You’re subscribed.");
    await expect(title).toBeFocused();
    await expect(
      page.getByRole("link", { name: "Back to home" }),
    ).toBeVisible();
  });

  test("is noindex and sends no referrer", async ({ page }) => {
    await page.goto(confirmPath("ana@example.com", now()));
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex/,
    );
    await expect(page.locator('meta[name="referrer"]')).toHaveAttribute(
      "content",
      "no-referrer",
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
  });

  test("an expired link offers the Newsletter card", async ({ page }) => {
    await page.goto(confirmPath("ana@example.com", now() - 8 * DAY));
    await page.getByRole("button", { name: "Confirm subscription" }).click();

    const title = page.getByRole("heading", { level: 1 });
    await expect(title).toHaveText("This link has expired.");
    await expect(title).toBeFocused();
    await expect(page.locator("[data-newsletter-card]")).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test("tampered, reused and malformed links are invalid", async ({ page }) => {
    const invalid = page.getByRole("heading", {
      level: 1,
      name: "This link doesn’t work.",
    });

    await page.goto(confirmPath("ana@example.com", now(), "x".repeat(43)));
    await page.getByRole("button", { name: "Confirm subscription" }).click();
    await expect(invalid).toBeVisible();

    await page.goto(confirmPath("e2e-used@example.com", now() - 60));
    await page.getByRole("button", { name: "Confirm subscription" }).click();
    await expect(invalid).toBeVisible();

    // No query at all: invalid straight away, nothing to press.
    await page.goto("/en/newsletter/confirm?email=ana%40example.com");
    await expect(invalid).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Confirm subscription" }),
    ).toHaveCount(0);
    await expect(page.locator("[data-newsletter-card]")).toBeVisible();
  });

  test("a failure offers Try again", async ({ page }) => {
    await page.goto(confirmPath("e2e-failed@example.com", now() - 60));
    await page.getByRole("button", { name: "Confirm subscription" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Something went wrong.",
    );
    await expect(page.getByRole("button", { name: "Try again" })).toBeEnabled();
  });
});

test.describe("unsubscribe page", () => {
  test("unsubscribes only when the button is pressed", async ({ page }) => {
    await page.goto(unsubscribePath("ana@example.com"));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Unsubscribe from the newsletter?",
    );
    await expectNoAxeViolations(page);

    await page.getByRole("button", { name: "Unsubscribe" }).click();
    const title = page.getByRole("heading", { level: 1 });
    await expect(title).toHaveText("You’re unsubscribed.");
    await expect(title).toBeFocused();
  });

  test("a tampered link is invalid and offers the studio email", async ({
    page,
  }) => {
    await page.goto(
      unsubscribePath("ana@example.com", sign("unsubscribe|bo@example.com")),
    );
    await page.getByRole("button", { name: "Unsubscribe" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "This link doesn’t work.",
    );
    await expect(page.locator('main a[href^="mailto:"]')).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test("a failure offers Try again", async ({ page }) => {
    await page.goto(unsubscribePath("e2e-failed@example.com"));
    await page.getByRole("button", { name: "Unsubscribe" }).click();
    await expect(page.getByRole("button", { name: "Try again" })).toBeEnabled();
  });
});
