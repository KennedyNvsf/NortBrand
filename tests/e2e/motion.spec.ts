import { expect, test, type Locator, type Page } from "@playwright/test";

/*
 * Site-wide motion (ticket #27, revised after review). The Services stage has its own
 * tests in services.spec.ts. These check behaviour, not timing: what starts hidden,
 * that it ends visible, and that reduced motion and first-screen content are never
 * held back.
 */

const isMobile = (page: Page) => (page.viewportSize()?.width ?? 0) < 768;

/** Fully visible and back in place (no leftover offset, scale or fade). */
function settled(locator: Locator) {
  return expect
    .poll(() =>
      locator.evaluate((element) => {
        const style = getComputedStyle(element);
        const { a, b, c, d, e, f } = new DOMMatrix(style.transform);
        return (
          style.opacity === "1" &&
          [a - 1, b, c, d - 1, e, f].every((value) => Math.abs(value) < 0.01)
        );
      }),
    )
    .toBe(true);
}

async function untilHydrated(action: () => Promise<void>) {
  await expect(action).toPass({ intervals: [250, 500, 1000], timeout: 15_000 });
}

test.describe("home", () => {
  test("the hero fills the first screen", async ({ page }) => {
    await page.goto("/en");
    const why = page.locator("section", {
      has: page.locator("#home-why-title"),
    });
    const top = await why.evaluate(
      (element) => element.getBoundingClientRect().top,
    );
    expect(top).toBeGreaterThanOrEqual(page.viewportSize()?.height ?? 0);
  });

  test("hero content is visible once its entrance ends", async ({ page }) => {
    await page.goto("/en");
    for (const element of [
      page.getByRole("heading", { level: 1 }),
      page.getByRole("link", { name: "View Services" }),
    ]) {
      await expect(element).toHaveCSS("opacity", "1");
    }
  });

  test("sections below the fold reveal as they scroll in", async ({ page }) => {
    await page.goto("/en");
    const heading = page.locator("#home-why-title");
    await untilHydrated(async () => {
      await expect(heading).toHaveCSS("opacity", "0", { timeout: 1000 });
    });
    await heading.scrollIntoViewIfNeeded();
    await settled(heading);
  });

  test.describe("with reduced motion", () => {
    test.use({ reducedMotion: "reduce" });

    test("revealed content ends untransformed", async ({ page }) => {
      await page.goto("/en");
      const heading = page.locator("#home-why-title");
      await page.waitForLoadState("networkidle");
      await heading.scrollIntoViewIfNeeded();
      await settled(heading);
    });
  });
});

test("client-side navigation fades the page in", async ({ page }) => {
  test.skip(isMobile(page), "desktop nav links");
  await page.goto("/en");
  await expect(page.locator("[data-page-transition]")).toHaveCount(0);

  const about = page.locator("header nav a", { hasText: "About" });
  await untilHydrated(async () => {
    await about.click();
    await expect(page).toHaveURL(/\/en\/about$/, { timeout: 2000 });
  });
  await expect(page.locator("[data-page-transition]")).toHaveCount(1);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  // Back to Home: with cacheComponents the page is shown again, not remounted, and
  // still fades in.
  await page.goBack();
  await expect(page).toHaveURL(/\/en$/);
  await expect(
    page.locator("[data-page-transition]", {
      has: page.locator("#home-hero-title"),
    }),
  ).toHaveCount(1);
});

test("booking buttons turn their arrow into a calendar on hover", async ({
  page,
}) => {
  test.skip(isMobile(page), "hover needs a pointer");
  await page.goto("/en");
  const button = page
    .locator("main")
    .getByRole("link", { name: "Book a Consultation" })
    .first();
  const [arrow, calendar] = [
    button.locator("span[aria-hidden] > span").nth(0),
    button.locator("span[aria-hidden] > span").nth(1),
  ];
  await expect(calendar).toHaveCSS("opacity", "0");
  await button.hover();
  await expect(calendar).toHaveCSS("opacity", "1");
  await expect(arrow).toHaveCSS("opacity", "0");
});

test("a red underline follows the hovered nav link", async ({ page }) => {
  test.skip(isMobile(page), "desktop nav");
  await page.goto("/en");
  const bar = page.locator("header nav ul > span[aria-hidden]");
  await expect(bar).toHaveCSS("opacity", "0");
  const contact = page.locator("header nav a", { hasText: "Contact" });
  await untilHydrated(async () => {
    await page.mouse.move(0, 400);
    await contact.hover();
    await expect(bar).toHaveCSS("opacity", "1", { timeout: 1000 });
  });
  const linkLeft = await contact.evaluate((element) =>
    element instanceof HTMLElement ? element.offsetLeft : 0,
  );
  await expect
    .poll(() =>
      bar.evaluate(
        (element) => new DOMMatrix(getComputedStyle(element).transform).e,
      ),
    )
    .toBeCloseTo(linkLeft, 0);
});

test("the approach accent travels to the selected point", async ({ page }) => {
  test.skip(isMobile(page), "the accordion replaces the tabs on mobile");
  await page.goto("/en/services");
  const list = page.getByRole("tablist");
  await list.scrollIntoViewIfNeeded();
  const accent = list.locator("> span[aria-hidden]");
  const y = () =>
    accent.evaluate((element) => element.getBoundingClientRect().top);

  await untilHydrated(async () => {
    await expect(list).toHaveAttribute("data-accent", "", { timeout: 1000 });
  });
  const before = await y();
  const tab = page.getByRole("tab").nth(2);
  await tab.click();
  await expect(tab).toHaveAttribute("aria-selected", "true");
  await expect.poll(y).toBeGreaterThan(before + 100);
  await settled(page.getByRole("tabpanel").locator("h3"));

  // It travels rather than jumps: sampled every frame, several offsets fall between
  // the old point and the new (about 10 at 60 fps). A marker that jumps shows at most
  // one: the spring's first frame, before the jump. A busy test browser can drop
  // frames, so a selection may be retried on another point.
  const travels = async (index: number) => {
    const samples = accent.evaluate(
      (element) =>
        new Promise<number[]>((resolve) => {
          const offsets: number[] = [];
          const start = performance.now();
          const sample = () => {
            offsets.push(new DOMMatrix(getComputedStyle(element).transform).f);
            if (performance.now() - start < 800) requestAnimationFrame(sample);
            else resolve(offsets);
          };
          requestAnimationFrame(sample);
        }),
    );
    await page.getByRole("tab").nth(index).click();
    const offsets = await samples;
    const [from = 0, to = 0] = [offsets[0], offsets.at(-1)];
    const [low, high] = [Math.min(from, to) + 10, Math.max(from, to) - 10];
    return (
      offsets.filter((offset) => offset > low && offset < high).length >= 3
    );
  };
  let travelled = false;
  for (const index of [0, 3, 1]) {
    travelled = await travels(index);
    if (travelled) break;
  }
  expect(travelled, "the accent passes through the points between").toBe(true);
});
