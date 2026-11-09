import type { StaticImageData } from "next/image";

import webDesign from "@/assets/images/service-web-design.jpg";
import webDesignDetail from "@/assets/images/service-web-design-detail.jpg";
import webDevelopment from "@/assets/images/service-web-development.jpg";
import webDevelopmentDetail from "@/assets/images/service-web-development-detail.jpg";
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
    main: { src: webDesign, position: "object-[62%_50%]" },
    detail: { src: webDesignDetail, position: "object-[38%_50%]" },
  },
  "web-development": {
    // The laptop is wider than the panel shows; keep its screen, let the trackpad crop.
    main: { src: webDevelopment, position: "object-[12%_50%]" },
    // Portrait: the square crops top and bottom; keep the JSX block.
    detail: { src: webDevelopmentDetail, position: "object-[50%_45%]" },
  },
};
