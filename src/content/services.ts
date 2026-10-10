import type { IconName } from "@/lib/icons";

/**
 * Service slugs: the stable identifiers. Each is the anchor of its block on the
 * Services page (/services#web-design) and the `service` value of a consultation
 * request (CLAUDE.md, Data model). The consultation form validates against this tuple
 * (`z.enum(serviceSlugs)`), so never rename one without a migration.
 */
export const serviceSlugs = [
  "web-design",
  "web-development",
  "content-writing",
  "social-media-management",
  "website-maintenance",
] as const;

export type ServiceSlug = (typeof serviceSlugs)[number];

/**
 * The five NortBrand services, in page order (same order as `serviceSlugs`; a unit test
 * keeps them in step). `key` names the copy in messages:
 * - `ServiceNames.<key>` and `ServiceSummaries.<key>`: shared name and one-liner (Home
 *   cards, footer, Services blocks).
 * - `Services.items.<key>`: the Services page copy: `title` (rich text; the
 *   <greenUnderline> keyword is emphasised in the details dialog), `details` and the three
 *   `included.*` items.
 * `icon` is the Figma icon (src/lib/icons.ts).
 */
export const services = [
  { slug: "web-design", key: "webDesign", icon: "layout" },
  { slug: "web-development", key: "webDevelopment", icon: "code" },
  { slug: "content-writing", key: "contentWriting", icon: "pencil" },
  { slug: "social-media-management", key: "socialMedia", icon: "share" },
  { slug: "website-maintenance", key: "maintenance", icon: "gear" },
] as const satisfies readonly {
  slug: ServiceSlug;
  key: string;
  icon: IconName;
}[];

export type ServiceKey = (typeof services)[number]["key"];

/** Keys of the three "What's included" items under `Services.items.<key>.included`. */
export const includedKeys = ["first", "second", "third"] as const;
