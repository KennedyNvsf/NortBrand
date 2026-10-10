import type { MetadataRoute } from "next";

import { sitePages } from "@/content/site-pages";
import { publicEnv } from "@/env";
import { buildSitemap } from "@/lib/seo/crawl";

/* /sitemap.xml: every indexable page in every locale, with hreflang alternates. */
export default function sitemap(): MetadataRoute.Sitemap {
  return buildSitemap(publicEnv.NEXT_PUBLIC_SITE_URL, sitePages);
}
