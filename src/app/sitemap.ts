import type { MetadataRoute } from "next";
import { hasLocale } from "next-intl";

import { sitePages } from "@/content/site-pages";
import { publicEnv } from "@/env";
import { getBlogSlugs } from "@/features/blog/data";
import { postAlternates } from "@/features/blog/post";
import { routing } from "@/i18n/routing";
import { buildSitemap, type SitemapPost } from "@/lib/seo/crawl";

/*
 * /sitemap.xml: every indexable page in every locale, then every published blog post
 * in the languages it exists in (#62), each with hreflang alternates. Posts come from
 * the cached, tagged slugs query, so a publish refreshes the sitemap too.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts: SitemapPost[] = (await getBlogSlugs()).flatMap((post) => {
    const { language, slug, translations, _updatedAt } = post;
    if (!hasLocale(routing.locales, language)) return [];
    return [
      {
        locale: language,
        path: `/blog/${slug}`,
        paths: postAlternates(language, slug, translations),
        lastModified: _updatedAt,
      },
    ];
  });
  return buildSitemap(publicEnv.NEXT_PUBLIC_SITE_URL, sitePages, posts);
}
