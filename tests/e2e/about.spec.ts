import { expect, test } from "@playwright/test";

/* About page (ticket #11). Accessibility and overflow are covered by the page harness. */

test.describe("about page", () => {
  test("hero has the H1 and the lead", async ({ page }) => {
    await page.goto("/en/about");
    const hero = page.getByRole("region", { name: /Digital work, designed/ });

    await expect(hero.getByRole("heading", { level: 1 })).toHaveText(
      "Digital work, designed with the same care.",
    );
    await expect(hero).toContainText("small businesses deserve");
  });

  test("our story lists the four things we understand first, in order", async ({
    page,
  }) => {
    await page.goto("/en/about");
    const story = page.getByRole("region", {
      name: "More than a finished project.",
    });

    // toContainText: each item also holds its decorative (aria-hidden) number.
    await expect(story.getByRole("listitem")).toContainText([
      "What it does",
      "Who it serves",
      "How people interact with it",
      "What actually needs to work",
    ]);
  });

  test("principle and CTA band use the About copy", async ({ page }) => {
    await page.goto("/en/about");

    await expect(
      page.getByRole("heading", { level: 2, name: /Minimalism, but/ }),
    ).toHaveText("Minimalism, but functional products.");
    await expect(page.locator("#cta-band-title")).toHaveText(
      "Let’s start with your business.",
    );
  });
});
