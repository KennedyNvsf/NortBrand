import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { copy } from "./copy";
import { settleAnimations } from "./settle";
import { findSmallTouchTargets } from "./touch-targets";

/*
 * The portal accessibility harness (#143; docs/accessibility-audit.md § 6). Every portal
 * screen, at 1440, 768 and 390, the client screens in EN and PT: axe (WCAG 2.2 AA), one
 * visible H1, the page's language, and at 390 no horizontal overflow and 44 px touch
 * targets. The 390 pass runs with reduced motion and checks nothing is left invisible.
 * Fake backend; desktop project only (it sets each width itself).
 */

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const PROJECT = "NB-1234";
const WIDTHS = [
  { width: 1440, height: 900 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
] as const;

type Screen = { name: string; path: string; lang: string };

const clientScreens = (locale: "en" | "pt"): Screen[] =>
  [
    ["Overview", ""],
    ["Tasks", "/tasks"],
    ["Task detail", "/tasks?task=1"],
    ["Timeline", "/timeline"],
    ["Files", "/files"],
    ["Updates", "/updates"],
  ].map(([name, path]) => ({
    name: `Client ${name ?? ""} (${locale.toUpperCase()})`,
    path: `/${locale}/portal/${PROJECT}${path ?? ""}`,
    lang: locale,
  }));

const teamScreens: Screen[] = [
  ["Projects", "/team"],
  ["Projects · archived", "/team?view=archived"],
  ["My tickets", "/team/my-tickets"],
  ["Team", "/team/team"],
  ["Settings", "/team/settings"],
  ["States", "/team/states"],
  ["Project overview", `/team/projects/${PROJECT}`],
  ["Board", `/team/projects/${PROJECT}/board`],
  ["Board · ticket editor", `/team/projects/${PROJECT}/board?ticket=1`],
  ["Timeline", `/team/projects/${PROJECT}/timeline`],
  ["Files", `/team/projects/${PROJECT}/files`],
  ["Updates", `/team/projects/${PROJECT}/updates`],
  ["Client access", `/team/projects/${PROJECT}/access`],
  ["View as client (PT)", `/team/projects/${PROJECT}/preview/pt`],
  ["View as client · tasks (EN)", `/team/projects/${PROJECT}/preview/en/tasks`],
].map(([name, path]) => ({
  name: `Team ${name ?? ""}`,
  path: path ?? "",
  lang: "en",
}));

async function clientSignIn(page: Page, locale: "en" | "pt", width: number) {
  await page.goto(`/${locale}/portal`);
  await page
    .getByLabel(copy(locale, "Portal.signIn.email"))
    // One address per width and language: the runs sign in at the same time, and the
    // fake backend (like the real one) refuses overlapping code requests for one email.
    .fill(`client-a11y-${locale}-${String(width)}@e2e.example`);
  await page.getByLabel(copy(locale, "Portal.signIn.projectId")).fill(PROJECT);
  const send = page.getByRole("button", {
    name: copy(locale, "Portal.signIn.send"),
  });
  await expect(async () => {
    await send.click();
    await expect(send).toBeHidden({ timeout: 2000 });
  }).toPass();
  await page
    .getByRole("textbox", {
      name: `${copy(locale, "Portal.signIn.codeLabel")} 1/6`,
    })
    .click();
  await page.keyboard.type("123456");
  await expect(page).toHaveURL(new RegExp(`/${locale}/portal/${PROJECT}$`));
}

async function teamSignIn(page: Page) {
  await page.goto("/team/sign-in");
  await page.getByLabel("Email").fill("admin@e2e.example");
  const send = page.getByRole("button", { name: "Send me a code" });
  await expect(async () => {
    await send.click();
    await expect(send).toBeHidden({ timeout: 2000 });
  }).toPass();
  await page.getByRole("textbox", { name: "6-digit code 1/6" }).click();
  await page.keyboard.type("123456");
  await expect(page).toHaveURL(/\/team$/);
}

async function checkScreen(page: Page, screen: Screen, width: number) {
  await page.goto(screen.path);
  await expect(page.locator("h1:visible").first()).toBeVisible();
  await settleAnimations(page);

  const { violations } = await new AxeBuilder({ page })
    .withTags(WCAG_TAGS)
    .analyze();
  expect
    .soft(
      violations.map((v) => `${v.id}: ${v.help}`),
      `${screen.name} @${String(width)}: axe`,
    )
    .toEqual([]);
  await expect
    .soft(page.locator("h1:visible"), `${screen.name}: one H1`)
    .toHaveCount(1);

  // The content's language: the document's, or the preview's wrapper for its screens.
  const lang = await page.evaluate(() => {
    const wrapper = document.querySelector("main")?.closest("[lang]");
    return wrapper?.getAttribute("lang") ?? document.documentElement.lang;
  });
  const expected = screen.path.includes("/preview/pt")
    ? "pt"
    : screen.path.includes("/preview/en")
      ? "en"
      : screen.lang;
  expect.soft(lang, `${screen.name}: lang`).toBe(expected);

  if (width < 768) {
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect
      .soft(overflow, `${screen.name}: no overflow at 390`)
      .toBeLessThanOrEqual(0);
    expect
      .soft(await findSmallTouchTargets(page), `${screen.name}: 44 px targets`)
      .toEqual([]);
    // Reduced motion: nothing in the page is left hidden by an entrance animation.
    const invisible = await page.evaluate(() =>
      [...document.querySelectorAll("main *")]
        .filter((element) => {
          const box = element.getBoundingClientRect();
          return (
            box.width > 0 &&
            box.height > 0 &&
            element.textContent.trim() !== "" &&
            getComputedStyle(element).opacity === "0"
          );
        })
        .map((element) => element.tagName.toLowerCase())
        .slice(0, 5),
    );
    expect
      .soft(invisible, `${screen.name}: reduced motion shows content`)
      .toEqual([]);
  }
}

for (const viewport of WIDTHS) {
  test.describe(`Portal accessibility at ${String(viewport.width)}`, () => {
    test.use({
      viewport,
      reducedMotion: viewport.width < 768 ? "reduce" : "no-preference",
    });

    test.beforeEach(({}, testInfo) => {
      test.skip(
        testInfo.project.name !== "desktop",
        "The harness sets each width itself; the desktop project runs it.",
      );
      // Up to 15 screens with axe each: well past the default 30 s.
      test.setTimeout(360_000);
    });

    for (const locale of ["en", "pt"] as const) {
      test(`client screens (${locale.toUpperCase()})`, async ({ page }) => {
        await clientSignIn(page, locale, viewport.width);
        for (const screen of clientScreens(locale)) {
          await checkScreen(page, screen, viewport.width);
        }
      });
    }

    test("client sign-in (EN, PT)", async ({ page }) => {
      for (const locale of ["en", "pt"] as const) {
        await checkScreen(
          page,
          {
            name: `Client sign-in (${locale})`,
            path: `/${locale}/portal`,
            lang: locale,
          },
          viewport.width,
        );
      }
    });

    test("team sign-in", async ({ page }) => {
      await checkScreen(
        page,
        { name: "Team sign-in", path: "/team/sign-in", lang: "en" },
        viewport.width,
      );
    });

    test("team screens", async ({ page }) => {
      await teamSignIn(page);
      for (const screen of teamScreens) {
        await checkScreen(page, screen, viewport.width);
      }
    });
  });
}
