import type { ErrorEvent } from "@sentry/nextjs";
import { describe, expect, it } from "vitest";

import {
  scrubBreadcrumb,
  scrubEvent,
  sentryOptions,
  stripQuery,
  withoutSessions,
} from "./sentry";

describe("sentryOptions", () => {
  it("is off without a DSN", () => {
    expect(sentryOptions(undefined, "development").enabled).toBe(false);
  });

  it("sends errors only, without default personal data", () => {
    const options = sentryOptions(
      "https://key@o1.ingest.de.sentry.io/2",
      "preview",
    );
    expect(options).toMatchObject({
      enabled: true,
      sendDefaultPii: false,
      tracesSampleRate: 0,
    });
  });
});

describe("withoutSessions", () => {
  it("drops the per-page-view session integration and keeps the rest", () => {
    const defaults = [{ name: "BrowserSession" }, { name: "GlobalHandlers" }];
    expect(withoutSessions(defaults).map(({ name }) => name)).toEqual([
      "GlobalHandlers",
    ]);
  });
});

describe("stripQuery", () => {
  it("drops the query string and fragment", () => {
    expect(
      stripQuery(
        "https://nortbrand.com/en/newsletter/confirm?email=a@b.c&t=x#top",
      ),
    ).toBe("https://nortbrand.com/en/newsletter/confirm");
  });
});

describe("scrubEvent", () => {
  it("removes the user, body, cookies, headers and query string", () => {
    const event: ErrorEvent = {
      type: undefined,
      user: { email: "visitor@example.com", ip_address: "1.2.3.4" },
      request: {
        method: "POST",
        url: "https://nortbrand.com/en/contact?service=seo",
        data: { email: "visitor@example.com" },
        cookies: { NEXT_LOCALE: "en" },
        headers: { "x-forwarded-for": "1.2.3.4" },
        query_string: "service=seo",
      },
    };
    expect(scrubEvent(event)).toEqual({
      type: undefined,
      request: { method: "POST", url: "https://nortbrand.com/en/contact" },
    });
  });

  it("drops console breadcrumbs and strips URLs from the rest", () => {
    const event: ErrorEvent = {
      type: undefined,
      breadcrumbs: [
        { category: "console", message: "visitor@example.com" },
        {
          category: "fetch",
          data: { url: "/api/x?email=visitor@example.com" },
        },
        { category: "navigation", data: { from: "/en?a=1", to: "/pt?b=2" } },
      ],
    };
    expect(scrubEvent(event).breadcrumbs).toEqual([
      { category: "fetch", data: { url: "/api/x" } },
      { category: "navigation", data: { from: "/en", to: "/pt" } },
    ]);
  });

  it("keeps breadcrumbs without data as they are", () => {
    expect(
      scrubBreadcrumb({ category: "ui.click", message: "button" }),
    ).toEqual({
      category: "ui.click",
      message: "button",
    });
  });
});
