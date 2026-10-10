import { describe, expect, it } from "vitest";

import { localeAlternates, pageMetadata } from "./metadata";

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

describe("pageMetadata", () => {
  const base = {
    locale: "pt",
    path: "/services",
    title: "Serviços",
    description: "Descrição",
    siteName: "NortBrand",
    preview: false,
  } as const;

  it("adds the site name to share titles, not to the page title", () => {
    const metadata = pageMetadata(base);
    expect(metadata.title).toBe("Serviços");
    expect(metadata.openGraph?.title).toBe("Serviços · NortBrand");
    expect(metadata.twitter?.title).toBe("Serviços · NortBrand");
  });

  it("keeps an absolute title as is (home page)", () => {
    const metadata = pageMetadata({
      ...base,
      path: "/",
      title: { absolute: "NortBrand — A Digital Brand Experience" },
    });
    expect(metadata.openGraph?.title).toBe(
      "NortBrand — A Digital Brand Experience",
    );
    expect(metadata.alternates?.canonical).toBe("/pt");
  });

  it("describes the locale and its alternate for Open Graph", () => {
    const { openGraph, alternates } = pageMetadata(base);
    expect(openGraph).toMatchObject({
      type: "website",
      siteName: "NortBrand",
      url: "/pt/services",
      locale: "pt_PT",
      alternateLocale: ["en_GB"],
      description: "Descrição",
    });
    expect(alternates?.canonical).toBe("/pt/services");
  });

  it("shares the locale's image on Open Graph and a large Twitter card", () => {
    const image = {
      url: "/pt/opengraph-image",
      width: 1200,
      height: 630,
      type: "image/png",
      alt: "NortBrand",
    };
    const { openGraph, twitter } = pageMetadata(base);
    expect(openGraph?.images).toEqual([image]);
    expect(twitter).toMatchObject({
      card: "summary_large_image",
      images: [image],
    });
  });

  it("is indexable by default and noindex on preview deployments", () => {
    expect(pageMetadata(base).robots).toBeUndefined();
    expect(pageMetadata({ ...base, preview: true }).robots).toEqual({
      index: false,
      follow: false,
    });
  });
});
