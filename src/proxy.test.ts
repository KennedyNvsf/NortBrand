import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import proxy, { config } from "./proxy";

vi.mock("./env", () => ({
  publicEnv: {
    NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.test",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
  },
}));

function requestRoot(headers: Record<string, string> = {}) {
  return new NextRequest("https://nortbrand.test/", { headers });
}

function redirectTarget(response: Response) {
  const location = response.headers.get("location");
  return location ? new URL(location).pathname : null;
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("locale proxy (ADR-006)", () => {
  it("runs on the bare root and the portal only, so /studio, /api and other prefixed URLs are untouched", () => {
    expect(config.matcher).toEqual([
      "/",
      "/(en|pt)/portal",
      "/(en|pt)/portal/:path*",
      "/team",
      "/team/:path*",
    ]);
  });

  it("prefers the NEXT_LOCALE cookie over Accept-Language", async () => {
    const response = await proxy(
      requestRoot({ cookie: "NEXT_LOCALE=en", "accept-language": "pt-PT,pt" }),
    );
    expect(redirectTarget(response)).toBe("/en");
  });

  it("falls back to Accept-Language when there is no cookie", async () => {
    const response = await proxy(
      requestRoot({ "accept-language": "en-GB,en;q=0.9" }),
    );
    expect(redirectTarget(response)).toBe("/en");
  });

  it("falls back to pt when nothing matches", async () => {
    const response = await proxy(
      requestRoot({ "accept-language": "fr-FR,fr;q=0.9" }),
    );
    expect(redirectTarget(response)).toBe("/pt");
  });

  it("falls back to pt with no signals at all", async () => {
    expect(redirectTarget(await proxy(requestRoot()))).toBe("/pt");
  });

  it("ignores an unsupported cookie value", async () => {
    const response = await proxy(
      requestRoot({ cookie: "NEXT_LOCALE=de", "accept-language": "en" }),
    );
    expect(redirectTarget(response)).toBe("/en");
  });
});

describe("portal session proxy (ADR-009)", () => {
  it("never redirects a portal URL to another locale", async () => {
    vi.stubEnv("E2E_FAKE_BACKEND", "1");
    const response = await proxy(
      new NextRequest("https://nortbrand.test/pt/portal", {
        headers: { cookie: "NEXT_LOCALE=en", "accept-language": "en" },
      }),
    );
    expect(redirectTarget(response)).toBeNull();
  });

  it("refreshes the team portal's session without a locale redirect (#132)", async () => {
    vi.stubEnv("E2E_FAKE_BACKEND", "1");
    for (const path of ["/team", "/team/sign-in"]) {
      const response = await proxy(
        new NextRequest(`https://nortbrand.test${path}`),
      );
      expect(redirectTarget(response)).toBeNull();
    }
  });

  it("covers nested portal pages", async () => {
    vi.stubEnv("E2E_FAKE_BACKEND", "1");
    const response = await proxy(
      new NextRequest("https://nortbrand.test/en/portal/NB-4821"),
    );
    expect(redirectTarget(response)).toBeNull();
  });
});
