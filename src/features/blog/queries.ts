import { defineQuery } from "next-sanity";

/*
 * Every GROQ query the site runs, written with defineQuery so `pnpm sanity:types`
 * generates their result types (src/lib/sanity/sanity.types.ts). Published posts only
 * (the client's perspective); a post needs a slug and a language to be listed.
 *
 * Listing parameters ($q, $category, $start, $end, $excludeId) are parsed and bounded by
 * listing-params.ts before they reach a query; GROQ parameters are never string-built.
 */

/** What a card needs (ArticleCard, the featured article, related posts). */
const CARD = `{
  _id,
  title,
  "slug": slug.current,
  excerpt,
  publishedAt,
  cover { asset, crop, hotspot, alt },
  "category": category->{ "slug": slug.current, "name": coalesce(name[language == $language][0].value, name[0].value) },
  "author": author->{ name, image { asset, crop, hotspot, alt } }
}`;

const LISTED = `_type == "post" && language == $language && defined(slug.current)
  && _id != $excludeId
  && ($category == "" || category->slug.current == $category)
  && ($q == "" || [title, excerpt] match $q)`;

export const BLOG_LATEST_QUERY = defineQuery(`{
  "total": count(*[${LISTED}]),
  "posts": *[${LISTED}] | order(publishedAt desc) [$start...$end] ${CARD}
}`);

export const BLOG_OLDEST_QUERY = defineQuery(`{
  "total": count(*[${LISTED}]),
  "posts": *[${LISTED}] | order(publishedAt asc) [$start...$end] ${CARD}
}`);

/** The newest post in a language: the listing's featured article (Figma 204:24). */
export const BLOG_FEATURED_QUERY =
  defineQuery(`*[_type == "post" && language == $language && defined(slug.current)]
  | order(publishedAt desc) [0] ${CARD}`);

export const BLOG_CATEGORIES_QUERY =
  defineQuery(`*[_type == "category" && defined(slug.current)]
  | order(slug.current asc) {
    "slug": slug.current,
    "name": coalesce(name[language == $language][0].value, name[0].value)
  }`);

/** A post with everything its page shows, plus its translations for the switcher. */
export const BLOG_POST_QUERY =
  defineQuery(`*[_type == "post" && language == $language && slug.current == $slug][0]{
  _id,
  title,
  "slug": slug.current,
  excerpt,
  publishedAt,
  cover { asset, crop, hotspot, alt },
  body[] {
    ...,
    _type == "image" => { asset, crop, hotspot, alt, caption }
  },
  seo,
  "category": category->{ _id, "slug": slug.current, "name": coalesce(name[language == $language][0].value, name[0].value) },
  "author": author->{
    name,
    image { asset, crop, hotspot, alt },
    "role": coalesce(role[language == $language][0].value, role[0].value),
    "bio": coalesce(bio[language == $language][0].value, bio[0].value)
  },
  "translations": *[_type == "translation.metadata" && references(^._id)][0].translations[].value->{
    language,
    "slug": slug.current
  }
}`);

/**
 * "Keep reading": three other posts in the same language, the same category first, then
 * the newest of the rest, so the section is full even when a category is small.
 */
export const BLOG_RELATED_QUERY =
  defineQuery(`*[_type == "post" && language == $language && defined(slug.current)
  && _id != $postId] | order(select(category._ref == $categoryId => 0, 1) asc, publishedAt desc) [0...3] ${CARD}`);

/** Every published post's language and slug, for static generation and the sitemap. */
export const BLOG_SLUGS_QUERY =
  defineQuery(`*[_type == "post" && defined(slug.current) && defined(language)]{
  language,
  "slug": slug.current,
  _updatedAt
}`);
