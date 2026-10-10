import type { SiteConfig } from "@/content/site";

/*
 * schema.org JSON-LD (brief, "SEO"): Organization on every page, Service on Services.
 * BlogPosting and BreadcrumbList arrive with the blog.
 * - Details still marked `placeholder` in site.ts (email, phone, social links) are left
 *   out, so search engines never learn stand-in contact data; they appear once the
 *   client confirms them.
 * - Services point at the Organization by @id instead of repeating it.
 */

type Thing = { "@type": string };

export type OrganizationJsonLd = Thing & {
  "@context": "https://schema.org";
  "@type": "Organization";
  "@id": string;
  name: string;
  url: string;
  logo: string;
  description: string;
  address: { "@type": "PostalAddress"; addressCountry: "PT" };
  email?: string;
  telephone?: string;
  sameAs?: string[];
};

export type ServiceJsonLd = Thing & {
  "@type": "Service";
  "@id": string;
  name: string;
  serviceType: string;
  description: string;
  url: string;
  provider: { "@id": string };
};

export type ServiceGraphJsonLd = {
  "@context": "https://schema.org";
  "@graph": ServiceJsonLd[];
};

export function organizationId(siteUrl: string): string {
  return new URL("/#organization", siteUrl).toString();
}

export function organizationJsonLd({
  siteUrl,
  description,
  config,
}: {
  siteUrl: string;
  description: string;
  config: SiteConfig;
}): OrganizationJsonLd {
  const { email, phone } = config.contact;
  const sameAs = config.social
    .filter((link) => !link.placeholder)
    .map((link) => link.href);

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": organizationId(siteUrl),
    name: config.name,
    url: new URL("/", siteUrl).toString(),
    logo: new URL("/icon.svg", siteUrl).toString(),
    description,
    address: { "@type": "PostalAddress", addressCountry: "PT" },
    ...(!email.placeholder && { email: email.value }),
    ...(!phone.placeholder && { telephone: phone.value }),
    ...(sameAs.length > 0 && { sameAs }),
  };
}

/** One Service per offering, each addressable at its block on the Services page. */
export function servicesJsonLd({
  siteUrl,
  pageUrl,
  services,
}: {
  siteUrl: string;
  /** Absolute URL of the localized Services page. */
  pageUrl: string;
  services: { slug: string; name: string; description: string }[];
}): ServiceGraphJsonLd {
  return {
    "@context": "https://schema.org",
    "@graph": services.map(({ slug, name, description }) => {
      const url = `${pageUrl}#${slug}`;
      return {
        "@type": "Service",
        "@id": url,
        name,
        serviceType: name,
        description,
        url,
        provider: { "@id": organizationId(siteUrl) },
      };
    }),
  };
}

/**
 * JSON for a <script type="application/ld+json">. `<` is escaped so content can never
 * close the script tag early (e.g. a "</script>" inside translated copy).
 */
export function serializeJsonLd(data: object): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
