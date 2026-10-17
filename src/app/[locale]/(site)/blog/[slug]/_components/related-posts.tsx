import { getTranslations } from "next-intl/server";

import { RevealGroup } from "@/components/motion/reveal-group";
import { revealItem } from "@/components/motion/reveal-item";
import { ArticleCard } from "@/components/site/article-card";
import { highlightTags, indentTag } from "@/components/site/highlight";
import type { BlogCard } from "@/features/blog/e2e-backend";
import { formatPostDate } from "@/features/blog/format";
import type { Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { sanityImageProps } from "@/lib/sanity/image";

/*
 * Figma 05 Blog › Post › Related Articles (287:35; tablet 372:567, mobile 372:866):
 * "Keep reading", the indented "More from / the studio" heading, three cards.
 * - Three across on desktop, two on tablet (Figma shows two there), one per row below.
 * - The posts come from BLOG_RELATED_QUERY: the same category first, then the newest
 *   others. With no other posts at all the section is left out.
 * - Motion, as the listing: the eyebrow and heading rise in and "studio" draws its
 *   underline, then the cards, 100 ms apart.
 */
const titleIndent = indentTag("block pl-9 md:pl-14 lg:pl-17.5");

export async function RelatedPosts({
  posts,
  locale,
}: {
  posts: BlogCard[];
  locale: Locale;
}) {
  if (!posts.length) return null;
  const t = await getTranslations("BlogPost");
  const tBlog = await getTranslations("Blog");

  return (
    <section
      aria-labelledby="related-title"
      className="overflow-x-clip bg-bg-surface px-(--gutter) pb-18 lg:pb-27.5"
    >
      <RevealGroup className="mx-auto flex max-w-284 flex-col gap-7 lg:gap-xl">
        <div className="flex flex-col gap-3 lg:gap-lg">
          <p {...revealItem()} className="text-overline text-text-accent">
            {t("keepReading")}
          </p>
          <h2
            {...revealItem()}
            id="related-title"
            className="text-display-section font-bold text-text-primary"
          >
            {t.rich("relatedTitle", { ...highlightTags, ...titleIndent })}
          </h2>
        </div>
        <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 lg:gap-lg">
          {posts.map((post, index) => {
            const cover = sanityImageProps(post.cover, {
              // Figma: 362 × 220 thumbnails, requested at 2×.
              width: 724,
              aspect: 362 / 220,
            });
            return (
              <li
                key={post._id}
                {...revealItem()}
                className={cn("flex", index === 2 && "md:max-lg:hidden")}
              >
                <ArticleCard
                  href={`/blog/${post.slug}`}
                  title={post.title}
                  excerpt={post.excerpt}
                  category={post.category.name ?? post.category.slug}
                  byline={tBlog("byline", {
                    author: post.author.name,
                    date: formatPostDate(locale, post.publishedAt, "month"),
                  })}
                  actionLabel={tBlog("readMore")}
                  image={cover ? { src: cover.src } : undefined}
                />
              </li>
            );
          })}
        </ul>
      </RevealGroup>
    </section>
  );
}
