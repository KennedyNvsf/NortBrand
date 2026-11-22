import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { promo } from "../../src/content/promo";
import { PROMO_STORAGE_KEY } from "../../src/features/promo/promo-storage";
import { copy } from "./copy";
import { settleAnimations } from "./settle";

/*
 * The Home promo (#126): a Dialog from 768 px, a bottom sheet below. Every other spec
 * starts with the offer dismissed (promo-state.ts); this one starts without it.
 * page.clock fakes time, so the 8 s delay and the end date are tested without waiting
 * and without depending on today's date.
 */

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const DURING_OFFER = new Date("2026-12-01T10:00:00Z");
const AFTER_OFFER = new Date("2027-01-02T10:00:00Z");

const consentCookie = {
  name: "nb_consent",
  value: "v1.0",
  domain: "localhost",
  path: "/",
  expires: -1,
  httpOnly: false,
  secure: false,
  sameSite: "Lax" as const,
};

const isMobile = (page: Page) => (page.viewportSize()?.width ?? 0) < 768;

/** The open promo, by its title ("Get 20% off your first project."). */
function promoDialog(page: Page) {
  return page.getByRole("dialog", { name: /20% off/ });
}

/*
 * The 8 s timer starts when React has hydrated and read the cookie choice, which the
 * page doesn't signal. So after load the paused clock is advanced in 1 s steps until
 * the promo opens, up to 12 s; "not before" is checked separately at 7 s.
 */
/** The Portuguese title has a line break, so match a phrase rather than the whole. */
function ptDialog(page: Page) {
  return page.getByRole("dialog", { name: /20% de desconto/ });
}

async function openHome(page: Page, path = "/en", time = DURING_OFFER) {
  // Paused, so only the spec moves time: page load doesn't count towards the 8 s.
  // (pauseAt must move forward, hence the earlier install.)
  await page.clock.install({ time: new Date(time.getTime() - 10_000) });
  await page.clock.pauseAt(time);
  await page.goto(path);
  await page.waitForLoadState("networkidle");
}

async function advanceUntilOpen(page: Page, dialog = promoDialog(page)) {
  for (let second = 0; second < 12; second++) {
    if (await dialog.isVisible()) break;
    await page.clock.fastForward(1000);
    await dialog.waitFor({ state: "visible", timeout: 300 }).catch(() => {
      // Not yet: advance another second.
    });
  }
  await expect(dialog).toBeVisible();
  return dialog;
}

test.describe("home promo", () => {
  test.use({ storageState: { cookies: [consentCookie], origins: [] } });

  test("opens 8 s after load, not before", async ({ page }) => {
    await openHome(page);
    await page.clock.fastForward(7000);
    await expect(promoDialog(page)).toHaveCount(0);

    const dialog = await advanceUntilOpen(page);
    await expect(dialog).toContainText(copy("en", "Promo.terms"));
    await expect(
      dialog.getByRole("link", { name: copy("en", "Common.bookConsultation") }),
    ).toHaveAttribute("href", "/en/contact");
    // Mobile is the sheet, wider screens the two-panel modal.
    await expect(dialog).toHaveAttribute(
      "data-slot",
      isMobile(page) ? "drawer-content" : "dialog-content",
    );
  });

  test("traps focus, closes on Esc and stays dismissed", async ({ page }) => {
    await openHome(page);
    const dialog = await advanceUntilOpen(page);

    for (let i = 0; i < 6; i++) {
      await page.keyboard.press("Tab");
      await expect(dialog.locator(":focus")).toHaveCount(1);
    }

    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    expect(
      await page.evaluate(
        (key) => window.localStorage.getItem(key),
        PROMO_STORAGE_KEY,
      ),
    ).toBe(promo.id);

    await page.reload();
    await expect(page.locator("h1")).toBeVisible();
    await page.clock.fastForward(20_000);
    await expect(promoDialog(page)).toHaveCount(0);
  });

  test('"Not now" closes it', async ({ page }) => {
    await openHome(page);
    const dialog = await advanceUntilOpen(page);
    await dialog
      .getByRole("button", { name: copy("en", "Promo.dismiss") })
      .click();
    await expect(dialog).toHaveCount(0);
  });

  test("Book a Consultation goes to Contact and dismisses the offer", async ({
    page,
  }) => {
    await openHome(page);
    await (
      await advanceUntilOpen(page)
    )
      .getByRole("link", { name: copy("en", "Common.bookConsultation") })
      .click();
    await expect(page).toHaveURL(/\/en\/contact$/);
    expect(
      await page.evaluate(
        (key) => window.localStorage.getItem(key),
        PROMO_STORAGE_KEY,
      ),
    ).toBe(promo.id);
  });

  test("never shows after the offer ends", async ({ page }) => {
    await openHome(page, "/en", AFTER_OFFER);
    await page.clock.fastForward(20_000);
    await expect(promoDialog(page)).toHaveCount(0);
  });

  test("has no axe violations while open, in Portuguese too", async ({
    page,
  }) => {
    await openHome(page, "/pt");
    await advanceUntilOpen(page, ptDialog(page));
    // settleAnimations waits on animation frames, which a paused clock holds back.
    await page.clock.resume();
    await settleAnimations(page);
    const { violations } = await new AxeBuilder({ page })
      .include('[data-motion="promo"]')
      .withTags(WCAG_TAGS)
      .analyze();
    expect(violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });

  test("never overflows the screen at 390 in Portuguese", async ({ page }) => {
    test.skip(!isMobile(page), "mobile only");
    await openHome(page, "/pt");
    const dialog = await advanceUntilOpen(page, ptDialog(page));
    const overflow = await dialog.evaluate(
      (el) => el.scrollWidth - el.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test.describe("home promo before a cookie choice", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("waits for the choice, then 8 s", async ({ page }) => {
    await openHome(page);
    await page.clock.fastForward(20_000);
    await expect(promoDialog(page)).toHaveCount(0);

    await page
      .getByRole("region", { name: copy("en", "Consent.banner.title") })
      .getByRole("button", { name: copy("en", "Consent.banner.reject") })
      .click();
    await advanceUntilOpen(page);
  });
});

/*
 * The corner card on About and Services (#127): the same trigger and dismissal as the
 * Home modal, but non-blocking. A labelled `aside` (complementary landmark), never a
 * dialog; it takes no focus. On mobile it holds the Sticky CTA's slot.
 */
function promoCard(page: Page, title: RegExp = /20% off/) {
  return page.getByRole("complementary", { name: title });
}

test.describe("promo corner card", () => {
  test.use({ storageState: { cookies: [consentCookie], origins: [] } });

  for (const path of ["/en/about", "/en/services"]) {
    test(`shows 8 s after load on ${path}, without taking focus`, async ({
      page,
    }) => {
      await openHome(page, path);
      await page.clock.fastForward(7000);
      await expect(promoCard(page)).toHaveCount(0);

      const card = await advanceUntilOpen(page, promoCard(page));
      await expect(card).toContainText(copy("en", "Promo.terms"));
      await expect(
        card.getByRole("link", { name: copy("en", "Common.bookConsultation") }),
      ).toHaveAttribute("href", "/en/contact");
      await expect(page.getByRole("dialog")).toHaveCount(0);
      // Non-blocking: focus stays where it was, and the page still scrolls.
      expect(await page.evaluate(() => document.activeElement?.tagName)).toBe(
        "BODY",
      );
      expect(
        await page.evaluate(() =>
          document.body.hasAttribute("data-scroll-locked"),
        ),
      ).toBe(false);
    });
  }

  test("Close dismisses it, and the Home modal stays closed too", async ({
    page,
  }) => {
    await openHome(page, "/en/about");
    const card = await advanceUntilOpen(page, promoCard(page));
    await card.getByRole("button", { name: copy("en", "Promo.close") }).click();
    await page.clock.resume();
    await expect(promoCard(page)).toHaveCount(0);
    expect(
      await page.evaluate(
        (key) => window.localStorage.getItem(key),
        PROMO_STORAGE_KEY,
      ),
    ).toBe(promo.id);

    // Same page, so the clock is already installed: navigate and give it time.
    await page.goto("/en");
    await page.waitForLoadState("networkidle");
    await page.clock.fastForward(20_000);
    await expect(promoDialog(page)).toHaveCount(0);
  });

  test("Book a Consultation goes to Contact and dismisses the offer", async ({
    page,
  }) => {
    await openHome(page, "/en/services");
    const card = await advanceUntilOpen(page, promoCard(page));
    await page.clock.resume();
    await card
      .getByRole("link", { name: copy("en", "Common.bookConsultation") })
      .click();
    await expect(page).toHaveURL(/\/en\/contact$/);
    expect(
      await page.evaluate(
        (key) => window.localStorage.getItem(key),
        PROMO_STORAGE_KEY,
      ),
    ).toBe(promo.id);
  });

  test("never shows after the offer ends", async ({ page }) => {
    await openHome(page, "/en/about", AFTER_OFFER);
    await page.clock.fastForward(20_000);
    await expect(promoCard(page)).toHaveCount(0);
  });

  test("takes the Sticky CTA's slot on mobile, and gives it back", async ({
    page,
  }) => {
    test.skip(!isMobile(page), "mobile only");
    // Services: long enough that the bar has room between the hero and the CTA band
    // (on About the band, which hides the bar by design, is already in view).
    await openHome(page, "/en/services");
    const sticky = page.locator('[data-slot="sticky-cta"]');
    // Past the hero, where the Sticky CTA shows. (Mobile WebKit has no mouse wheel, so
    // scroll the window directly.)
    await page.evaluate(() => {
      window.scrollTo(0, 1300);
    });
    const card = await advanceUntilOpen(page, promoCard(page));
    // The bar's IntersectionObserver runs once the clock does.
    await page.clock.resume();

    // Never both at once: the bar wants to show (data-visible) but leaves the slot
    // while the card holds it (hidden, so out of the tab order too).
    await expect(sticky).toHaveAttribute("data-visible", "true");
    await expect(sticky).toBeHidden();
    await expect(card).toBeVisible();

    await card.getByRole("button", { name: copy("en", "Promo.close") }).click();
    await expect(promoCard(page)).toHaveCount(0);
    await expect(sticky).toBeVisible();
  });

  for (const path of ["/en/about", "/pt/services"]) {
    test(`has no axe violations while open on ${path}`, async ({ page }) => {
      await openHome(page, path);
      await advanceUntilOpen(
        page,
        promoCard(page, path.startsWith("/pt") ? /20% de desconto/ : /20% off/),
      );
      await page.clock.resume();
      await settleAnimations(page);
      const { violations } = await new AxeBuilder({ page })
        .include('[data-motion="promo-card"]')
        .withTags(WCAG_TAGS)
        .analyze();
      expect(violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    });
  }

  test("never overflows the screen at 390 in Portuguese", async ({ page }) => {
    test.skip(!isMobile(page), "mobile only");
    await openHome(page, "/pt/about");
    await advanceUntilOpen(page, promoCard(page, /20% de desconto/));
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
