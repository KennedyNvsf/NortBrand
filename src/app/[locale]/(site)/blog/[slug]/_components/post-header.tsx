import Image from "next/image";
import { ChevronRight, ImageIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { enterItem } from "@/components/motion/reveal-item";
import { AuthorAvatar } from "@/features/blog/components/author-avatar";
import { formatPostDate } from "@/features/blog/format";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { ICON_STROKE } from "@/lib/icons";
import type { BlogPost } from "@/features/blog/post";
import { sanityImageProps, type SanityImage } from "@/lib/sanity/image";

/*
 * Figma 05 Blog › Post › Post Header + Cover (285:19, 285:33; tablet 372:513, mobile
 * 372:779): breadcrumb (Blog › category), the page's one H1, the byline, then the cover.
 * - The breadcrumb's category links to the listing filtered by it.
 * - Hero entrance (CSS, as on every page): breadcrumb, title, byline and cover enter
 *   110 ms apart.
 * - The title is the editor's plain text: Figma's green "Product" is a design example;
 *   a CMS title has no way to mark a word (see docs/tech-debt.md).
 * - The cover carries meaning here, so it uses the editor's alt text (required in
 *   Studio). Without an image, the designed red/50 placeholder.
 */
export async function PostHeader({
  post,
  locale,
  minutes,
}: {
  post: BlogPost;
  locale: Locale;
  minutes: number;
}) {
  const t = await getTranslations("BlogPost");
  const tBlog = await getTranslations("Blog");

  return (
    <header className="bg-bg-surface px-(--gutter) pt-8 pb-7 md:pt-12 md:pb-10 lg:py-14">
      <div className="mx-auto flex max-w-284 flex-col items-start gap-5 md:gap-lg lg:gap-xl">
        <nav {...enterItem(0)} aria-label={t("breadcrumbLabel")}>
          <ol className="flex items-center gap-2 text-label">
            <li>
              <Link
                href="/blog"
                className="inline-flex min-h-11 items-center rounded-sm text-text-muted transition-colors duration-(--duration-fast) ease-standard hover:text-text-primary lg:min-h-0"
              >
                {tBlog("eyebrow")}
              </Link>
            </li>
            <li aria-hidden className="text-text-muted">
              <ChevronRight className="size-6" strokeWidth={ICON_STROKE} />
            </li>
            <li>
              <Link
                href={{
                  pathname: "/blog",
                  query: { category: post.category.slug },
                }}
                className="inline-flex min-h-11 items-center rounded-sm font-semibold text-text-accent underline-offset-4 hover:underline lg:min-h-0"
              >
                {post.category.name ?? post.category.slug}
              </Link>
            </li>
          </ol>
        </nav>
        <h1
          {...enterItem(1)}
          className="max-w-284 text-[36px] leading-[1.06] font-bold tracking-[-0.015em] text-balance text-text-primary md:text-[48px] lg:text-[60px]"
        >
          {post.title}
        </h1>
        <div {...enterItem(2)} className="flex items-center gap-3">
          <AuthorAvatar
            image={post.author.image}
            size={44}
            className="size-11"
          />
          <p className="flex flex-col gap-0.5">
            <span className="text-[16px] font-semibold text-text-primary lg:text-[15px]">
              {post.author.name}
            </span>
            <span className="text-small text-text-muted">
              <time dateTime={post.publishedAt}>
                {formatPostDate(locale, post.publishedAt, "day")}
              </time>
              <span aria-hidden className="px-2">
                ·
              </span>
              {t("readTime", { minutes })}
            </span>
          </p>
        </div>
      </div>
    </header>
  );
}

export function PostCover({ cover }: { cover: SanityImage }) {
  const image = sanityImageProps(cover, { width: 2272, aspect: 1136 / 520 });
  return (
    <div className="bg-bg-surface px-(--gutter) pb-10 lg:pb-17.5">
      <div
        {...enterItem(3)}
        className="relative mx-auto flex h-55 max-w-284 items-center justify-center overflow-hidden rounded-sm bg-action-primary-subtle shadow-card md:h-110 lg:h-130"
      >
        {image ? (
          <Image
            src={image.src}
            alt={image.alt}
            fill
            priority
            sizes="(min-width: 1184px) 1136px, 100vw"
            className="object-cover"
          />
        ) : (
          <ImageIcon
            className="size-10 text-action-primary"
            strokeWidth={ICON_STROKE}
            aria-hidden
          />
        )}
      </div>
    </div>
  );
}
