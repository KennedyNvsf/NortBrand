import { expect, test } from "@playwright/test";

import { copy } from "./copy";

/* About page (ticket #11). Accessibility and overflow are covered by the page harness. */

test.describe("about page", () => {
  test("hero has the H1 and the lead", async ({ page }) => {
    await page.goto("/en/about");
    const hero = page.getByRole("region", { name: /Digital work, designed/ });

    await expect(hero.getByRole("heading", { level: 1 })).toHaveText(
      "Digital work, designed with the same care.",
    );
    await expect(hero).toContainText("every business, big or small");
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

  test("how we work lists the four commitments as h3s (#77)", async ({
    page,
  }) => {
    await page.goto("/en/about");
    const commitments = page.getByRole("region", {
      name: copy("en", "About.commitments.title"),
    });

    await expect(commitments.getByRole("heading", { level: 3 })).toHaveText([
      copy("en", "About.commitments.items.conversation.title"),
      copy("en", "About.commitments.items.proposal.title"),
      copy("en", "About.commitments.items.portal.title"),
      copy("en", "About.commitments.items.aftercare.title"),
    ]);
  });

  test("principle and CTA band use the About copy", async ({ page }) => {
    await page.goto("/en/about");

    await expect(
      page.getByRole("heading", {
        level: 2,
        name: copy("en", "About.principle.title"),
      }),
    ).toBeVisible();
    await expect(page.locator("#cta-band-title")).toHaveText(
      "Let’s start with your business.",
    );
  });
});
