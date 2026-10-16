import {
  expect,
  test,
  type BrowserContext,
  type Page,
  type Request,
} from "@playwright/test";

/*
 * GA4 after consent (#43, ADR-007). Every request to a Google domain is counted and
 * answered with an empty script, so nothing leaves the machine and gtag's queue
 * (window.dataLayer) shows exactly what would have been sent.
 */

const GOOGLE = /(^|\.)(google|googletagmanager|google-analytics|doubleclick)\./;

function consentState(value?: "v1.0" | "v1.1") {
  return {
    cookies: value
      ? [
          {
            name: "nb_consent",
            value,
            domain: "localhost",
            path: "/",
            expires: -1,
            httpOnly: false,
            secure: false,
            sameSite: "Lax" as const,
          },
        ]
      : [],
    origins: [],
  };
}

async function watchGoogle(context: BrowserContext): Promise<Request[]> {
  const requests: Request[] = [];
  context.on("request", (request) => {
    if (GOOGLE.test(new URL(request.url()).hostname)) requests.push(request);
  });
  await context.route(
    (url) => GOOGLE.test(url.hostname),
    (route) =>
      route.fulfill({ status: 200, contentType: "text/javascript", body: "" }),
  );
  return requests;
}

/** gtag's queue as plain arrays (it stores `arguments` objects). */
async function dataLayer(page: Page): Promise<unknown[][]> {
  return page.evaluate(() =>
    (window.dataLayer ?? []).map((entry) =>
      Array.from(entry as ArrayLike<unknown>),
    ),
  );
}

async function pageViews(page: Page): Promise<string[]> {
  return (await dataLayer(page))
    .filter((call) => call[0] === "event" && call[1] === "page_view")
    .map((call) => (call[2] as { page_path: string }).page_path);
}

/** A client-side navigation through the footer (desktop: no menu to open). */
async function goToAboutClientSide(page: Page) {
  await page
    .getByRole("contentinfo")
    .getByRole("link", { name: "About" })
    .click();
  await expect(page).toHaveURL(/\/en\/about$/);
}

test.describe("no consent, no Google", () => {
  test.describe("before a choice", () => {
    test.use({ storageState: consentState() });

    test("makes zero requests to Google", async ({ page, context }) => {
      const requests = await watchGoogle(context);
      await page.goto("/en");
      await expect(
        page.getByRole("region", { name: "Cookies, kept simple." }),
      ).toBeVisible();
      await page.goto("/en/services");
      await expect(page.locator("h1")).toBeVisible();
      expect(requests).toHaveLength(0);
      expect(await page.evaluate(() => window.dataLayer)).toBeUndefined();
    });
  });

  test.describe("after Reject", () => {
    test.use({ storageState: consentState("v1.0") });

    test("makes zero requests to Google", async ({
      page,
      context,
      isMobile,
    }) => {
      const requests = await watchGoogle(context);
      await page.goto("/en");
      await expect(page.locator("h1")).toBeVisible();
      if (!isMobile) await goToAboutClientSide(page);
      await page.goto("/en/contact");
      await expect(page.locator("h1")).toBeVisible();
      expect(requests).toHaveLength(0);
    });

    test("rejecting from the banner also makes none", async ({ browser }) => {
      const context = await browser.newContext({
        storageState: consentState(),
      });
      const requests = await watchGoogle(context);
      const page = await context.newPage();
      await page.goto("/en");
      await page
        .getByRole("region", { name: "Cookies, kept simple." })
        .getByRole("button", { name: "Reject non-essential" })
        .click();
      await page.goto("/en/about");
      await expect(page.locator("h1")).toBeVisible();
      expect(requests).toHaveLength(0);
      await context.close();
    });
  });
});

test.describe("after Accept", () => {
  test.use({ storageState: consentState() });

  test("loads gtag with signals and ad personalization off", async ({
    page,
    context,
  }) => {
    const requests = await watchGoogle(context);
    await page.goto("/en");
    await page
      .getByRole("region", { name: "Cookies, kept simple." })
      .getByRole("button", { name: "Accept all" })
      .click();

    await expect.poll(() => requests.length).toBeGreaterThan(0);
    expect(requests[0]?.url()).toMatch(
      /^https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=G-/,
    );
    const config = (await dataLayer(page)).find((call) => call[0] === "config");
    expect(config?.[2]).toMatchObject({
      send_page_view: false,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    });
    expect(await pageViews(page)).toEqual(["/en"]);
  });

  test("sends a page view on each client-side navigation", async ({
    page,
    context,
    isMobile,
  }) => {
    test.skip(isMobile, "the footer route is checked on desktop");
    await watchGoogle(context);
    await context.addCookies(consentState("v1.1").cookies);
    await page.goto("/en");
    await expect.poll(() => pageViews(page)).toEqual(["/en"]);

    await goToAboutClientSide(page);
    await expect.poll(() => pageViews(page)).toEqual(["/en", "/en/about"]);
  });
});

test.describe("what reaches analytics", () => {
  test.use({ storageState: consentState("v1.1") });

  test("never the query string of a newsletter link", async ({
    page,
    context,
  }) => {
    await watchGoogle(context);
    await page.goto(
      "/en/newsletter/confirm?email=ana%40example.com&issued=1&token=secret-token",
    );
    await expect
      .poll(() => pageViews(page))
      .toEqual(["/en/newsletter/confirm"]);
    const sent = JSON.stringify(await dataLayer(page));
    expect(sent).not.toContain("ana");
    expect(sent).not.toContain("secret-token");
  });

  test("consultation_submitted carries the service only", async ({
    page,
    context,
  }) => {
    await watchGoogle(context);
    await page.goto("/en/contact");
    const card = page.locator('[data-form-slot="consultation"]');
    await expect(
      card.getByRole("button", { name: "Send Request" }),
    ).toBeEnabled();
    await page.waitForTimeout(3100); // the form's minimum fill time (#37)
    await card.getByLabel("Name").fill("Maria Costa");
    await card.getByLabel("Email").fill("maria@studio.pt");
    await card.getByRole("combobox", { name: "I’m interested in" }).click();
    await page.getByRole("option", { name: "Web Design" }).click();
    await card
      .getByLabel("Tell us about your project")
      .fill("A booking website for our clinic, please.");
    await card.getByRole("button", { name: "Send Request" }).click();
    await expect(
      card.getByRole("heading", { name: "Request sent." }),
    ).toBeVisible();

    const calls = await dataLayer(page);
    expect(calls).toContainEqual([
      "event",
      "consultation_submitted",
      { service: "web-design" },
    ]);
    const sent = JSON.stringify(calls);
    for (const personal of ["Maria", "maria@studio.pt", "clinic"]) {
      expect(sent).not.toContain(personal);
    }
  });

  test("newsletter_subscribed carries nothing", async ({ page, context }) => {
    await watchGoogle(context);
    await page.goto("/en/newsletter/confirm");
    const card = page.locator("[data-newsletter-card]");
    await card.getByRole("textbox").fill("maria@studio.pt");
    await card.getByRole("button", { name: "Subscribe" }).click();
    await expect(
      card.getByRole("heading", { name: "You’re in." }),
    ).toBeVisible();

    const calls = await dataLayer(page);
    expect(calls).toContainEqual(["event", "newsletter_subscribed", {}]);
    expect(JSON.stringify(calls)).not.toContain("maria");
  });
});

test.describe("withdrawing consent", () => {
  test.use({ storageState: consentState("v1.1") });

  test("stops sending and deletes the _ga cookies", async ({
    page,
    context,
    isMobile,
  }) => {
    test.skip(isMobile, "the footer route is checked on desktop");
    await watchGoogle(context);
    await context.addCookies([
      { name: "_ga", value: "GA1.1.1", domain: "localhost", path: "/" },
      { name: "_ga_TEST", value: "GS1.1", domain: "localhost", path: "/" },
    ]);
    await page.goto("/en");
    await expect.poll(() => pageViews(page)).toEqual(["/en"]);

    await page.getByRole("button", { name: "Cookie settings" }).click();
    await page
      .getByRole("dialog", { name: "Cookie preferences" })
      .getByRole("button", { name: "Reject all" })
      .click();

    const names = (await context.cookies()).map((cookie) => cookie.name);
    expect(names).not.toContain("_ga");
    expect(names).not.toContain("_ga_TEST");
    expect(
      await page.evaluate(() =>
        Object.keys(window).some(
          (key) =>
            key.startsWith("ga-disable-") &&
            (window as unknown as Record<string, unknown>)[key] === true,
        ),
      ),
    ).toBe(true);

    await goToAboutClientSide(page);
    expect(await pageViews(page)).toEqual(["/en"]);
  });
});
