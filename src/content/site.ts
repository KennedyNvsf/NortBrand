/**
 * Site configuration. Contact details live ONLY here (CLAUDE.md); never hard-code them in
 * components, emails or messages.
 *
 * Every value carries `placeholder`: `true` marks a stand-in the client has not confirmed
 * yet. `unconfirmedSiteDetails()` lists them. `pnpm check:release` fails while any remain;
 * release builds fail on contact placeholders and warn on social ones (#79, see
 * next.config.ts). Placeholders are also kept out of the JSON-LD
 * (src/lib/seo/structured-data.ts).
 *
 * This file is imported by next.config.ts and scripts/check-release.mts, so it must stay
 * free of path-alias and Next.js imports.
 *
 * Confirmed by the lead on 2026-11-24 (#79): the public email is the studio mailbox
 * (Zoho Mail, docs/guides/environments.md), there is no public phone number, and the
 * office hours are Figma's Mon – Fri, 9:00 – 18:00.
 */

export type SocialNetwork = "instagram" | "linkedin" | "behance" | "dribbble";

type Confirmable<T> = { value: T; placeholder: boolean };

export type SocialLink = {
  network: SocialNetwork;
  label: string;
  href: `https://${string}`;
  placeholder: boolean;
};

export type SiteConfig = {
  name: string;
  /** IANA time zone of the single office; store UTC, show this zone in emails. */
  timeZone: "Europe/Lisbon";
  contact: {
    email: Confirmable<string>;
    /** Office hours in `timeZone`, 24-hour clock ("9:00"). Days are named in messages. */
    hours: Confirmable<{
      opens: `${number}:${number}`;
      closes: `${number}:${number}`;
    }>;
  };
  social: SocialLink[];
};

export const site = {
  name: "NortBrand",
  timeZone: "Europe/Lisbon",
  contact: {
    email: { value: "studio@nortbrand.pt", placeholder: false },
    hours: { value: { opens: "9:00", closes: "18:00" }, placeholder: false },
  },
  // TODO(client): the profile URLs for NortBrand's Instagram and LinkedIn.
  social: [
    {
      network: "instagram",
      label: "Instagram",
      href: "https://www.instagram.com/",
      placeholder: true,
    },
    {
      network: "linkedin",
      label: "LinkedIn",
      href: "https://www.linkedin.com/",
      placeholder: true,
    },
  ],
} as const satisfies SiteConfig;

export type SiteDetailGroup = "contact" | "social";

/**
 * Names of the details still marked `placeholder`, e.g. `contact.email`,
 * `social.instagram`. `groups` narrows the check: release builds fail on `contact` only,
 * `pnpm check:release` on both (next.config.ts).
 */
export function unconfirmedSiteDetails(
  config: SiteConfig = site,
  groups: readonly SiteDetailGroup[] = ["contact", "social"],
): string[] {
  const contact = Object.entries(config.contact)
    .filter(([, field]) => field.placeholder)
    .map(([key]) => `contact.${key}`);
  const social = config.social
    .filter((link) => link.placeholder)
    .map((link) => `social.${link.network}`);
  return [
    ...(groups.includes("contact") ? contact : []),
    ...(groups.includes("social") ? social : []),
  ];
}
