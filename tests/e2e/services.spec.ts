import { expect, test, type Page } from "@playwright/test";

import { copy } from "./copy";

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
    if (!(await details.isVisible())) {
      // On desktop the button may sit in a hidden stage step; focusing it (the
      // keyboard path) brings its step into view first. Blur first: re-focusing an
      // already focused element fires no focus event, so a retry would not move it.
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

function activeStep(page: Page) {
  return page
    .getByRole("navigation", { name: "Jump to a service" })
    .locator('[aria-current="step"]');
}

async function enterStage(page: Page) {
  const stage = page.getByRole("region", { name: "Our services" });
  const top = await stage.evaluate(
    (element) => element.getBoundingClientRect().top + window.scrollY,
  );
  await page.evaluate((y) => {
    window.scrollTo(0, y - 96 + 10);
  }, top);
  return stage;
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

  test.describe("pinned blocks (desktop)", () => {
    test.beforeEach(({ page }) => {
      test.skip(isMobile(page), "the stage pins on desktop only");
    });

    test("scrolling swaps blocks and the dots follow", async ({ page }) => {
      await page.goto("/en/services");
      await untilHydrated(async () => {
        await enterStage(page);
        await expect(activeStep(page)).toHaveAttribute(
          "aria-label",
          "Web Design",
          {
            timeout: 1000,
          },
        );
      });

      await page.mouse.wheel(0, 1600);
      await expect(activeStep(page)).not.toHaveAttribute(
        "aria-label",
        "Web Design",
      );
    });

    test("a block stays hidden until the stage pins, then plays in", async ({
      page,
    }) => {
      await page.goto("/en/services");
      const title = page.locator("#web-design h2");
      const stage = page.getByRole("region", { name: "Our services" });
      // Approaching: the stage is on screen but not pinned yet.
      await untilHydrated(async () => {
        await stage.evaluate((element) => {
          const top = element.getBoundingClientRect().top + window.scrollY;
          window.scrollTo(0, top - window.innerHeight / 2);
        });
        await expect(title).toHaveCSS("opacity", "0", { timeout: 1000 });
      });
      await enterStage(page);
      await expect(title).toHaveCSS("opacity", "1");
    });

    test("a dot jumps to its block", async ({ page }) => {
      await page.goto("/en/services");
      const dot = page.getByRole("button", {
        name: "Website Maintenance",
        exact: true,
      });
      await untilHydrated(async () => {
        await dot.click();
        await expect(dot).toHaveAttribute("aria-current", "step", {
          timeout: 1000,
        });
      });
      await expect(page.locator("#website-maintenance h2")).toBeInViewport();
    });

    test("an anchor lands on its step", async ({ page }) => {
      await page.goto("/en/services#content-writing");
      await expect(activeStep(page)).toHaveAttribute(
        "aria-label",
        "Content Writing",
      );
      await expect(page.locator("#content-writing h2")).toBeInViewport();
    });

    test("keyboard focus brings a hidden block into view", async ({ page }) => {
      await page.goto("/en/services");
      const trigger = page.getByRole("button", {
        name: "More Details: Social Media Management",
      });
      await untilHydrated(async () => {
        await trigger.focus();
        await expect(activeStep(page)).toHaveAttribute(
          "aria-label",
          "Social Media Management",
          { timeout: 1000 },
        );
      });
      await expect(trigger).toBeInViewport();
    });

    test.describe("with reduced motion", () => {
      test.use({ reducedMotion: "reduce" });

      test("the blocks are a plain stack without dots", async ({ page }) => {
        await page.goto("/en/services");
        await expect(
          page.getByRole("navigation", { name: "Jump to a service" }),
        ).toBeHidden();
        const stage = page.getByRole("region", { name: "Our services" });
        const height = await stage.evaluate(
          (element) => element.getBoundingClientRect().height,
        );
        // Five stacked blocks, not five stage heights of scroll track.
        expect(height).toBeLessThan(5 * 545 + 100);
        await expect(page.locator("#website-maintenance")).toHaveCSS(
          "opacity",
          "1",
        );
      });
    });

    test("a screen too short for a block gets the plain stack", async ({
      page,
    }) => {
      // 600 px tall: the stage would be 504 px, shorter than a block.
      await page.setViewportSize({ width: 1280, height: 600 });
      await page.goto("/en/services");
      await expect(
        page.getByRole("navigation", { name: "Jump to a service" }),
      ).toBeHidden();
      const stage = page.getByRole("region", { name: "Our services" });
      const height = await stage.evaluate(
        (element) => element.getBoundingClientRect().height,
      );
      expect(height).toBeLessThan(5 * 545 + 100);
    });
  });

  test("below desktop the blocks stack without dots", async ({ page }) => {
    test.skip(!isMobile(page), "mobile only");
    await page.goto("/en/services");
    await expect(
      page.getByRole("navigation", { name: "Jump to a service" }),
    ).toBeHidden();
    await expect(page.locator("main article")).toHaveCount(5);
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
