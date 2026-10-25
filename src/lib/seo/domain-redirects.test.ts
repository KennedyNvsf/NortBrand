import { describe, expect, it } from "vitest";

import {
  LEGACY_PT_HOST,
  legacyDomainRedirects,
  pageSections,
} from "./domain-redirects";

const SITE = "https://nortbrand.com";

describe("legacyDomainRedirects", () => {
  const redirects = legacyDomainRedirects(SITE);

  it("matches only nortbrand.pt and www.nortbrand.pt (Next.js anchors the value)", () => {
    const host = new RegExp(`^${LEGACY_PT_HOST}$`);
    expect(host.test("nortbrand.pt")).toBe(true);
    expect(host.test("www.nortbrand.pt")).toBe(true);
    expect(host.test("nortbrand.com")).toBe(false);
    expect(host.test("evil-nortbrand.pt")).toBe(false);
    expect(host.test("nortbrand.pt.example.com")).toBe(false);
    for (const redirect of redirects) {
      expect(redirect.has).toEqual([{ type: "host", value: LEGACY_PT_HOST }]);
      expect(redirect.permanent).toBe(true);
    }
  });

  it("sends the bare domain to the Portuguese home page", () => {
    expect(redirects[0]).toMatchObject({
      source: "/",
      destination: "https://nortbrand.com/pt",
    });
  });

  it("keeps an explicit locale, then prefixes page paths, then keeps everything else", () => {
    expect(
      redirects.map(({ source, destination }) => [source, destination]),
    ).toEqual([
      ["/", "https://nortbrand.com/pt"],
      ["/:locale(en|pt)/:path*", "https://nortbrand.com/:locale/:path*"],
      [
        "/:section(services|about|contact|blog|legal|newsletter)/:path*",
        "https://nortbrand.com/pt/:section/:path*",
      ],
      ["/:path*", "https://nortbrand.com/:path*"],
    ]);
  });

  it("takes the page sections from the sitemap's page list, plus the newsletter pages", () => {
    expect(pageSections).toEqual([
      "services",
      "about",
      "contact",
      "blog",
      "legal",
      "newsletter",
    ]);
  });

  it("uses only the origin of the site URL", () => {
    expect(
      legacyDomainRedirects("https://nortbrand.com/some/path")[0]?.destination,
    ).toBe("https://nortbrand.com/pt");
  });
});
