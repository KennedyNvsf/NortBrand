// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";

import {
  cleanPageLocation,
  deleteGaCookies,
  disableAnalytics,
  enableAnalytics,
  resetAnalyticsForTests,
  trackEvent,
  trackPageView,
} from "./analytics";

const ID = "G-TEST123";

/** dataLayer holds `arguments` objects; compare them as arrays. */
function calls(): unknown[][] {
  return (window.dataLayer ?? []).map((entry) =>
    Array.from(entry as ArrayLike<unknown>),
  );
}

function clearCookies() {
  for (const part of document.cookie.split(";")) {
    const name = part.split("=")[0]?.trim();
    if (name) document.cookie = `${name}=; Max-Age=0; Path=/`;
  }
}

beforeEach(() => {
  resetAnalyticsForTests();
  delete window.dataLayer;
  delete window.gtag;
  document.head.innerHTML = "";
  clearCookies();
  window.history.replaceState(
    null,
    "",
    "/en/newsletter/confirm?email=ana%40x.pt&token=t",
  );
});

describe("before consent", () => {
  it("sends nothing and loads nothing", () => {
    trackPageView("/en");
    trackEvent("newsletter_subscribed", {});
    expect(window.dataLayer).toBeUndefined();
    expect(document.querySelector("script")).toBeNull();
  });
});

describe("enableAnalytics", () => {
  it("loads gtag.js once, with signals and ad personalization off", () => {
    enableAnalytics(ID);
    enableAnalytics(ID);

    const scripts = document.querySelectorAll("script[data-analytics]");
    expect(scripts).toHaveLength(1);
    expect(scripts[0]?.getAttribute("src")).toBe(
      "https://www.googletagmanager.com/gtag/js?id=G-TEST123",
    );
    const config = calls().find((call) => call[0] === "config");
    expect(config).toEqual([
      "config",
      ID,
      {
        send_page_view: false,
        page_location: "http://localhost:3000/en/newsletter/confirm",
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
      },
    ]);
  });

  it("never lets the query string reach Google", () => {
    enableAnalytics(ID);
    trackPageView("/en/newsletter/confirm");
    expect(JSON.stringify(calls())).not.toContain("ana");
    expect(JSON.stringify(calls())).not.toContain("token");
    expect(cleanPageLocation({ origin: "https://x.pt", pathname: "/en" })).toBe(
      "https://x.pt/en",
    );
  });

  it("sends page views and events with only their allowed fields", () => {
    enableAnalytics(ID);
    trackPageView("/en/about");
    trackEvent("consultation_request_submitted", { service: "web-design" });
    trackEvent("service_details_opened", { service: "website-maintenance" });
    trackEvent("language_switched", { from: "en", to: "pt" });

    expect(calls()).toContainEqual([
      "event",
      "page_view",
      expect.objectContaining({ page_path: "/en/about" }),
    ]);
    expect(calls()).toContainEqual([
      "event",
      "consultation_request_submitted",
      { service: "web-design" },
    ]);
    expect(calls()).toContainEqual([
      "event",
      "service_details_opened",
      { service: "website-maintenance" },
    ]);
    expect(calls()).toContainEqual([
      "event",
      "language_switched",
      { from: "en", to: "pt" },
    ]);
  });
});

describe("withdrawal", () => {
  it("switches GA off, stops sending and deletes its cookies", () => {
    enableAnalytics(ID);
    document.cookie = "_ga=GA1.1.1; Path=/";
    document.cookie = "_ga_TEST123=GS1.1; Path=/";
    document.cookie = "nb_consent=v1.0; Path=/";

    disableAnalytics(ID);
    expect(
      (window as unknown as Record<string, unknown>)[`ga-disable-${ID}`],
    ).toBe(true);
    expect(document.cookie).not.toContain("_ga");
    expect(document.cookie).toContain("nb_consent=v1.0");

    const before = calls().length;
    trackPageView("/en");
    trackEvent("newsletter_subscribed", {});
    expect(calls()).toHaveLength(before);

    // Accepting again in the same visit lifts the switch without a second script.
    enableAnalytics(ID);
    trackPageView("/en");
    expect(calls().length).toBeGreaterThan(before);
    expect(document.querySelectorAll("script[data-analytics]")).toHaveLength(1);
  });

  it("targets the host and every parent domain", () => {
    const written: string[] = [];
    const doc = {
      get cookie() {
        return "_ga=1; _ga_ABC=2; other=3";
      },
      set cookie(value: string) {
        written.push(value);
      },
    };
    deleteGaCookies(doc, "www.nortbrand.com");
    expect(written).toEqual(
      expect.arrayContaining([
        "_ga=; Max-Age=0; Path=/",
        "_ga=; Max-Age=0; Path=/; Domain=.nortbrand.com",
        "_ga_ABC=; Max-Age=0; Path=/; Domain=.www.nortbrand.com",
      ]),
    );
    expect(written.some((value) => value.startsWith("other="))).toBe(false);
  });
});
