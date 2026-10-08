/**
 * The five NortBrand services. `slug` is the stable identifier: it is the anchor on the
 * Services page (/services#web-design), and it will be the `service` value of a
 * consultation request (CLAUDE.md, Data model), so never rename one without a migration.
 * Names live in messages under `ServiceNames.<key>`.
 *
 * The Services page ticket (#10) extends each entry with its icon and page copy.
 */
export const services = [
  { slug: "web-design", key: "webDesign" },
  { slug: "web-development", key: "webDevelopment" },
  { slug: "content-writing", key: "contentWriting" },
  { slug: "social-media-management", key: "socialMedia" },
  { slug: "website-maintenance", key: "maintenance" },
] as const;

export type ServiceSlug = (typeof services)[number]["slug"];
