import type { MetadataRoute } from "next";

import { publicEnv } from "@/env";
import { buildRobots } from "@/lib/seo/crawl";
import { isPreviewDeployment } from "@/lib/seo/deployment";

/* /robots.txt: production crawls all but /studio and /api; previews crawl nothing. */
export default function robots(): MetadataRoute.Robots {
  return buildRobots(publicEnv.NEXT_PUBLIC_SITE_URL, {
    preview: isPreviewDeployment(),
  });
}
