import { expect, test, type Page } from "@playwright/test";

/*
 * Services page (ticket #10). Accessibility, H1, hreflang and overflow are covered by
 * the page harness (pages.spec.ts). The desktop project exercises the Dialog, the
 * mobile project (iPhone 14) the Drawer.
 */

const SLUGS = [
  "web-design",
  "web-development",
  "content-writing",
  "social-media-management",
  "website-maintenance",
];

const isMobile = (page: Page) => (page.viewportSize()?.width ?? 0) < 768;

/*
 * A click on a server-rendered control before React hydrates it does nothing, and
 * neither "load" nor "networkidle" guarantees hydration on a busy machine. Interactive
 * steps therefore retry the action until its effect is visible.
 */
async function untilHydrated(action: () => Promise<void>) {
  await expect(action).toPass({ intervals: [250, 500, 1000], timeout: 15_000 });
}

async function openDetails(page: Page, service: string, title: string) {
  const trigger = page.getByRole("button", {
    name: `More Details: ${service}`,
  });
  const details = page.getByRole("dialog", { name: title });
  await untilHydrated(async () => {
    if (!(await details.isVisible())) await trigger.click();
    await expect(details).toBeVisible({ timeout: 1000 });
  });
  return { trigger, details };
}

test.describe("services page", () => {
  test("hero has the H1 and the quote", async ({ page }) => {
    await page.goto("/en/services");
    const hero = page.getByRole("region", { name: /Everything your business/ });

    await expect(hero.getByRole("heading", { level: 1 })).toHaveText(
      "Everything your business needs to show up online.",
    );
    await expect(hero.locator("blockquote")).toContainText(
      "aren’t always the best",
    );
  });

  test("has one block per service, anchored by slug", async ({ page }) => {
    await page.goto("/pt/services");
    const blocks = page.locator("main article");

    await expect(blocks).toHaveCount(SLUGS.length);
    for (const [index, slug] of SLUGS.entries()) {
      await expect(blocks.nth(index)).toHaveAttribute("id", slug);
    }
  });

  test("a footer anchor lands on its block below the fixed header", async ({
    page,
  }) => {
    await page.goto("/en/services#content-writing");
    const heading = page.locator("#content-writing h2");
    await expect(heading).toBeInViewport();

    const headerBottom = await page
      .getByRole("banner")
      .evaluate((el) => el.getBoundingClientRect().bottom);
    const headingTop = await heading.evaluate(
      (el) => el.getBoundingClientRect().top,
    );
    expect(headingTop).toBeGreaterThanOrEqual(headerBottom);
  });

  test("More Details opens the service, traps focus, closes on Esc and returns focus", async ({
    page,
  }) => {
    await page.goto("/en/services");
    const { trigger, details } = await openDetails(
      page,
      "Web Development",
      "Built to Perform, Built to Last",
    );
    await expect(details).toHaveAttribute(
      "data-slot",
      isMobile(page) ? "drawer-content" : "dialog-content",
    );
    await expect(details.getByRole("listitem")).toHaveText([
      "Responsive development",
      "Performance optimization",
      "Clean, maintainable code",
    ]);
    await expect(
      details.getByRole("link", { name: "Book a Consultation" }),
    ).toHaveAttribute("href", "/en/contact");

    // Focus stays inside while tabbing through every control and wrapping around.
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press("Tab");
      const inside = await details.evaluate((el) =>
        el.contains(document.activeElement),
      );
      expect(inside).toBe(true);
    }

    await page.keyboard.press("Escape");
    await expect(details).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("the Close button closes the details", async ({ page }) => {
    await page.goto("/en/services");
    const { details } = await openDetails(
      page,
      "Website Maintenance",
      "Peace of Mind, Built In",
    );
    await details.getByRole("button", { name: "Close" }).last().click();
    await expect(details).toBeHidden();
  });

  test("our approach switches points", async ({ page }) => {
    await page.goto("/en/services");
    const section = page.getByRole("region", {
      name: "Every detail has a reason behind it.",
    });

    if (isMobile(page)) {
      const first = section.getByRole("button", { name: "Brand Identity" });
      const third = section.getByRole("button", { name: "Content Strategy" });
      await expect(first).toHaveAttribute("aria-expanded", "true");

      await untilHydrated(async () => {
        if ((await third.getAttribute("aria-expanded")) !== "true") {
          await third.click();
        }
        await expect(third).toHaveAttribute("aria-expanded", "true", {
          timeout: 1000,
        });
      });
      await expect(first).toHaveAttribute("aria-expanded", "false");
    } else {
      const tab = section.getByRole("tab", { name: "Content Strategy" });
      await untilHydrated(async () => {
        await tab.click();
        await expect(tab).toHaveAttribute("aria-selected", "true", {
          timeout: 1000,
        });
      });
      await expect(
        section.getByRole("tabpanel").getByRole("heading", { level: 3 }),
      ).toHaveText("Content Strategy");

      await page.keyboard.press("ArrowDown");
      await expect(
        section.getByRole("tab", { name: "Growth & Marketing" }),
      ).toBeFocused();
    }
  });
});
