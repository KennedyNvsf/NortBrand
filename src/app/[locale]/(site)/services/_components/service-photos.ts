import type { StaticImageData } from "next/image";

import contentWriting from "@/assets/images/service-content-writing.jpg";
import socialMedia from "@/assets/images/service-social-media-management.jpg";
import webDesign from "@/assets/images/service-web-design.jpg";
import webDevelopment from "@/assets/images/service-web-development.jpg";
import websiteMaintenance from "@/assets/images/service-website-maintenance.jpg";
import type { ServiceSlug } from "@/content/services";

/** A service card's photo, and where to anchor it in the card's crop. */
export type ServicePhoto = {
  src: StaticImageData;
  /** An object-position class that keeps the subject in the media's crop. */
  position?: string;
};

/*
 * The photo on each service card (#82, #124), by slug. Kept beside the Services page,
 * not in src/content/services.ts: that file is also imported by client code (the
 * consultation form, analytics), which would then bundle these image imports.
 * Photos: 1600 px wide, metadata stripped (register: docs/guides/images.md).
 * The card media is wide (about 1.6 : 1, up to 3.3 : 1 for the full-width tablet card),
 * so the anchors mostly decide which horizontal band shows.
 */
export const servicePhotos = {
  // Paper wireframes; keep the centre sheet and the hand holding it.
  "web-design": { src: webDesign, position: "object-[65%_50%]" },
  // The laptop is wider than the card shows; keep its screen.
  "web-development": { src: webDevelopment, position: "object-[12%_50%]" },
  // Keep the SEO box and most of the words.
  "content-writing": { src: contentWriting, position: "object-[75%_50%]" },
  // Centred tiles on a light ground.
  "social-media-management": { src: socialMedia },
  // Very wide (1.86 : 1): keep the highlighted function block, not the file tree.
  "website-maintenance": {
    src: websiteMaintenance,
    position: "object-[40%_50%]",
  },
} as const satisfies Record<ServiceSlug, ServicePhoto>;
