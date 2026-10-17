import type { Locale } from "@/i18n/routing";
import type {
  BLOG_CATEGORIES_QUERY_RESULT,
  BLOG_LATEST_QUERY_RESULT,
  BLOG_POST_QUERY_RESULT,
  BLOG_RELATED_QUERY_RESULT,
  BLOG_SLUGS_QUERY_RESULT,
} from "@/lib/sanity/sanity.types";

import { pageRange, type ListingParams } from "./listing-params";
import type { BlogPost } from "./post";

/*
 * Blog fixtures for Playwright (#60), used only when `isFakeBackendEnabled()`
 * (src/lib/e2e-backend.ts): CI has no Sanity project, and e2e must not depend on content
 * an editor can change. The filter, search, sort and paging rules mirror the GROQ in
 * queries.ts, so the listing behaves the same with fixtures and with Sanity.
 *
 * 10 English posts (page 2 exists), 3 Portuguese, no covers (the card's placeholder).
 * The first three are translations of each other; the other English posts exist in
 * English only, so the post page's language switcher has both cases to handle (#61).
 * Every post has the same body (fakeBody), shaped like the Figma article.
 */

export type BlogCard = BLOG_LATEST_QUERY_RESULT["posts"][number];

const categoryNames: Record<string, Record<Locale, string>> = {
  design: { en: "Web Design", pt: "Web Design" },
  branding: { en: "Branding", pt: "Marca" },
  content: { en: "Content", pt: "Conteúdo" },
};

const titles: [string, string, string][] = [
  [
    "Why Your Website Should Work Like a Product, Not a Brochure",
    "design",
    "2026-09-29",
  ],
  ["5 Signs Your Brand Needs a Refresh", "branding", "2026-09-24"],
  ["How to Choose Colors That Actually Convert", "design", "2026-09-18"],
  ["The Real Cost of a Slow Website", "design", "2026-09-12"],
  ["Content That Converts for Local Businesses", "content", "2026-09-05"],
  ["Why Consistency Beats Perfection in Social Media", "content", "2026-08-28"],
  [
    "What Happens After Launch? A Guide to Website Maintenance",
    "design",
    "2026-08-20",
  ],
  ["The Anatomy of a High-Converting Landing Page", "design", "2026-08-12"],
  ["SEO Basics Every Local Business Should Know", "content", "2026-08-04"],
  ["Brand Voice for Small Teams", "branding", "2026-07-27"],
];

function card(
  language: Locale,
  index: number,
  [title, category, date]: [string, string, string],
): BlogCard {
  return {
    _id: `e2e-${language}-${index + 1}`,
    title,
    slug: title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, ""),
    excerpt: `Test excerpt for “${title}”.`,
    publishedAt: `${date}T09:00:00.000Z`,
    cover: { asset: null, crop: null, hotspot: null, alt: "" },
    category: {
      slug: category,
      name: categoryNames[category]?.[language] ?? category,
    },
    author: { name: "NortBrand Team", image: null },
  };
}

const posts: Record<Locale, BlogCard[]> = {
  en: titles.map((entry, index) => card("en", index, entry)),
  pt: titles
    .slice(0, 3)
    .map((entry, index) =>
      card("pt", index, [`[PT] ${entry[0]}`, entry[1], entry[2]]),
    ),
};

/** GROQ's `[title, excerpt] match ["bra*", …]`: every word prefixes a word in either. */
function matches(post: BlogCard, q: string): boolean {
  const words = q
    .replace(/\*/g, " ")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  const haystack = `${post.title} ${post.excerpt}`
    .toLowerCase()
    .split(/[^a-z0-9]+/);
  return words.every((word) =>
    haystack.some((token) => token.startsWith(word)),
  );
}

export function fakeFeatured(language: Locale): BlogCard | null {
  return posts[language][0] ?? null;
}

export function fakeListing(
  language: Locale,
  params: ListingParams,
  excludeId: string,
): BLOG_LATEST_QUERY_RESULT {
  const listed = posts[language]
    .filter((post) => post._id !== excludeId)
    .filter(
      (post) => !params.category || post.category.slug === params.category,
    )
    .filter((post) => !params.q || matches(post, params.q))
    .sort((a, b) =>
      params.sort === "oldest"
        ? a.publishedAt.localeCompare(b.publishedAt)
        : b.publishedAt.localeCompare(a.publishedAt),
    );
  const { start, end } = pageRange(params.page);
  return { total: listed.length, posts: listed.slice(start, end) };
}

export function fakeCategories(language: Locale): BLOG_CATEGORIES_QUERY_RESULT {
  return Object.entries(categoryNames).map(([slug, names]) => ({
    slug,
    name: names[language],
  }));
}

type BodyBlock = Extract<BlogPost["body"][number], { _type: "block" }>;

let keyCount = 0;
function block(
  text: string,
  options: Pick<BodyBlock, "style" | "listItem"> & { strong?: string } = {},
): BodyBlock {
  const key = `k${String(++keyCount)}`;
  const { strong, ...rest } = options;
  const [before = text, after = ""] = strong ? text.split(strong) : [text];
  const children: BodyBlock["children"] = strong
    ? [
        { _type: "span", _key: `${key}a`, text: before, marks: [] },
        { _type: "span", _key: `${key}b`, text: strong, marks: ["strong"] },
        { _type: "span", _key: `${key}c`, text: after, marks: [] },
      ]
    : [{ _type: "span", _key: `${key}a`, text, marks: [] }];
  return {
    _type: "block",
    _key: key,
    style: "normal",
    markDefs: [],
    ...(rest.listItem && { level: 1 }),
    ...rest,
    children,
  };
}

const filler =
  "Most small business websites start the same way: a logo, a few photos, a paragraph about the company and a phone number at the bottom. It looks fine. It also asks nothing of the visitor, and gives them nothing to do.";

function fakeBody(prefix: string): BlogPost["body"] {
  const p = (text: string) => `${prefix}${text}`;
  return [
    block(
      p(
        "A website that only describes your business is a brochure. A website that helps people do something is a product.",
      ),
    ),
    block(p("A brochure tells. A product helps."), { style: "h2" }),
    block(p(filler)),
    block(p(filler)),
    block(p("People don't read websites. They use them."), {
      style: "blockquote",
      strong: "use them",
    }),
    block(p("Three questions every page should answer"), { style: "h2" }),
    block(p(filler)),
    block(p("What is this, and is it for me?"), { listItem: "bullet" }),
    block(p("Why should I trust it?"), { listItem: "bullet" }),
    block(p("What do I do next?"), { listItem: "bullet" }),
    block(p("Start with the action"), { style: "h2" }),
    block(p(filler)),
    block(p(filler)),
    block(p("Where to begin"), { style: "h2" }),
    block(p(filler)),
    block(p(filler)),
  ];
}

/** The same post in the other language: the first three posts are translated. */
function translationsOf(language: Locale, index: number) {
  if (index >= posts.pt.length) return null;
  return [
    { language: "en", slug: posts.en[index]?.slug ?? "" },
    { language: "pt", slug: posts.pt[index]?.slug ?? "" },
  ].filter((entry) => entry.language === language || entry.slug);
}

export function fakePost(
  language: Locale,
  slug: string,
): BLOG_POST_QUERY_RESULT {
  const index = posts[language].findIndex((post) => post.slug === slug);
  const post = posts[language][index];
  if (!post) return null;
  return {
    ...post,
    body: fakeBody(language === "pt" ? "[PT] " : ""),
    seo: null,
    category: { _id: `e2e-category-${post.category.slug}`, ...post.category },
    author: {
      ...post.author,
      role: null,
      bio: "Designers, developers and writers helping local and service-based businesses show up online with clarity.",
    },
    translations: translationsOf(language, index),
  };
}

/** BLOG_RELATED_QUERY: the same category first, then the newest of the rest. */
export function fakeRelated(
  language: Locale,
  postId: string,
  categoryId: string,
): BLOG_RELATED_QUERY_RESULT {
  const inCategory = (post: BlogCard) =>
    `e2e-category-${post.category.slug}` === categoryId ? 0 : 1;
  return posts[language]
    .filter((post) => post._id !== postId)
    .sort(
      (a, b) =>
        inCategory(a) - inCategory(b) ||
        b.publishedAt.localeCompare(a.publishedAt),
    )
    .slice(0, 3);
}

export function fakeSlugs(): BLOG_SLUGS_QUERY_RESULT {
  return (["en", "pt"] as const).flatMap((language) =>
    posts[language].map((post) => ({
      language,
      slug: post.slug,
      _updatedAt: post.publishedAt,
    })),
  );
}
