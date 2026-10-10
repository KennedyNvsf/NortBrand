import { describe, expect, it } from "vitest";

import { site, type SiteConfig } from "@/content/site";
import { sitePages } from "@/content/site-pages";

import { buildRobots, buildSitemap } from "./crawl";
import { isPreviewDeployment } from "./deployment";
import {
  organizationJsonLd,
  serializeJsonLd,
  servicesJsonLd,
} from "./structured-data";

const SITE = "https://nortbrand.com";

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
        "https://nortbrand.com/en",
        "https://nortbrand.com/pt",
        "https://nortbrand.com/en/services",
        "https://nortbrand.com/pt/legal/terms",
      ]),
    );
  });

  it("gives every entry absolute hreflang alternates, including x-default", () => {
    const services = sitemap.find(
      (entry) => entry.url === "https://nortbrand.com/en/services",
    );
    expect(services?.alternates?.languages).toEqual({
      en: "https://nortbrand.com/en/services",
      pt: "https://nortbrand.com/pt/services",
      "x-default": "https://nortbrand.com/pt/services",
    });
  });

  it("leaves out the 404 and unbuilt pages", () => {
    const urls = sitemap.map((entry) => entry.url).join(" ");
    expect(urls).not.toContain("/blog");
    expect(urls).not.toContain("/studio");
  });
});

describe("buildRobots", () => {
  it("allows crawling in production except the Studio and API, with the sitemap", () => {
    expect(buildRobots(SITE, { preview: false })).toEqual({
      rules: { userAgent: "*", allow: "/", disallow: ["/studio", "/api/"] },
      sitemap: "https://nortbrand.com/sitemap.xml",
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
      "@id": "https://nortbrand.com/#organization",
      name: "NortBrand",
      url: "https://nortbrand.com/",
      logo: "https://nortbrand.com/icon.svg",
      description: "A studio",
      address: { "@type": "PostalAddress", addressCountry: "PT" },
    });
  });

  it("leaves out contact details that are still placeholders", () => {
    const organization = organizationJsonLd({
      siteUrl: SITE,
      description: "A studio",
      config: site,
    });
    expect(organization).not.toHaveProperty("email");
    expect(organization).not.toHaveProperty("telephone");
    expect(organization).not.toHaveProperty("sameAs");
  });

  it("includes confirmed contact details", () => {
    const confirmed: SiteConfig = {
      ...site,
      contact: {
        ...site.contact,
        email: { value: "studio@nortbrand.com", placeholder: false },
        phone: { value: "+351210000000", placeholder: false },
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
      email: "studio@nortbrand.com",
      telephone: "+351210000000",
      sameAs: ["https://www.instagram.com/nortbrand"],
    });
  });
});

describe("servicesJsonLd", () => {
  it("lists each service with its block URL and the organization as provider", () => {
    const graph = servicesJsonLd({
      siteUrl: SITE,
      pageUrl: "https://nortbrand.com/en/services",
      services: [
        { slug: "web-design", name: "Web Design", description: "Interfaces" },
      ],
    });
    expect(graph).toEqual({
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Service",
          "@id": "https://nortbrand.com/en/services#web-design",
          name: "Web Design",
          serviceType: "Web Design",
          description: "Interfaces",
          url: "https://nortbrand.com/en/services#web-design",
          provider: { "@id": "https://nortbrand.com/#organization" },
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
