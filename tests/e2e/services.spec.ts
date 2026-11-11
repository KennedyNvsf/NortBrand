import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { copy } from "./copy";
import { settleAnimations } from "./settle";

/* Same tags as the page harness (pages.spec.ts). */
const WCAG_TAGS = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "wcag22aa",
] as const;

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

/** The Services grid section (#124). */
const GRID = "section[aria-labelledby=services-grid-title]";

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
    if (!(await details.isVisible())) {
      // Focus first (the keyboard path), then click. Blur before refocusing: focusing
      // an already focused element fires no focus event, so a retry would not move it.
      await trigger.evaluate((element) => {
        element.blur();
      });
      await trigger.focus();
      await trigger.click({ timeout: 1000 });
    }
    await expect(details).toBeVisible({ timeout: 1000 });
  });
  return { trigger, details };
}

const heroTitle = copy("en", "Services.hero.title");

test.describe("services page", () => {
  test("hero has the H1 and the quote", async ({ page }) => {
    await page.goto("/en/services");
    const hero = page.getByRole("region", { name: heroTitle });

    await expect(hero.getByRole("heading", { level: 1 })).toHaveText(heroTitle);
    await expect(hero.locator("blockquote")).toContainText(
      copy("en", "Services.hero.quote"),
    );
  });

  // #68. Playback itself is not asserted: Playwright's Chromium has no H.264 decoder.
  test("hero fills the first screen with a silent looping video", async ({
    page,
  }) => {
    await page.goto("/en/services");
    const hero = page.getByRole("region", { name: heroTitle });
    const box = await hero.boundingBox();
    const viewport = page.viewportSize();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(viewport?.height ?? 0);

    const video = hero.locator("video");
    await expect(video).toHaveAttribute("aria-hidden", "true");
    await expect(video).toHaveAttribute("loop", "");
    await expect(video).toHaveAttribute("playsinline", "");
    expect(await video.evaluate((v: HTMLVideoElement) => v.muted)).toBe(true);
    // No controls of any kind: the loop is decorative (#68 review).
    await expect(hero.getByRole("button")).toHaveCount(0);
  });

  test("has one card per service, anchored by slug", async ({ page }) => {
    await page.goto("/pt/services");
    const blocks = page.locator(GRID).locator("article");

    await expect(blocks).toHaveCount(SLUGS.length);
    for (const [index, slug] of SLUGS.entries()) {
      await expect(blocks.nth(index)).toHaveAttribute("id", slug);
    }
  });

  test("a footer anchor lands on its card below the fixed header", async ({
    page,
  }) => {
    await page.goto("/en/services#content-writing");
    const heading = page.locator("#content-writing h3");
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
      copy("en", "Services.items.webDevelopment.title"),
    );
    await expect(details).toHaveAttribute(
      "data-slot",
      isMobile(page) ? "drawer-content" : "dialog-content",
    );
    await expect(details.getByRole("listitem")).toHaveText(
      ["first", "second", "third"].map((item) =>
        copy("en", `Services.items.webDevelopment.included.${item}`),
      ),
    );
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

  test("the red details panel passes axe and its mark finishes drawn (#119)", async ({
    page,
  }) => {
    test.skip(isMobile(page), "the visual panel shows from lg only");
    await page.goto("/en/services");
    const { details } = await openDetails(
      page,
      "Web Design",
      copy("en", "Services.items.webDesign.title"),
    );
    const mark = details.locator("svg path[stroke]").first();
    // The draw is running: the stroke starts hidden and is animated by mark-draw.
    await expect
      .poll(() =>
        mark.evaluate((path) => {
          const [animation] = path.getAnimations();
          return animation instanceof CSSAnimation
            ? animation.animationName
            : null;
        }),
      )
      .toBe("mark-draw");

    await settleAnimations(page);
    await expect
      .poll(() =>
        mark.evaluate((path) => getComputedStyle(path).strokeDashoffset),
      )
      .toMatch(/^0(px)?$/);

    // Contrast of the white label and icon on the red fill, among the rest.
    const { violations } = await new AxeBuilder({ page })
      .include('[role="dialog"]')
      .withTags([...WCAG_TAGS])
      .analyze();
    expect(
      violations.map((v) => `${v.id}: ${v.help} × ${v.nodes.length}`),
    ).toEqual([]);
  });

  test("our approach switches points", async ({ page }) => {
    await page.goto("/en/services");
    const section = page.getByRole("region", {
      name: copy("en", "Services.approach.title"),
    });
    const point = (key: string) =>
      copy("en", `Services.approach.points.${key}.title`);

    if (isMobile(page)) {
      const first = section.getByRole("button", {
        name: point("brandIdentity"),
      });
      const third = section.getByRole("button", {
        name: point("contentStrategy"),
      });
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
      const tab = section.getByRole("tab", { name: point("contentStrategy") });
      await untilHydrated(async () => {
        await tab.click();
        await expect(tab).toHaveAttribute("aria-selected", "true", {
          timeout: 1000,
        });
      });
      await expect(
        section.getByRole("tabpanel").getByRole("heading", { level: 3 }),
      ).toHaveText(point("contentStrategy"));

      await page.keyboard.press("ArrowDown");
      await expect(
        section.getByRole("tab", { name: point("growth") }),
      ).toBeFocused();
    }
  });

  test("a focused tab panel shows the focus ring (#93)", async ({ page }) => {
    test.skip(
      isMobile(page),
      "the tabs show from md; mobile uses the accordion",
    );
    await page.goto("/en/services");
    const section = page.getByRole("region", {
      name: copy("en", "Services.approach.title"),
    });
    const tab = section.getByRole("tab", {
      name: copy("en", "Services.approach.points.brandIdentity.title"),
    });
    await untilHydrated(async () => {
      await tab.focus();
      await expect(tab).toBeFocused({ timeout: 1000 });
    });

    // Radix makes the panel the next tab stop after the selected tab (WCAG 2.4.7).
    await page.keyboard.press("Tab");
    const panel = section.getByRole("tabpanel");
    await expect(panel).toBeFocused();
    const ring = await panel.evaluate((element) => {
      const style = getComputedStyle(element);
      return [style.outlineStyle, style.outlineWidth, style.outlineOffset];
    });
    expect(ring).toEqual(["solid", "2px", "2px"]);
  });

  test("the grid is 3 + 2 on desktop, 2 + 2 + 1 on tablet, one column on mobile (#124)", async ({
    page,
  }) => {
    await page.goto("/en/services");
    const cards = page.locator(GRID).locator("article");
    await expect(cards).toHaveCount(5);
    const boxes = await cards.evaluateAll((elements) =>
      elements.map((element) => {
        const { left, top, width } = element.getBoundingClientRect();
        return {
          left: Math.round(left),
          top: Math.round(top + scrollY),
          width,
        };
      }),
    );
    const rows = new Map<number, number>();
    for (const { top } of boxes) rows.set(top, (rows.get(top) ?? 0) + 1);
    const perRow = [...rows.values()];
    if (isMobile(page)) {
      expect(perRow).toEqual([1, 1, 1, 1, 1]);
    } else {
      // The desktop project runs at 1280 px: 3 cards, then 2 wider ones.
      expect(perRow).toEqual([3, 2]);
      expect(boxes[3]?.width ?? 0).toBeGreaterThan(
        (boxes[0]?.width ?? 0) * 1.3,
      );
    }
  });

  test("a click anywhere on a card opens its details (#124)", async ({
    page,
  }) => {
    await page.goto("/en/services");
    const card = page.locator("#website-maintenance");
    const details = page.getByRole("dialog", {
      name: copy("en", "Services.items.maintenance.title"),
    });
    await card.scrollIntoViewIfNeeded();
    // The summary is plain text, not a control: the stretched trigger covers it, so a
    // real mouse click on the text lands on the trigger (Playwright's element click
    // would refuse, because the text is covered, which is the point).
    const summary = card.getByText(copy("en", "ServiceSummaries.maintenance"));
    await untilHydrated(async () => {
      if (!(await details.isVisible())) {
        await summary.scrollIntoViewIfNeeded();
        const box = await summary.boundingBox();
        if (box) await page.mouse.click(box.x + 20, box.y + box.height / 2);
      }
      await expect(details).toBeVisible({ timeout: 1000 });
    });
    // Still one control per card, named for its service.
    await page.keyboard.press("Escape");
    await expect(card.getByRole("button")).toHaveCount(1);
    await expect(card.getByRole("button")).toHaveAccessibleName(
      "More Details: Website Maintenance",
    );
  });

  test("a card lifts on hover (#124)", async ({ page }) => {
    test.skip(isMobile(page), "hover only applies on devices that can hover");
    await page.goto("/en/services");
    const card = page.locator("#web-design");
    await card.scrollIntoViewIfNeeded();
    await settleAnimations(page);
    await card.hover();
    await expect
      .poll(() =>
        card.evaluate((element) => getComputedStyle(element).translate),
      )
      .toMatch(/^0px -4px$|^0px -0.25rem$/);
  });
});

test.describe("service cards with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("a card does not move on hover (#124)", async ({ page }) => {
    test.skip(isMobile(page), "hover only applies on devices that can hover");
    await page.goto("/en/services");
    const card = page.locator("#web-design");
    await card.scrollIntoViewIfNeeded();
    await card.hover();
    await page.waitForTimeout(400);
    expect(
      await card.evaluate((element) => getComputedStyle(element).translate),
    ).toBe("none");
  });
});

test.describe("details panel with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("the mark is simply drawn, with no animation (#119)", async ({
    page,
  }) => {
    test.skip(isMobile(page), "the visual panel shows from lg only");
    await page.goto("/en/services");
    const { details } = await openDetails(
      page,
      "Web Design",
      copy("en", "Services.items.webDesign.title"),
    );
    const mark = details.locator("svg path[stroke]").first();
    const state = await mark.evaluate((path) => ({
      animations: path.getAnimations().length,
      offset: getComputedStyle(path).strokeDashoffset,
    }));
    expect(state.animations).toBe(0);
    expect(state.offset).toMatch(/^0(px)?$/);
  });
});

test.describe("services hero with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("the video never starts and the photo stays", async ({ page }) => {
    await page.goto("/en/services");
    const hero = page.getByRole("region", { name: heroTitle });
    await expect(hero.getByRole("heading", { level: 1 })).toBeVisible();
    const state = await hero
      .locator("video")
      .evaluate((v: HTMLVideoElement) => ({
        paused: v.paused,
        // preload="none" and no play(): nothing was fetched.
        networkState: v.networkState,
      }));
    expect(state.paused).toBe(true);
    expect(state.networkState).not.toBe(2); // HTMLMediaElement.NETWORK_LOADING
  });
});
