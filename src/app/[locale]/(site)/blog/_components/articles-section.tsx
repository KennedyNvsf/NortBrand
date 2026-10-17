import { getTranslations } from "next-intl/server";

import { RevealGroup } from "@/components/motion/reveal-group";
import { revealItem } from "@/components/motion/reveal-item";
import { ArticleCard } from "@/components/site/article-card";
import { highlightTags, indentTag } from "@/components/site/highlight";
import { getBlogCategories, getBlogListing } from "@/features/blog/data";
import { formatPostDate } from "@/features/blog/format";
import { PAGE_SIZE, type ListingParams } from "@/features/blog/listing-params";
import type { Locale } from "@/i18n/routing";
import { sanityImageProps } from "@/lib/sanity/image";

import { BlogSearch } from "./blog-search";
import { BlogSortSelect } from "./blog-sort";
import { CategoryChips } from "./category-chips";
import { NoResults } from "./no-results";
import { Pagination } from "./pagination";
import { SearchAnalytics } from "./search-analytics";

/*
 * Figma 05 Blog › Articles Grid (225:14; tablet 370:278, mobile 370:646): the section
 * heading, the control bar, eight cards per page at every breakpoint (CLAUDE.md), the
 * pagination, or the designed No Results state.
 * - Control bar: one row on desktop (search, chips … sort); search and sort, then the
 *   chips on tablet; search, chips, then "Showing x of y" and sort on mobile.
 * - The count line is a polite live region on every breakpoint (visible on mobile, as
 *   designed): screen readers hear the new result count after a search or filter.
 * - Motion, as on Home: on scroll the eyebrow and heading rise in and "newest" draws
 *   its underline, then the control bar, then the cards, 100 ms apart in reading order
 *   (row by row). The group stays mounted while the visitor filters or pages, so new
 *   results appear at once instead of replaying the entrance.
 */
const titleIndent = indentTag("block pl-9 md:pl-14 lg:pl-17.5");

export async function ArticlesSection({
  locale,
  params,
  excludeId,
}: {
  locale: Locale;
  params: ListingParams;
  excludeId: string;
}) {
  const t = await getTranslations("Blog");
  const [listing, categories] = await Promise.all([
    getBlogListing(locale, params, excludeId),
    getBlogCategories(locale),
  ]);
  const totalPages = Math.max(1, Math.ceil(listing.total / PAGE_SIZE));

  return (
    <section
      aria-labelledby="blog-articles-title"
      className="bg-bg-surface px-(--gutter) pt-18 pb-18 md:pt-20 md:pb-22 lg:pt-22.5 lg:pb-25"
    >
      <RevealGroup className="mx-auto flex max-w-[calc(var(--container-canvas)-2*var(--gutter))] flex-col gap-xl">
        <div className="flex flex-col gap-md lg:gap-lg">
          <p {...revealItem()} className="text-overline text-text-accent">
            {t("articlesEyebrow")}
          </p>
          <h2
            {...revealItem()}
            id="blog-articles-title"
            className="text-display-section font-bold text-text-primary"
          >
            {t.rich("articlesTitle", { ...highlightTags, ...titleIndent })}
          </h2>
        </div>

        <div
          {...revealItem()}
          className="grid grid-cols-[1fr_auto] items-center gap-md border-b border-border-default pt-sm pb-lg lg:grid-cols-[auto_1fr_auto] lg:gap-lg"
        >
          <BlogSearch
            params={params}
            className="col-span-2 md:col-span-1 lg:w-57.5"
          />
          <CategoryChips
            params={params}
            categories={categories}
            allLabel={t("all")}
            label={t("categoriesLabel")}
            className="col-span-2 row-start-2 min-w-0 lg:col-span-1 lg:col-start-2 lg:row-start-1"
          />
          <p
            aria-live="polite"
            className="row-start-3 text-small text-text-muted md:sr-only"
          >
            {t("showing", {
              shown: listing.posts.length,
              total: listing.total,
            })}
          </p>
          <BlogSortSelect
            params={params}
            className="col-start-2 row-start-3 justify-self-end md:row-start-1 lg:col-start-3"
          />
        </div>

        {listing.posts.length === 0 ? (
          <NoResults params={params} topics={categories} />
        ) : (
          <>
            <ul className="grid gap-lg md:grid-cols-2 lg:grid-cols-4">
              {listing.posts.map((post, index) => {
                const cover = sanityImageProps(post.cover, {
                  width: 640,
                  aspect: 296 / 200,
                });
                return (
                  <li key={post._id} {...revealItem()} className="flex">
                    <ArticleCard
                      href={`/blog/${post.slug}`}
                      title={post.title}
                      excerpt={post.excerpt}
                      category={post.category.name ?? post.category.slug}
                      byline={t("byline", {
                        author: post.author.name,
                        date: formatPostDate(locale, post.publishedAt, "month"),
                      })}
                      actionLabel={t("readMore")}
                      image={cover ? { src: cover.src } : undefined}
                      priority={index === 0}
                    />
                  </li>
                );
              })}
            </ul>
            <Pagination params={params} totalPages={totalPages} />
          </>
        )}
      </RevealGroup>
      <SearchAnalytics q={params.q} results={listing.total} />
    </section>
  );
}
