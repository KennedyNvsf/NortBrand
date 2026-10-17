import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { RevealGroup } from "@/components/motion/reveal-group";
import { revealItem } from "@/components/motion/reveal-item";
import { CtaBand } from "@/components/site/cta-band";
import { getFeaturedPost } from "@/features/blog/data";
import { isFiltered, parseListingParams } from "@/features/blog/listing-params";
import { NewsletterCard } from "@/features/newsletter/components/newsletter-card";
import { localizedPageMetadata } from "@/i18n/page-metadata";
import { routing } from "@/i18n/routing";

import { ArticlesSection } from "./_components/articles-section";
import { BlogHero } from "./_components/blog-hero";
import { FeaturedArticle } from "./_components/featured-article";
import { ListingSkeleton } from "./_components/listing-skeleton";

/*
 * Blog listing (Figma 05 Blog › Listing 204:3; tablet 370:260, mobile 370:628):
 * Header · Featured article · Articles · Newsletter · CTA band.
 * - The header, Newsletter card and CTA band are prerendered. The featured article and
 *   the articles depend on ?q=, ?category=, ?sort= and ?page= (brief › Rendering), so
 *   they render per request inside a Suspense boundary, behind the designed skeleton.
 *   Their data is cached and tagged (src/features/blog/data.ts): a request costs no
 *   Sanity call until an editor publishes.
 * - The featured article is the newest post. It shows on page 1 of the unfiltered view;
 *   every unfiltered page leaves it out of the grid, so paging never shifts.
 */

export function generateMetadata(): Promise<Metadata> {
  return localizedPageMetadata("/blog", (t) => ({
    title: t("blogTitle"),
    description: t("blogDescription"),
  }));
}

type SearchParams = PageProps<"/[locale]/blog">["searchParams"];

async function BlogListing({ searchParams }: { searchParams: SearchParams }) {
  const requested = await getLocale();
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;
  const params = parseListingParams(await searchParams);
  const featured = isFiltered(params) ? null : await getFeaturedPost(locale);

  return (
    <>
      {featured && params.page === 1 ? (
        <FeaturedArticle post={featured} locale={locale} />
      ) : null}
      <ArticlesSection
        locale={locale}
        params={params}
        excludeId={featured?._id ?? ""}
      />
    </>
  );
}

export default async function BlogPage({
  searchParams,
}: PageProps<"/[locale]/blog">) {
  const t = await getTranslations("Blog");

  return (
    <main id="main">
      <BlogHero />
      <Suspense fallback={<ListingSkeleton label={t("loading")} />}>
        <BlogListing searchParams={searchParams} />
      </Suspense>
      <section className="bg-bg-surface px-(--gutter) pt-3 pb-14 md:pb-18 lg:pt-5 lg:pb-25">
        <RevealGroup className="mx-auto max-w-[calc(var(--container-canvas)-2*var(--gutter))]">
          <div {...revealItem()}>
            <NewsletterCard />
          </div>
        </RevealGroup>
      </section>
      <CtaBand />
    </main>
  );
}
