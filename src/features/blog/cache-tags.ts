/**
 * Cache tags for blog data (src/features/blog/data.ts) and the documents that change
 * them (the revalidation webhook, src/app/api/revalidate).
 * - `blog-list`: the listing, its categories and related posts.
 * - `blog-posts`: every post page.
 * Any blog document changes both: a post edit can move it in the listing and change
 * its slug (the old page must go too); an author or category shows on cards and
 * posts; a translation link changes the language switcher. With a few dozen posts,
 * refreshing the whole blog is cheaper than tracking which page holds what.
 */
export const BLOG_TAGS = { list: "blog-list", posts: "blog-posts" } as const;

const blogTypes = new Set([
  "post",
  "author",
  "category",
  "translation.metadata",
]);

/** The tags a changed document invalidates; none for types outside the blog. */
export function tagsFor(documentType: string): string[] {
  return blogTypes.has(documentType) ? [BLOG_TAGS.list, BLOG_TAGS.posts] : [];
}
