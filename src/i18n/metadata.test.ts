import { describe, expect, it } from "vitest";

import { localeAlternates } from "./metadata";

describe("localeAlternates", () => {
  it("emits en, pt and x-default for the home page", () => {
    expect(localeAlternates("en", "/")).toEqual({
      canonical: "/en",
      languages: { en: "/en", pt: "/pt", "x-default": "/" },
    });
  });

  it("points x-default at the default locale for inner pages", () => {
    expect(localeAlternates("pt", "/services")).toEqual({
      canonical: "/pt/services",
      languages: {
        en: "/en/services",
        pt: "/pt/services",
        "x-default": "/pt/services",
      },
    });
  });
});
