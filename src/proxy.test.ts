import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import proxy, { config } from "./proxy";

function requestRoot(headers: Record<string, string> = {}) {
  return new NextRequest("https://nortbrand.test/", { headers });
}

function redirectTarget(response: Response) {
  const location = response.headers.get("location");
  return location ? new URL(location).pathname : null;
}

describe("locale proxy (ADR-006)", () => {
  it("only runs on the bare root, so /studio, /api and prefixed URLs are untouched", () => {
    expect(config.matcher).toEqual(["/"]);
  });

  it("prefers the NEXT_LOCALE cookie over Accept-Language", () => {
    const response = proxy(
      requestRoot({ cookie: "NEXT_LOCALE=en", "accept-language": "pt-PT,pt" }),
    );
    expect(redirectTarget(response)).toBe("/en");
  });

  it("falls back to Accept-Language when there is no cookie", () => {
    const response = proxy(
      requestRoot({ "accept-language": "en-GB,en;q=0.9" }),
    );
    expect(redirectTarget(response)).toBe("/en");
  });

  it("falls back to pt when nothing matches", () => {
    const response = proxy(
      requestRoot({ "accept-language": "fr-FR,fr;q=0.9" }),
    );
    expect(redirectTarget(response)).toBe("/pt");
  });

  it("falls back to pt with no signals at all", () => {
    expect(redirectTarget(proxy(requestRoot()))).toBe("/pt");
  });

  it("ignores an unsupported cookie value", () => {
    const response = proxy(
      requestRoot({ cookie: "NEXT_LOCALE=de", "accept-language": "en" }),
    );
    expect(redirectTarget(response)).toBe("/en");
  });
});
