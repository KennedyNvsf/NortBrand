import { cacheLife, cacheTag } from "next/cache";

import type { Locale } from "@/i18n/routing";
import { getSanityClient } from "@/lib/sanity/client";

import { BLOG_TAGS } from "./cache-tags";
import { pageRange, searchPattern, type ListingParams } from "./listing-params";
import {
  BLOG_CATEGORIES_QUERY,
  BLOG_LATEST_QUERY,
  BLOG_OLDEST_QUERY,
  BLOG_POST_QUERY,
  BLOG_RELATED_QUERY,
  BLOG_SLUGS_QUERY,
} from "./queries";

/*
 * Blog data for Server Components. Each function is a cached function ("use cache")
 * tagged for the webhook (cache-tags.ts), so pages stay static until an editor
 * publishes; `cacheLife("max")` means only the webhook expires them. The arguments are
 * the cache key, so each listing state (search, category, sort, page) caches on its own.
 */

export async function getBlogListing(language: Locale, params: ListingParams) {
  "use cache";
  cacheTag(BLOG_TAGS.list);
  cacheLife("max");
  const { start, end } = pageRange(params.page);
  const query =
    params.sort === "oldest" ? BLOG_OLDEST_QUERY : BLOG_LATEST_QUERY;
  return getSanityClient().fetch(query, {
    language,
    q: searchPattern(params.q),
    category: params.category,
    start,
    end,
  });
}

export async function getBlogCategories(language: Locale) {
  "use cache";
  cacheTag(BLOG_TAGS.list);
  cacheLife("max");
  return getSanityClient().fetch(BLOG_CATEGORIES_QUERY, { language });
}

export async function getBlogPost(language: Locale, slug: string) {
  "use cache";
  cacheTag(BLOG_TAGS.posts);
  cacheLife("max");
  return getSanityClient().fetch(BLOG_POST_QUERY, { language, slug });
}

export async function getRelatedPosts(
  language: Locale,
  postId: string,
  categoryId: string,
) {
  "use cache";
  cacheTag(BLOG_TAGS.list);
  cacheLife("max");
  return getSanityClient().fetch(BLOG_RELATED_QUERY, {
    language,
    postId,
    categoryId,
  });
}

export async function getBlogSlugs() {
  "use cache";
  cacheTag(BLOG_TAGS.posts);
  cacheLife("max");
  return getSanityClient().fetch(BLOG_SLUGS_QUERY);
}
