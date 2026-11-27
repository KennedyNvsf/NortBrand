import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

import { copy, localeOf } from "./copy";
import { settleAnimations } from "./settle";

/*
 * The consultation form (#39) against the fake backend (playwright.config.ts sets
 * E2E_FAKE_BACKEND=1; src/features/consultation/e2e-backend.ts). The name picks the
 * outcome: "e2e:failed", "e2e:rate-limited", "e2e:slow", anything else succeeds.
 * The bot checks are real, so every test waits out the 3 s minimum fill time.
 */

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const MIN_FILL_MS = 3100;

async function openForm(page: Page, path = "/en/contact") {
  await page.goto(path);
  const card = page.locator('[data-form-slot="consultation"]');
  await expect(
    card.getByRole("button", {
      name: copy(localeOf(path), "Contact.form.submit"),
    }),
  ).toBeEnabled();
  // Hydrated, the form token requested; now let the minimum fill time pass.
  await page.waitForTimeout(MIN_FILL_MS);
  return card;
}

async function fillValid(card: Locator, name: string) {
  await card.getByLabel("Name").fill(name);
  await card.getByLabel("Email").fill("Maria@Studio.pt");
  await card.getByLabel("Phone (optional)").fill("+351 912 345 678");
  await card.getByRole("combobox", { name: "I’m interested in" }).click();
  await card
    .page()
    .getByRole("option", { name: "UX/UI & Brand Design" })
    .click();
  await card
    .getByLabel("Tell us about your project")
    .fill(
      "We run a small physiotherapy clinic and need a booking-first website.",
    );
}

async function expectNoAxeViolations(page: Page) {
  await settleAnimations(page);
  const { violations } = await new AxeBuilder({ page })
    .include('[data-form-slot="consultation"]')
    .withTags(WCAG_TAGS)
    .analyze();
  expect(violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
}

test.describe("consultation form", () => {
  test("sends a request and shows Request sent", async ({ page }) => {
    const card = await openForm(page);
    await fillValid(card, "Maria Costa");
    await card.getByRole("button", { name: "Send Request" }).click();

    const heading = card.getByRole("heading", { name: "Request sent." });
    await expect(heading).toBeFocused();
    await expect(card).toContainText("maria@studio.pt");
    await expect(
      card.getByRole("link", { name: "Back to home" }),
    ).toHaveAttribute("href", "/en");
    await expect(card.getByRole("status")).toHaveText("Request sent.");
    await expectNoAxeViolations(page);
  });

  test("shows translated field errors and focuses the first one", async ({
    page,
  }) => {
    const card = await openForm(page);
    await card.getByRole("button", { name: "Send Request" }).click();

    const name = card.getByLabel("Name");
    await expect(name).toBeFocused();
    await expect(name).toHaveAttribute("aria-invalid", "true");
    await expect(name).toHaveAccessibleDescription("Please enter your name");
    await expect(card.getByLabel("Email")).toHaveAccessibleDescription(
      "Enter a valid email address",
    );
    await expect(
      card.getByRole("combobox", { name: "I’m interested in" }),
    ).toHaveAccessibleDescription("Please choose a service");
    await expect(
      card.getByLabel("Tell us about your project"),
    ).toHaveAccessibleDescription("Tell us a little about your project");
    // The phone is optional: no error.
    await expect(card.getByLabel("Phone (optional)")).not.toHaveAttribute(
      "aria-invalid",
    );
    await expectNoAxeViolations(page);
  });

  test("errors are translated in Portuguese", async ({ page }) => {
    const card = await openForm(page, "/pt/contact");
    await card.locator('button[type="submit"]').click();
    await expect(
      card.locator('[data-slot="field-error"]').first(),
    ).toContainText(copy("pt", "Contact.form.errors.nameRequired"));
  });

  test("keeps every answer when sending fails, and offers Try again", async ({
    page,
  }) => {
    const card = await openForm(page);
    await fillValid(card, "Maria e2e:failed");
    await card.getByRole("button", { name: "Send Request" }).click();

    const banner = card.locator('[data-state="failed"]');
    await expect(banner).toBeFocused();
    await expect(banner).toContainText("We couldn’t send your message");
    await expect(card.getByLabel("Name")).toHaveValue("Maria e2e:failed");
    await expect(card.getByLabel("Tell us about your project")).toHaveValue(
      /physiotherapy clinic/,
    );
    await expect(card.getByRole("button", { name: "Try again" })).toBeEnabled();
    await expectNoAxeViolations(page);
  });

  test("says when there are too many requests", async ({ page }) => {
    const card = await openForm(page);
    await fillValid(card, "Maria e2e:rate-limited");
    await card.getByRole("button", { name: "Send Request" }).click();

    const banner = card.locator('[data-state="rateLimited"]');
    await expect(banner).toBeFocused();
    await expect(banner).toContainText("Too many requests");
  });

  test("locks the form while sending, so it cannot be sent twice", async ({
    page,
  }) => {
    const card = await openForm(page);
    await fillValid(card, "Maria e2e:slow");
    const submit = card.locator('button[type="submit"]');
    await submit.click();

    await expect(submit).toHaveText("Sending…");
    await expect(submit).toBeDisabled();
    await expect(submit).toHaveAttribute("aria-busy", "true");
    await expect(card.getByLabel("Name")).toBeDisabled();
    await expect(card).toContainText(
      "Sending your request — please keep this page open.",
    );
    await submit.click({ force: true });
    await expect(
      card.getByRole("heading", { name: "Request sent." }),
    ).toBeVisible();
  });

  test("works with the keyboard alone", async ({ page, browserName }) => {
    test.skip(
      browserName === "webkit",
      "WebKit does not Tab to buttons by default",
    );
    const card = await openForm(page);

    await card.getByLabel("Name").focus();
    await page.keyboard.type("Maria Costa");
    await page.keyboard.press("Tab");
    await page.keyboard.type("maria@studio.pt");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await expect(
      card.getByRole("combobox", { name: "I’m interested in" }),
    ).toBeFocused();
    await page.keyboard.press("Enter");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(
      card.getByRole("combobox", { name: "I’m interested in" }),
    ).not.toHaveText("Select a service");
    await page.keyboard.press("Tab");
    await page.keyboard.type("A booking website for our clinic.");
    await page.keyboard.press("Tab");
    await expect(
      card.getByRole("button", { name: "Send Request" }),
    ).toBeFocused();
    await page.keyboard.press("Enter");

    await expect(
      card.getByRole("heading", { name: "Request sent." }),
    ).toBeFocused();
  });

  test("preselects a valid ?service= and ignores anything else", async ({
    page,
  }) => {
    let card = await openForm(page, "/en/contact?service=content-writing");
    await expect(
      card.getByRole("combobox", { name: "I’m interested in" }),
    ).toHaveText("Content Writing");

    card = await openForm(page, "/en/contact?service=branding");
    await expect(
      card.getByRole("combobox", { name: "I’m interested in" }),
    ).toHaveText("Select a service");
  });
});
