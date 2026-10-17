import type { SiteConfig } from "@/content/site";

/*
 * schema.org JSON-LD (brief, "SEO"): Organization on every page, Service on Services,
 * BlogPosting and BreadcrumbList on blog posts (#62).
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

export type BlogPostingJsonLd = Thing & {
  "@context": "https://schema.org";
  "@type": "BlogPosting";
  "@id": string;
  headline: string;
  description: string;
  url: string;
  mainEntityOfPage: string;
  inLanguage: string;
  datePublished: string;
  dateModified: string;
  articleSection?: string;
  image?: string;
  author: { "@type": "Person"; name: string };
  publisher: { "@id": string };
};

/**
 * A post as an article. The publisher is the Organization (by @id); the author is the
 * person named on the post. `image` is the cover's share crop, when the post has one.
 * Search engines limit headlines to 110 characters, so longer titles are cut there.
 */
export function blogPostingJsonLd({
  siteUrl,
  url,
  language,
  title,
  description,
  publishedAt,
  updatedAt,
  section,
  image,
  author,
}: {
  siteUrl: string;
  /** Absolute URL of the post. */
  url: string;
  language: string;
  title: string;
  description: string;
  publishedAt: string;
  updatedAt: string;
  section?: string | null;
  image?: string | null;
  author: string;
}): BlogPostingJsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${url}#article`,
    headline: title.length > 110 ? `${title.slice(0, 109)}…` : title,
    description,
    url,
    mainEntityOfPage: url,
    inLanguage: language,
    datePublished: publishedAt,
    dateModified: updatedAt,
    ...(section && { articleSection: section }),
    ...(image && { image }),
    author: { "@type": "Person", name: author },
    publisher: { "@id": organizationId(siteUrl) },
  };
}

export type BreadcrumbListJsonLd = {
  "@context": "https://schema.org";
  "@type": "BreadcrumbList";
  itemListElement: {
    "@type": "ListItem";
    position: number;
    name: string;
    item: string;
  }[];
};

/** The trail as the page shows it, in order; every item has an absolute URL. */
export function breadcrumbJsonLd(
  trail: { name: string; url: string }[],
): BreadcrumbListJsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map(({ name, url }, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name,
      item: url,
    })),
  };
}

/**
 * JSON for a <script type="application/ld+json">. `<` is escaped so content can never
 * close the script tag early (e.g. a "</script>" inside translated copy).
 */
export function serializeJsonLd(data: object): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
