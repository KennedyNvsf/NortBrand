import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import AxeBuilder from "@axe-core/playwright";
import { test, type Browser, type Page } from "@playwright/test";

import { locales, localizedPath, routes } from "../e2e/routes";
import { settleAnimations } from "../e2e/settle";
import { findSmallTouchTargets } from "../e2e/touch-targets";

/*
 * The audit behind docs/accessibility-audit.md (#84). For every page and width it
 * records each check's result as JSON instead of stopping at the first failure, so one
 * run fills the whole report table. Run instructions: playwright.audit.config.ts.
 *
 * Every context emulates reduced motion and has a consent choice made, like the e2e
 * suite. Below 1024 px it also emulates touch. Checks per width:
 *   axe (WCAG 2.0–2.2 A/AA tags), one h1 and one main, lang and title, canonical and
 *   hreflang (or noindex), no horizontal overflow, reduced motion after a full scroll,
 *   44 px touch targets (768 / 390 / 320), and a keyboard walk (1440 / 390).
 */

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const WIDTHS = [1440, 768, 390, 320] as const;
const TOUCH_WIDTHS: readonly number[] = [768, 390, 320];
const KEYBOARD_WIDTHS: readonly number[] = [1440, 390];
/** Motion Spec › Reduced motion: opacity fades only, 150 ms or less. */
const REDUCED_MAX_MS = 150;
const MAX_TAB_STOPS = 150;
/** Gap between scroll-position samples while a focus scroll settles. */
const KEYBOARD_SETTLE_MS = 80;

const OUT_DIR = path.join("test-results", "a11y-audit");

type Check = { pass: boolean; detail?: string };
type WidthResult = Record<string, Check>;
type PageResult = {
  page: string;
  locale: string;
  url: string;
  browser: string;
  status: number;
  widths: Record<number, WidthResult>;
};

async function newAuditPage(browser: Browser, width: number, baseURL: string) {
  const touch = width < 1024;
  const context = await browser.newContext({
    baseURL,
    viewport: { width, height: touch ? 844 : 900 },
    hasTouch: touch,
    reducedMotion: "reduce",
    storageState: {
      cookies: [
        {
          name: "nb_consent",
          value: "v1.0",
          domain: "localhost",
          path: "/",
          expires: -1,
          httpOnly: false,
          secure: false,
          sameSite: "Lax",
        },
      ],
      origins: [],
    },
  });
  return context.newPage();
}

async function checkStructure(page: Page, locale: string, noindex: boolean) {
  return page.evaluate(
    ({ locale, noindex }) => {
      const count = (selector: string) =>
        document.querySelectorAll(selector).length;
      const hreflangs = ["en", "pt", "x-default"].map((lang) =>
        count(`link[rel="alternate"][hreflang="${lang}"]`),
      );
      const robots =
        document
          .querySelector('meta[name="robots"]')
          ?.getAttribute("content") ?? "";
      const headings = Array.from(
        document.querySelectorAll("main h1, main h2, main h3, main h4"),
      ).map((h) => Number(h.tagName[1]));
      const skipped = headings.some(
        (level, i) => i > 0 && level - (headings[i - 1] ?? level) > 1,
      );
      return {
        h1: count("h1"),
        main: count("main"),
        lang: document.documentElement.lang,
        title: document.title.trim(),
        seo: noindex
          ? robots.includes("noindex") && count('link[rel="canonical"]') === 0
          : count('link[rel="canonical"]') === 1 &&
            hreflangs.every((n) => n === 1),
        hreflangs: hreflangs.join("/"),
        imgNoAlt: count("img:not([alt])"),
        skipped,
        langOk: document.documentElement.lang === locale,
      };
    },
    { locale, noindex },
  );
}

/** Scrolls the whole page so every reveal plays, then lists motion that breaks the rule. */
async function checkReducedMotion(page: Page) {
  const height = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y <= height; y += 400) {
    await page.evaluate((top) => {
      window.scrollTo(0, top);
    }, y);
    await page.waitForTimeout(60);
  }
  await page.waitForTimeout(300);
  return page.evaluate((max) => {
    const offenders: string[] = [];
    for (const animation of document.getAnimations()) {
      const timing = animation.effect?.getComputedTiming();
      const duration = Number(timing?.duration ?? 0);
      const target =
        animation.effect instanceof KeyframeEffect
          ? animation.effect.target
          : null;
      const name =
        target instanceof Element
          ? `${target.tagName.toLowerCase()}.${(target.getAttribute("class") ?? "").slice(0, 40)}`
          : "?";
      if (timing?.iterations === Infinity) offenders.push(`infinite: ${name}`);
      else if (duration > max) offenders.push(`${String(duration)}ms: ${name}`);
    }
    for (const video of document.querySelectorAll("video"))
      if (!video.paused && !video.ended) offenders.push("video playing");
    return offenders;
  }, REDUCED_MAX_MS);
}

/**
 * Tabs through the page from the top. Pass: the skip link is the first stop, every stop
 * shows a focus indicator, is on screen and not hidden under a fixed or sticky layer it
 * isn't part of (WCAG 2.4.11 Focus Not Obscured), and focus leaves the page or wraps
 * (no trap).
 *
 * WebKit scrolls a newly focused element into view a moment after the key press, so
 * each stop is read once the scroll position has stopped changing.
 */
async function waitForScrollToSettle(page: Page) {
  // Wait before the first sample too: the scroll may not have started yet.
  let last = -1;
  for (let i = 0; i < 10; i++) {
    await page.waitForTimeout(KEYBOARD_SETTLE_MS);
    const y = await page.evaluate(() => window.scrollY);
    if (y === last) return;
    last = y;
  }
}

type Stop = {
  id: string;
  ring: boolean;
  onScreen: boolean;
  /** The fixed or sticky layer that hides the whole element, if any. */
  hiddenBy: string;
  skip: boolean;
};

/** Reads the focused element, or null when focus has left the page. */
function readFocus(page: Page): Promise<Stop | null> {
  return page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return null;
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    const ring =
      (style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0) ||
      style.boxShadow !== "none";
    const onScreen =
      rect.bottom > 0 &&
      rect.right > 0 &&
      rect.top < innerHeight &&
      rect.left < innerWidth &&
      rect.width > 0 &&
      rect.height > 0;

    /** The fixed or sticky layer on top of a point, unless it is part of `el`. */
    const layerAt = (x: number, y: number) => {
      const hit = document.elementFromPoint(x, y);
      if (!hit || hit === el || el.contains(hit) || hit.contains(el)) return "";
      for (let node: Element | null = hit; node; node = node.parentElement) {
        const position = getComputedStyle(node).position;
        if (position === "fixed" || position === "sticky")
          return `${node.tagName.toLowerCase()}${node.id ? `#${node.id}` : ""}`;
      }
      return "";
    };

    // WCAG 2.4.11 (AA) fails only when the element is entirely hidden: probe its centre
    // and four points just inside its corners (of the part inside the viewport).
    let hiddenBy = "";
    if (onScreen) {
      const left = Math.max(rect.left, 0) + 2;
      const right = Math.min(rect.right, innerWidth) - 2;
      const top = Math.max(rect.top, 0) + 2;
      const bottom = Math.min(rect.bottom, innerHeight) - 2;
      const layers = [
        layerAt((left + right) / 2, (top + bottom) / 2),
        layerAt(left, top),
        layerAt(right, top),
        layerAt(left, bottom),
        layerAt(right, bottom),
      ];
      if (layers.every(Boolean)) hiddenBy = layers[0] ?? "";
    }

    const label = (el.getAttribute("aria-label") ?? el.textContent)
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, 40);
    return {
      id: `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ""} "${label}"`,
      ring,
      onScreen,
      hiddenBy,
      skip: el.getAttribute("href") === "#main",
    };
  });
}

/**
 * Walks the focus order with Tab, then back with Shift+Tab. Pass: the skip link is the
 * first stop; every stop shows a focus indicator, is on screen and isn't entirely hidden
 * under a fixed or sticky layer (the header, the sticky CTA: WCAG 2.4.11 Focus Not
 * Obscured); and focus leaves the page or wraps (no trap). The backward walk matters
 * because the browser scrolls a control above the viewport to the top edge, where the
 * header is, and one below it to the bottom edge, where the sticky CTA is.
 */
async function checkKeyboard(page: Page) {
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    (document.activeElement as HTMLElement | null)?.blur();
  });
  const problems = new Set<string>();
  const report = (stop: Stop) => {
    if (!stop.ring) problems.add(`no focus ring: ${stop.id}`);
    if (!stop.onScreen) problems.add(`off screen: ${stop.id}`);
    if (stop.hiddenBy)
      problems.add(`hidden under ${stop.hiddenBy}: ${stop.id}`);
  };

  let first = "";
  let stops = 0;
  let ended = false;
  for (let i = 0; i < MAX_TAB_STOPS; i++) {
    await page.keyboard.press("Tab");
    await waitForScrollToSettle(page);
    const stop = await readFocus(page);
    if (!stop) {
      ended = true;
      break;
    }
    if (i === 0) {
      first = stop.id;
      if (!stop.skip)
        problems.add(`first stop is ${stop.id}, not the skip link`);
    } else if (stop.id === first) {
      ended = true; // wrapped around
      break;
    }
    stops++;
    report(stop);
  }
  if (!ended)
    problems.add(`still inside the page after ${String(MAX_TAB_STOPS)} stops`);

  // Back up through the same stops from the end of the page.
  for (let i = 0; i < stops; i++) {
    await page.keyboard.press("Shift+Tab");
    await waitForScrollToSettle(page);
    const stop = await readFocus(page);
    if (!stop) break;
    report(stop);
  }
  return { stops, problems: [...problems] };
}

async function auditWidth(
  browser: Browser,
  baseURL: string,
  url: string,
  locale: string,
  noindex: boolean,
  width: number,
  keyboardLimited: boolean,
): Promise<{ status: number; result: WidthResult }> {
  const page = await newAuditPage(browser, width, baseURL);
  const result: WidthResult = {};
  try {
    const response = await page.goto(url, { waitUntil: "networkidle" });
    const status = response?.status() ?? 0;
    await page.locator("h1").first().waitFor();

    const structure = await checkStructure(page, locale, noindex);
    result.structure = {
      pass: structure.h1 === 1 && structure.main === 1,
      detail: `h1 ${String(structure.h1)}, main ${String(structure.main)}`,
    };
    result.langTitle = {
      pass: structure.langOk && structure.title.length > 0,
      detail: `lang ${structure.lang}, title "${structure.title}"`,
    };
    result.seo = { pass: structure.seo, detail: structure.hreflangs };
    result.images = {
      pass: structure.imgNoAlt === 0 && !structure.skipped,
      detail: `img without alt ${String(structure.imgNoAlt)}, skipped heading ${String(structure.skipped)}`,
    };

    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    result.overflow = { pass: overflow <= 0, detail: `${String(overflow)} px` };

    const motion = await checkReducedMotion(page);
    result.reducedMotion = {
      pass: motion.length === 0,
      detail: motion.slice(0, 5).join("; "),
    };

    await page.evaluate(() => {
      window.scrollTo(0, 0);
    });
    await settleAnimations(page);
    const { violations } = await new AxeBuilder({ page })
      .withTags(WCAG_TAGS)
      .analyze();
    result.axe = {
      pass: violations.length === 0,
      detail: violations
        .map((v) => `${v.id} (${v.impact ?? "?"}) × ${String(v.nodes.length)}`)
        .join("; "),
    };

    if (TOUCH_WIDTHS.includes(width)) {
      const small = await findSmallTouchTargets(page);
      result.touch = {
        pass: small.length === 0,
        detail: small
          .slice(0, 5)
          .map((s) => `${s.target} ${s.box}`)
          .join("; "),
      };
    }

    if (KEYBOARD_WIDTHS.includes(width)) {
      await page.goto(url, { waitUntil: "networkidle" });
      const keyboard = await checkKeyboard(page);
      // WebKit follows Safari's default: Tab skips links (report § 4.1).
      const problems = keyboardLimited
        ? keyboard.problems.filter((p) => !p.startsWith("first stop"))
        : keyboard.problems;
      result.keyboard = {
        pass: problems.length === 0,
        detail: `${String(keyboard.stops)} stops${problems.length ? `; ${problems.slice(0, 5).join("; ")}` : ""}`,
      };
    }
    return { status, result };
  } finally {
    await page.context().close();
  }
}

function save(result: PageResult) {
  mkdirSync(OUT_DIR, { recursive: true });
  const file = `${result.browser}-${result.locale}-${result.page.replace(/[^a-z0-9]+/gi, "-")}.json`;
  writeFileSync(path.join(OUT_DIR, file), JSON.stringify(result, null, 2));
}

async function auditPage(
  browser: Browser,
  browserName: string,
  baseURL: string,
  name: string,
  locale: string,
  url: string,
  noindex: boolean,
) {
  const result: PageResult = {
    page: name,
    locale,
    url,
    browser: browserName,
    status: 0,
    widths: {},
  };
  // WebKit: the two widths of § 4.1.
  const widths = browserName === "webkit" ? [1440, 390] : WIDTHS;
  for (const width of widths) {
    const { status, result: widthResult } = await auditWidth(
      browser,
      baseURL,
      url,
      locale,
      noindex,
      width,
      browserName === "webkit",
    );
    result.status = status;
    result.widths[width] = widthResult;
  }
  save(result);
  const failures = Object.entries(result.widths).flatMap(([width, checks]) =>
    Object.entries(checks)
      .filter(([, check]) => !check.pass)
      .map(([check, { detail }]) => `${width} ${check}: ${detail ?? ""}`),
  );
  test.info().annotations.push({
    type: "audit",
    description: failures.length ? failures.join(" | ") : "all checks pass",
  });
}

for (const route of routes) {
  for (const locale of locales) {
    const url = localizedPath(locale, route.path);
    const noindex = "notFound" in route || "noindex" in route;
    test(`${route.name} (${locale})`, async ({
      browser,
      browserName,
      baseURL,
    }) => {
      await auditPage(
        browser,
        browserName,
        baseURL ?? "",
        route.name,
        locale,
        url,
        noindex,
      );
    });
  }
}

/*
 * The three translated blog posts in each language: the first sitemap entries for that
 * language with both an en and a pt alternate (English-only posts have no pt one).
 */
for (const locale of locales) {
  test(`Blog posts (${locale})`, async ({
    browser,
    browserName,
    baseURL,
    request,
  }) => {
    const sitemap = await (await request.get("/sitemap.xml")).text();
    const loc = new RegExp(`<loc>[^<]*?(/${locale}/blog/[^<]+)</loc>`);
    const posts = Array.from(sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g))
      .map(([, entry = ""]) => entry)
      .filter(
        (entry) =>
          entry.includes('hreflang="en"') && entry.includes('hreflang="pt"'),
      )
      .map((entry) => loc.exec(entry)?.[1] ?? "")
      .filter(Boolean)
      .slice(0, 3);
    for (const [index, post] of posts.entries()) {
      await auditPage(
        browser,
        browserName,
        baseURL ?? "",
        `Post ${String(index + 1)}`,
        locale,
        post,
        false,
      );
    }
  });
}
