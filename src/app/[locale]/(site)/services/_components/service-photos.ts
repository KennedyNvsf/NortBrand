import type { StaticImageData } from "next/image";

import contentWriting from "@/assets/images/service-content-writing.jpg";
import contentWritingDetail from "@/assets/images/service-content-writing-detail.jpg";
import socialMedia from "@/assets/images/service-social-media-management.jpg";
import socialMediaDetail from "@/assets/images/service-social-media-management-detail.jpg";
import webDesign from "@/assets/images/service-web-design.jpg";
import webDesignDetail from "@/assets/images/service-web-design-detail.jpg";
import webDevelopment from "@/assets/images/service-web-development.jpg";
import webDevelopmentDetail from "@/assets/images/service-web-development-detail.jpg";
import websiteMaintenance from "@/assets/images/service-website-maintenance.jpg";
import websiteMaintenanceDetail from "@/assets/images/service-website-maintenance-detail.jpg";
import type { ServiceSlug } from "@/content/services";

/** One photo in a service collage, and where to anchor it in its crop. */
export type CollagePhoto = {
  src: StaticImageData;
  /** An object-position class that keeps the subject in the panel's crop. */
  position?: string;
};

export type CollagePhotos = {
  /** The large panel (bottom-left, about 1.1 : 1). */
  main: CollagePhoto;
  /** The small square on its top-right corner. */
  detail: CollagePhoto;
};

/*
 * Service photography for the collages (#82), by slug. Kept beside the Services page,
 * not in src/content/services.ts: that file is also imported by client code (the
 * consultation form, analytics), which would then bundle these image imports.
 * A service without an entry keeps the Figma placeholder (docs/tech-debt.md).
 * Photos: 1600 px wide, metadata stripped (CLAUDE.md, Images).
 */
export const servicePhotos: Partial<Record<ServiceSlug, CollagePhotos>> = {
  "web-design": {
    // Paper wireframes; keep the centre sheet and the hand holding it.
    main: { src: webDesign, position: "object-[65%_50%]" },
    detail: { src: webDesignDetail, position: "object-[38%_50%]" },
  },
  "web-development": {
    // The laptop is wider than the panel shows; keep its screen, let the trackpad crop.
    main: { src: webDevelopment, position: "object-[12%_50%]" },
    // Portrait: the square crops top and bottom; keep the JSX block.
    detail: { src: webDevelopmentDetail, position: "object-[50%_45%]" },
  },
  "content-writing": {
    // 4:3, so only a little is cropped sideways; keep the SEO box and most of the words.
    main: { src: contentWriting, position: "object-[75%_50%]" },
    // Keep the hands on the keyboard.
    detail: { src: contentWritingDetail, position: "object-[75%_50%]" },
  },
  "social-media-management": {
    // Centred tiles on a white ground; the panel's hairline ring keeps its edge.
    main: { src: socialMedia },
    // 16:9 in a square: keep the app icons and most of the folder name.
    detail: { src: socialMediaDetail, position: "object-[60%_50%]" },
  },
  "website-maintenance": {
    // Very wide (1.86 : 1): keep the highlighted function block, not the file tree.
    main: { src: websiteMaintenance, position: "object-[40%_50%]" },
    // Keep the laptop screen and the cup; the typing hand crops at the left.
    detail: { src: websiteMaintenanceDetail, position: "object-[85%_50%]" },
  },
};
