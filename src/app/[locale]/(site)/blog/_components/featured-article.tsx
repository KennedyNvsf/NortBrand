import Image from "next/image";
import { ImageIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { RevealGroup } from "@/components/motion/reveal-group";
import { revealItem } from "@/components/motion/reveal-item";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { BlogCard } from "@/features/blog/e2e-backend";
import { formatPostDate } from "@/features/blog/format";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { ICON_STROKE } from "@/lib/icons";
import { sanityImageProps } from "@/lib/sanity/image";

/*
 * Figma 05 Blog › Featured Article (204:24; tablet 370:268, mobile 370:636): the newest
 * post, a 4:3 cover beside its title, excerpt and byline from desktop, stacked below.
 * The cover is decorative here (alt=""), and the button is the one link: its hidden
 * suffix names the post for screen readers ("Read More: <title>"). Shown on the
 * unfiltered listing only; the grid then leaves this post out.
 * - Motion, as Home's FeatureSplit: when it scrolls in, the cover slides in from its
 *   side, then badge, title, excerpt, byline and button rise in 100 ms apart. Already
 *   on screen at load (a tall desktop window), it is simply there.
 */
export async function FeaturedArticle({
  post,
  locale,
}: {
  post: BlogCard;
  locale: Locale;
}) {
  const t = await getTranslations("Blog");
  const cover = sanityImageProps(post.cover, { width: 1280, aspect: 4 / 3 });
  const href = `/blog/${post.slug}`;

  return (
    <section
      aria-label={t("featuredLabel")}
      className="overflow-x-clip bg-bg-surface px-(--gutter) py-lg lg:py-xl"
    >
      <RevealGroup className="mx-auto flex max-w-[calc(var(--container-canvas)-2*var(--gutter))] flex-col gap-xl lg:flex-row lg:items-center lg:justify-center lg:gap-16">
        <div
          {...revealItem("left")}
          className="relative flex aspect-[4/3] w-full shrink-0 items-center justify-center overflow-hidden rounded-lg bg-action-primary-subtle shadow-card lg:w-160"
        >
          {cover ? (
            <Image
              src={cover.src}
              alt=""
              fill
              priority
              sizes="(min-width: 1024px) 640px, 100vw"
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
        <div className="flex flex-col items-start gap-lg lg:w-125 lg:shrink-0">
          {post.category.name ? (
            <div {...revealItem()}>
              <Badge>{post.category.name}</Badge>
            </div>
          ) : null}
          <h2
            {...revealItem()}
            className="text-h2 leading-[1.16] font-bold text-text-primary lg:text-[36px]"
          >
            {post.title}
          </h2>
          <p
            {...revealItem()}
            className="text-body leading-[1.55] text-text-muted"
          >
            {post.excerpt}
          </p>
          <p
            {...revealItem()}
            className="flex items-center gap-2.5 text-small font-medium text-text-muted"
          >
            <span
              aria-hidden
              className="size-8 shrink-0 rounded-full bg-action-primary-subtle"
            />
            {t("byline", {
              author: post.author.name,
              date: formatPostDate(locale, post.publishedAt, "day"),
            })}
          </p>
          <div {...revealItem()} className="w-full md:w-auto">
            <Button asChild showIcon className="w-full md:w-auto">
              <Link href={href}>
                {t("readMore")}
                <span className="sr-only">: {post.title}</span>
              </Link>
            </Button>
          </div>
        </div>
      </RevealGroup>
    </section>
  );
}
