import { expect, test, type Page } from "@playwright/test";

import { onPreview } from "./target";

/*
 * WCAG 2.4.11 Focus Not Obscured (Minimum), #177: a control that takes keyboard focus is
 * never entirely covered by the sticky header or a bottom layer (Sticky CTA, promo card,
 * cookie banner). Safari scrolls focus only just into view, so the page reserves those
 * layers as scroll padding (globals.css, src/lib/fixed-bottom-inset.ts). Chromium
 * scrolls further and passed before the fix; the WebKit project is the one that guards
 * the Safari case.
 */

const PAGES = [
  "/en/contact",
  "/en/services",
  "/en/blog",
  "/en/blog/5-signs-your-brand-needs-a-refresh",
] as const;
const MAX_STOPS = 80;

type FocusStop = { id: string; visible: number };

/** The focused control and how many of its 9 sample points show (0 = entirely hidden). */
function measureFocus(page: Page): Promise<FocusStop | null> {
  return page.evaluate(() => {
    const element = document.activeElement;
    if (!(element instanceof HTMLElement) || element === document.body) {
      return null;
    }
    const box = element.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) return null;
    let visible = 0;
    for (const fx of [0.1, 0.5, 0.9]) {
      for (const fy of [0.1, 0.5, 0.9]) {
        const x = box.left + box.width * fx;
        const y = box.top + box.height * fy;
        if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) continue;
        const hit = document.elementFromPoint(x, y);
        if (hit && (element.contains(hit) || hit.contains(element))) {
          visible += 1;
        }
      }
    }
    const name = (
      element.getAttribute("aria-label") ??
      element.getAttribute("name") ??
      element.textContent
    )
      .trim()
      .slice(0, 40);
    return {
      id: `${element.tagName} ${name} ${String(Math.round(box.top + scrollY))}`,
      visible,
    };
  });
}

/**
 * Tabs through the page and returns every focus stop that stays entirely hidden. A stop
 * covered at first is measured again for about a second: a bottom layer can fade in over
 * it and then scroll it back into view (fixed-bottom-inset.ts), and the check is where
 * focus settles, not the frames in between.
 */
async function hiddenFocusStops(
  page: Page,
  browserName: string,
): Promise<string[]> {
  // Safari's Tab skips links; Option+Tab reaches every focusable element.
  const key = browserName === "webkit" ? "Alt+Tab" : "Tab";
  const hidden = new Set<string>();
  const seen = new Set<string>();
  for (let stop = 0; stop < MAX_STOPS; stop += 1) {
    await page.keyboard.press(key);
    // Let the browser finish scrolling the focused control into view.
    await page.waitForTimeout(browserName === "webkit" ? 300 : 50);
    let focused = await measureFocus(page);
    if (!focused) continue;
    if (seen.has(focused.id)) break; // wrapped around
    seen.add(focused.id);
    for (let retry = 0; retry < 4 && focused?.visible === 0; retry += 1) {
      await page.waitForTimeout(250);
      focused = await measureFocus(page);
    }
    if (focused?.visible === 0) hidden.add(focused.id);
  }
  return [...hidden];
}

test.describe("focus is never hidden under a fixed layer", () => {
  for (const path of PAGES) {
    test(`on ${path}`, async ({ page, browserName }) => {
      test.setTimeout(90_000);
      await page.goto(path);
      await expect(page.locator("h1")).toBeVisible();
      expect(await hiddenFocusStops(page, browserName)).toEqual([]);
    });
  }

  test.describe("with the cookie banner up", () => {
    test.use({ storageState: { cookies: [], origins: [] } });
    // Fresh browser state drops a preview's bypass cookie (target.ts); the banner
    // doesn't depend on the host, so the local run covers it.
    test.skip(onPreview, "needs a fresh browser state");

    test("on /en/contact", async ({ page, browserName }) => {
      test.setTimeout(90_000);
      await page.goto("/en/contact");
      await expect(
        page.locator("[data-consent-banner]").getByRole("heading"),
      ).toBeVisible();
      expect(await hiddenFocusStops(page, browserName)).toEqual([]);
    });
  });
});

test.describe("in-page anchors land below the header", () => {
  for (const path of [
    "/en/legal/privacy#your-rights",
    "/en/services#content-writing",
  ]) {
    test(path, async ({ page }) => {
      await page.goto(path);
      const id = path.split("#")[1] ?? "";
      const target = page.locator(`[id="${id}"]`);
      await expect(target).toBeVisible();
      await expect(async () => {
        const [headerBottom, targetTop] = await Promise.all([
          page
            .getByRole("banner")
            .evaluate((header) => header.getBoundingClientRect().bottom),
          target.evaluate((element) => element.getBoundingClientRect().top),
        ]);
        expect(targetTop).toBeGreaterThanOrEqual(headerBottom);
        // …and not pushed far down the screen by a doubled offset.
        expect(targetTop - headerBottom).toBeLessThan(80);
      }).toPass({ timeout: 5000 });
    });
  }
});
