import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { RevealGroup } from "@/components/motion/reveal-group";
import { revealItem } from "@/components/motion/reveal-item";
import { AlternatePaths } from "@/components/site/alternate-paths";
import { JsonLd } from "@/components/site/json-ld";
import { publicEnv } from "@/env";
import {
  getBlogPost,
  getBlogSlugs,
  getRelatedPosts,
} from "@/features/blog/data";
import {
  postAlternates,
  postPaths,
  readingMinutes,
} from "@/features/blog/post";
import { NewsletterCard } from "@/features/newsletter/components/newsletter-card";
import { redirect } from "@/i18n/navigation";
import { localizedPageMetadata } from "@/i18n/page-metadata";
import { routing, type Locale } from "@/i18n/routing";
import { SHARE_IMAGE_SIZE } from "@/i18n/metadata";
import { sanityImageProps } from "@/lib/sanity/image";
import { blogPostingJsonLd, breadcrumbJsonLd } from "@/lib/seo/structured-data";

import { AuthorCard } from "./_components/author-card";
import { PostArticle } from "./_components/post-article";
import { PostCover, PostHeader } from "./_components/post-header";
import { RelatedPosts } from "./_components/related-posts";

/*
 * A blog post (Figma 05 Blog › Post 285:3; tablet 372:511, mobile 372:777):
 * Header · Cover · Article (with the sticky table of contents on desktop) · Author ·
 * Keep reading · Newsletter. No CTA band and no Sticky CTA (Handoff, CLAUDE.md).
 * - Static: every published slug is prerendered per language, and the data functions
 *   are cached and tagged, so a post changes only when an editor publishes.
 *   `ensureStatic = "navigation"` (as the catch-all 404) renders an unlisted slug fully
 *   on the server on its first request, so a 404 or redirect is real HTML, not a
 *   fallback shell resolved in the browser.
 * - Language switch: the page declares its address in each language (<AlternatePaths>):
 *   the translation, or the other language's listing. A switch clicked before the
 *   page hydrates (or without JavaScript) keeps the slug and lands here with the
 *   other language's slug; that slug is then redirected to its translation or to the
 *   listing, so switching language never ends on a 404.
 * - SEO (#62): hreflang lists only the post's real translations (postAlternates, the
 *   same set the sitemap uses); Open Graph is an `article` with the cover as its share
 *   image; JSON-LD BlogPosting and a BreadcrumbList matching the visible breadcrumb.
 */

export const ensureStatic = "navigation";

/** Prerendered when a language has no posts yet: a listed param that renders the 404. */
const SAMPLE_SLUG = "no-such-post";

export async function generateStaticParams({
  params,
}: {
  params: { locale: string };
}) {
  const slugs = (await getBlogSlugs())
    .filter((entry) => entry.language === params.locale)
    .map(({ slug }) => ({ slug }));
  return slugs.length ? slugs : [{ slug: SAMPLE_SLUG }];
}

type Params = PageProps<"/[locale]/blog/[slug]">["params"];

async function resolveParams(params: Params) {
  const { locale: requested, slug } = await params;
  const locale: Locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;
  return { locale, slug };
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { locale, slug } = await resolveParams(params);
  const post = await getBlogPost(locale, slug);
  if (!post) return {};
  const cover = shareCover(post.cover);
  return localizedPageMetadata(
    `/blog/${slug}`,
    () => ({
      title: post.seo?.title ?? post.title,
      description: post.seo?.description ?? post.excerpt,
    }),
    postAlternates(locale, slug, post.translations),
    {
      ...(cover && { image: cover }),
      article: {
        publishedTime: post.publishedAt,
        modifiedTime: post._updatedAt,
        authors: [post.author.name],
        ...(post.category.name && { section: post.category.name }),
      },
    },
  );
}

/** The cover cropped to the share size (1200 × 630), from the Sanity CDN; null without one. */
function shareCover(cover: Parameters<typeof sanityImageProps>[0]) {
  const image = sanityImageProps(cover, {
    width: SHARE_IMAGE_SIZE.width,
    aspect: SHARE_IMAGE_SIZE.width / SHARE_IMAGE_SIZE.height,
  });
  return image
    ? {
        url: image.src,
        width: image.width,
        height: image.height,
        alt: image.alt,
      }
    : null;
}

/**
 * The address in `locale` of a post published under `slug` in another language, for a
 * language switch that kept the slug. Null when no other language has that slug.
 */
async function switchTarget(locale: Locale, slug: string) {
  const other = (await getBlogSlugs()).find(
    (entry) => entry.slug === slug && entry.language !== locale,
  );
  if (!other || !hasLocale(routing.locales, other.language)) return null;
  const original = await getBlogPost(other.language, slug);
  if (!original) return null;
  return postPaths(other.language, slug, original.translations)[locale];
}

export default async function BlogPostPage({ params }: { params: Params }) {
  const { locale, slug } = await resolveParams(params);
  const post = await getBlogPost(locale, slug);

  if (!post) {
    const target = await switchTarget(locale, slug);
    if (target) redirect({ href: target, locale });
    notFound();
  }

  const [related, tBlog] = await Promise.all([
    getRelatedPosts(locale, post._id, post.category._id),
    getTranslations("Blog"),
  ]);
  const siteUrl = publicEnv.NEXT_PUBLIC_SITE_URL;
  const url = `${siteUrl}/${locale}/blog/${slug}`;
  const categoryName = post.category.name ?? post.category.slug;

  return (
    <main id="main">
      <JsonLd
        data={blogPostingJsonLd({
          siteUrl,
          url,
          language: locale,
          title: post.title,
          description: post.seo?.description ?? post.excerpt,
          publishedAt: post.publishedAt,
          updatedAt: post._updatedAt,
          section: post.category.name,
          image: shareCover(post.cover)?.url,
          author: post.author.name,
        })}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: tBlog("eyebrow"), url: `${siteUrl}/${locale}/blog` },
          {
            name: categoryName,
            url: `${siteUrl}/${locale}/blog?category=${encodeURIComponent(post.category.slug)}`,
          },
          { name: post.title, url },
        ])}
      />
      <AlternatePaths paths={postPaths(locale, slug, post.translations)} />
      <PostHeader
        post={post}
        locale={locale}
        minutes={readingMinutes(post.body)}
      />
      <PostCover cover={post.cover} />
      <PostArticle post={post} url={url} />
      <AuthorCard author={post.author} />
      <RelatedPosts posts={related} locale={locale} />
      <section className="bg-bg-surface px-(--gutter) pt-3 pb-14 md:pb-18 lg:pt-5 lg:pb-25">
        <RevealGroup className="mx-auto max-w-[calc(var(--container-canvas)-2*var(--gutter))]">
          <div {...revealItem()}>
            <NewsletterCard />
          </div>
        </RevealGroup>
      </section>
    </main>
  );
}
