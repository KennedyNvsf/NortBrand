import { describe, expect, it } from "vitest";

import { site, type SiteConfig } from "@/content/site";
import { sitePages } from "@/content/site-pages";

import { buildRobots, buildSitemap } from "./crawl";
import { isPreviewDeployment } from "./deployment";
import {
  blogPostingJsonLd,
  breadcrumbJsonLd,
  organizationJsonLd,
  serializeJsonLd,
  servicesJsonLd,
} from "./structured-data";

const SITE = "https://nortbrand.pt";

describe("isPreviewDeployment", () => {
  it("is true only for Vercel preview builds", () => {
    expect(isPreviewDeployment({ VERCEL_ENV: "preview" })).toBe(true);
    expect(isPreviewDeployment({ VERCEL_ENV: "production" })).toBe(false);
    expect(isPreviewDeployment({})).toBe(false);
  });
});

describe("buildSitemap", () => {
  const sitemap = buildSitemap(SITE, sitePages);

  it("lists every page in both locales", () => {
    expect(sitemap).toHaveLength(sitePages.length * 2);
    expect(sitemap.map((entry) => entry.url)).toEqual(
      expect.arrayContaining([
        "https://nortbrand.pt/en",
        "https://nortbrand.pt/pt",
        "https://nortbrand.pt/en/services",
        "https://nortbrand.pt/pt/legal/terms",
      ]),
    );
  });

  it("gives every entry absolute hreflang alternates, including x-default", () => {
    const services = sitemap.find(
      (entry) => entry.url === "https://nortbrand.pt/en/services",
    );
    expect(services?.alternates?.languages).toEqual({
      en: "https://nortbrand.pt/en/services",
      pt: "https://nortbrand.pt/pt/services",
      "x-default": "https://nortbrand.pt/pt/services",
    });
  });

  it("leaves out the Studio", () => {
    const urls = sitemap.map((entry) => entry.url).join(" ");
    expect(urls).not.toContain("/studio");
  });
});

describe("buildRobots", () => {
  it("allows crawling in production except the Studio, API and portal, with the sitemap", () => {
    expect(buildRobots(SITE, { preview: false })).toEqual({
      rules: {
        userAgent: "*",
        allow: "/",
        disallow: ["/studio", "/api/", "/en/portal", "/pt/portal", "/team"],
      },
      sitemap: "https://nortbrand.pt/sitemap.xml",
    });
  });

  it("disallows everything on preview deployments", () => {
    expect(buildRobots(SITE, { preview: true })).toEqual({
      rules: { userAgent: "*", disallow: "/" },
    });
  });
});

describe("organizationJsonLd", () => {
  it("has the schema.org Organization properties", () => {
    const organization = organizationJsonLd({
      siteUrl: SITE,
      description: "A studio",
      config: site,
    });
    expect(organization).toMatchObject({
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": "https://nortbrand.pt/#organization",
      name: "NortBrand",
      url: "https://nortbrand.pt/",
      logo: "https://nortbrand.pt/images/logo-square.png",
      description: "A studio",
      address: { "@type": "PostalAddress", addressCountry: "PT" },
    });
  });

  it("leaves out contact details that are still placeholders", () => {
    const organization = organizationJsonLd({
      siteUrl: SITE,
      description: "A studio",
      config: {
        ...site,
        contact: {
          ...site.contact,
          email: { value: "studio@nortbrand.pt", placeholder: true },
        },
        social: [
          {
            network: "linkedin",
            label: "LinkedIn",
            href: "https://www.linkedin.com/",
            placeholder: true,
          },
        ],
      },
    });
    expect(organization).not.toHaveProperty("email");
    expect(organization).not.toHaveProperty("sameAs");
  });

  it("never lists a telephone (no public phone, #79)", () => {
    expect(
      organizationJsonLd({ siteUrl: SITE, description: "x", config: site }),
    ).not.toHaveProperty("telephone");
  });

  it("includes confirmed contact details", () => {
    const confirmed: SiteConfig = {
      ...site,
      contact: {
        ...site.contact,
        email: { value: "studio@nortbrand.pt", placeholder: false },
      },
      social: [
        {
          network: "instagram",
          label: "Instagram",
          href: "https://www.instagram.com/nortbrand",
          placeholder: false,
        },
      ],
    };
    expect(
      organizationJsonLd({
        siteUrl: SITE,
        description: "x",
        config: confirmed,
      }),
    ).toMatchObject({
      email: "studio@nortbrand.pt",
      sameAs: ["https://www.instagram.com/nortbrand"],
    });
  });
});

describe("servicesJsonLd", () => {
  it("lists each service with its block URL and the organization as provider", () => {
    const graph = servicesJsonLd({
      siteUrl: SITE,
      pageUrl: "https://nortbrand.pt/en/services",
      services: [
        { slug: "web-design", name: "Web Design", description: "Interfaces" },
      ],
    });
    expect(graph).toEqual({
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Service",
          "@id": "https://nortbrand.pt/en/services#web-design",
          name: "Web Design",
          serviceType: "Web Design",
          description: "Interfaces",
          url: "https://nortbrand.pt/en/services#web-design",
          provider: { "@id": "https://nortbrand.pt/#organization" },
        },
      ],
    });
  });
});

describe("serializeJsonLd", () => {
  it("cannot close the script tag early", () => {
    const json = serializeJsonLd({
      name: "</script><script>alert(1)</script>",
    });
    expect(json).not.toContain("</script>");
    expect(JSON.parse(json)).toEqual({
      name: "</script><script>alert(1)</script>",
    });
  });
});

describe("buildSitemap with blog posts", () => {
  const sitemap = buildSitemap(
    SITE,
    ["/"],
    [
      {
        locale: "en",
        path: "/blog/brand-refresh",
        paths: { en: "/blog/brand-refresh", pt: "/blog/renovar-a-marca" },
        lastModified: "2026-10-01T10:00:00Z",
      },
      {
        locale: "en",
        path: "/blog/only-english",
        paths: { en: "/blog/only-english" },
        lastModified: "2026-10-02T10:00:00Z",
      },
    ],
  );

  it("lists each post once, in its own language, with lastModified", () => {
    const post = sitemap.find(
      (entry) => entry.url === "https://nortbrand.pt/en/blog/brand-refresh",
    );
    expect(post?.lastModified).toBe("2026-10-01T10:00:00Z");
    expect(post?.alternates?.languages).toEqual({
      en: "https://nortbrand.pt/en/blog/brand-refresh",
      pt: "https://nortbrand.pt/pt/blog/renovar-a-marca",
      "x-default": "https://nortbrand.pt/pt/blog/renovar-a-marca",
    });
  });

  it("gives an untranslated post no alternate in the other language", () => {
    const post = sitemap.find(
      (entry) => entry.url === "https://nortbrand.pt/en/blog/only-english",
    );
    expect(post?.alternates?.languages).toEqual({
      en: "https://nortbrand.pt/en/blog/only-english",
      "x-default": "https://nortbrand.pt/en/blog/only-english",
    });
  });
});

describe("blogPostingJsonLd", () => {
  const base = {
    siteUrl: SITE,
    url: "https://nortbrand.pt/en/blog/brand-refresh",
    language: "en",
    title: "5 Signs Your Brand Needs a Refresh",
    description: "Some signals are obvious.",
    publishedAt: "2026-09-24T09:00:00Z",
    updatedAt: "2026-10-01T10:00:00Z",
    author: "Ana Ribeiro",
  };

  it("describes the article and points at the Organization as publisher", () => {
    expect(
      blogPostingJsonLd({
        ...base,
        section: "Branding",
        image: "https://cdn/x.jpg",
      }),
    ).toEqual({
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "@id": "https://nortbrand.pt/en/blog/brand-refresh#article",
      headline: "5 Signs Your Brand Needs a Refresh",
      description: "Some signals are obvious.",
      url: base.url,
      mainEntityOfPage: base.url,
      inLanguage: "en",
      datePublished: "2026-09-24T09:00:00Z",
      dateModified: "2026-10-01T10:00:00Z",
      articleSection: "Branding",
      image: "https://cdn/x.jpg",
      author: { "@type": "Person", name: "Ana Ribeiro" },
      publisher: { "@id": "https://nortbrand.pt/#organization" },
    });
  });

  it("leaves out a missing image and section, and cuts long headlines at 110", () => {
    const data = blogPostingJsonLd({ ...base, title: "x".repeat(130) });
    expect(data).not.toHaveProperty("image");
    expect(data).not.toHaveProperty("articleSection");
    expect(data.headline).toHaveLength(110);
  });
});

describe("breadcrumbJsonLd", () => {
  it("numbers the trail from 1, in order", () => {
    expect(
      breadcrumbJsonLd([
        { name: "Blog", url: "https://nortbrand.pt/en/blog" },
        { name: "Post", url: "https://nortbrand.pt/en/blog/post" },
      ]).itemListElement,
    ).toEqual([
      {
        "@type": "ListItem",
        position: 1,
        name: "Blog",
        item: "https://nortbrand.pt/en/blog",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Post",
        item: "https://nortbrand.pt/en/blog/post",
      },
    ]);
  });
});
