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

  it("uses each language's own path when they differ (blog posts)", () => {
    expect(
      localeAlternates("en", "/blog/brand-refresh", {
        en: "/blog/brand-refresh",
        pt: "/blog/renovar-a-marca",
      }),
    ).toEqual({
      canonical: "/en/blog/brand-refresh",
      languages: {
        en: "/en/blog/brand-refresh",
        pt: "/pt/blog/renovar-a-marca",
        "x-default": "/pt/blog/renovar-a-marca",
      },
    });
  });

  it("lists only real translations, with x-default on the page itself", () => {
    expect(
      localeAlternates("en", "/blog/only-english", {
        en: "/blog/only-english",
      }),
    ).toEqual({
      canonical: "/en/blog/only-english",
      languages: {
        en: "/en/blog/only-english",
        "x-default": "/en/blog/only-english",
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

describe("pageMetadata for a blog post", () => {
  const post = {
    locale: "en",
    path: "/blog/only-english",
    title: "Only English",
    description: "An untranslated post.",
    siteName: "NortBrand",
    preview: false,
    paths: { en: "/blog/only-english" },
    image: {
      url: "https://cdn.sanity.io/cover.jpg",
      width: 1200,
      height: 630,
      alt: "A cover",
    },
    article: {
      publishedTime: "2026-09-24T09:00:00Z",
      modifiedTime: "2026-10-01T10:00:00Z",
      authors: ["Ana Ribeiro"],
      section: "Branding",
    },
  } as const;

  it("is an Open Graph article with the cover as its image", () => {
    const metadata = pageMetadata(post);
    expect(metadata.openGraph).toMatchObject({
      type: "article",
      publishedTime: "2026-09-24T09:00:00Z",
      modifiedTime: "2026-10-01T10:00:00Z",
      authors: ["Ana Ribeiro"],
      section: "Branding",
      images: [post.image],
    });
    expect(metadata.twitter).toMatchObject({ images: [post.image] });
  });

  it("names no alternate locale for a post without a translation", () => {
    expect(pageMetadata(post).openGraph).toMatchObject({ alternateLocale: [] });
  });
});
