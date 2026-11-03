/**
 * Site configuration. Contact details live ONLY here (CLAUDE.md); never hard-code them in
 * components, emails or messages.
 *
 * TODO(client): every value marked `placeholder: true` is a stand-in until the client
 * provides the real details (Figma 11 Handoff › Open items). `isPlaceholder()` lets the
 * UI or a launch check flag anything still unconfirmed.
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
    /** E.164 format for tel: links. */
    phone: Confirmable<`+${string}`>;
    /** Human-readable phone number. */
    phoneDisplay: Confirmable<string>;
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
    // TODO(client): confirm the public contact email.
    email: { value: "hello@nortbrand.pt", placeholder: true },
    // TODO(client): replace with the real phone number.
    phone: { value: "+351000000000", placeholder: true },
    phoneDisplay: { value: "+351 000 000 000", placeholder: true },
    // TODO(client): confirm office hours (Figma shows Mon – Fri, 9:00 – 18:00).
    hours: { value: { opens: "9:00", closes: "18:00" }, placeholder: true },
  },
  // TODO(client): confirm which networks NortBrand uses and their profile URLs.
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

/** True while any contact detail or social link is still a placeholder. */
export function hasPlaceholders(config: SiteConfig = site): boolean {
  const { email, phone, phoneDisplay, hours } = config.contact;
  return (
    [email, phone, phoneDisplay, hours].some((field) => field.placeholder) ||
    config.social.some((link) => link.placeholder)
  );
}
