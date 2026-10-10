import type { IconName } from "@/lib/icons";

/**
 * The five NortBrand services. `slug` is the stable identifier: it is the anchor on the
 * Services page (/services#web-design), and it will be the `service` value of a
 * consultation request (CLAUDE.md, Data model), so never rename one without a migration.
 * Names and one-line summaries live in messages under `ServiceNames.<key>` and
 * `ServiceSummaries.<key>`; `icon` is the Figma icon (src/lib/icons.ts).
 *
 * The Services page ticket (#10) extends each entry with its page copy.
 */
export const services = [
  { slug: "web-design", key: "webDesign", icon: "layout" },
  { slug: "web-development", key: "webDevelopment", icon: "code" },
  { slug: "content-writing", key: "contentWriting", icon: "pencil" },
  { slug: "social-media-management", key: "socialMedia", icon: "share" },
  { slug: "website-maintenance", key: "maintenance", icon: "gear" },
] as const satisfies readonly {
  slug: string;
  key: string;
  icon: IconName;
}[];

export type ServiceSlug = (typeof services)[number]["slug"];
