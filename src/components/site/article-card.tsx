import type { ComponentProps } from "react";
import Image, { type StaticImageData } from "next/image";
import { ImageIcon } from "lucide-react";

import { LINK_ROOT, TextLinkContent } from "@/components/site/text-link";
import { Badge } from "@/components/ui/badge";
import { ICON_STROKE } from "@/lib/icons";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/*
 * Figma: 02 Components › Article Card (328:491) and Interaction States (399:166).
 * Unified bordered card · radius/md · shadow/card · neutral Badge + Link.
 * - Hover: lifts 4 px, the shadow deepens and the image zooms to 1.03.
 *   Pressed: scale 0.99 (code rule). Focus: the global 2 px ring with 2 px offset.
 *   Transforms are motion-safe; with reduced motion only the shadow changes.
 * - The whole card is the link. The thumbnail is decorative (alt=""): the title already
 *   names the link, and an alt text would be read twice.
 * - Loading state: <ArticleCardSkeleton /> with the same frame, so the grid never jumps.
 * - No image: the designed placeholder (Figma Blog 248:33), a red/50 panel with an image
 *   icon, so a missing cover never looks broken.
 * - Content (title, excerpt, image, byline) comes from Sanity in the blog ticket; this
 *   component only takes ready-to-render values.
 */

type HeadingLevel = "h2" | "h3" | "h4";

type ArticleCardProps = Omit<
  ComponentProps<typeof Link>,
  "children" | "title"
> & {
  title: string;
  excerpt: string;
  category: string;
  /** Pre-formatted, e.g. "NortBrand · Sep 2026" (formatted with the page locale). */
  byline: string;
  actionLabel: string;
  image?: { src: string | StaticImageData };
  headingLevel?: HeadingLevel;
  /** Set on the first card above the fold only. */
  priority?: boolean;
};

const frameClassName =
  "flex w-full flex-col overflow-hidden rounded-md border border-border-default bg-bg-surface shadow-card";

const THUMBNAIL_SIZES =
  "(min-width: 1024px) 296px, (min-width: 768px) 50vw, 100vw";

function ArticleCard({
  title,
  excerpt,
  category,
  byline,
  actionLabel,
  image,
  headingLevel: Heading = "h3",
  priority = false,
  className,
  ...linkProps
}: ArticleCardProps) {
  return (
    <Link
      data-slot="article-card"
      className={cn(
        LINK_ROOT,
        "group/card",
        frameClassName,
        "transition-[translate,scale,box-shadow] duration-(--duration-base) ease-standard",
        "hover:shadow-card-hover motion-safe:hover:-translate-y-1",
        "motion-safe:active:scale-[0.99] motion-safe:active:duration-(--duration-instant)",
        className,
      )}
      {...linkProps}
    >
      <span
        className={cn(
          "relative flex h-50 w-full items-center justify-center overflow-hidden",
          image ? "bg-bg-primary" : "bg-action-primary-subtle",
        )}
      >
        {image ? (
          <Image
            src={image.src}
            alt=""
            fill
            sizes={THUMBNAIL_SIZES}
            priority={priority}
            className="object-cover transition-transform duration-(--duration-base) ease-standard motion-safe:group-hover/card:scale-[1.03]"
          />
        ) : (
          <ImageIcon
            className="size-6.5 text-action-primary"
            strokeWidth={ICON_STROKE}
            aria-hidden
          />
        )}
      </span>
      <span className="flex flex-col items-start gap-md p-4.5">
        <Badge>{category}</Badge>
        <Heading className="text-body leading-[1.3] font-semibold text-text-primary">
          {title}
        </Heading>
        <span className="line-clamp-3 text-caption text-text-muted">
          {excerpt}
        </span>
        <span className="flex items-center gap-sm text-caption text-text-muted">
          <span
            className="size-5.5 shrink-0 rounded-full bg-action-primary-subtle"
            aria-hidden
          />
          {byline}
        </span>
        <TextLinkContent>{actionLabel}</TextLinkContent>
      </span>
    </Link>
  );
}

/** Loading placeholder with the same frame as ArticleCard. Hidden from assistive tech:
 *  the list announces its own busy state. */
function ArticleCardSkeleton({ className }: { className?: string }) {
  const bar = "rounded-sm bg-border-default motion-safe:animate-pulse";
  return (
    <div
      data-slot="article-card-skeleton"
      className={cn(frameClassName, className)}
      aria-hidden
    >
      <div className="h-50 w-full bg-bg-primary motion-safe:animate-pulse" />
      <div className="flex flex-col gap-md p-4.5">
        <div className={cn(bar, "h-5.75 w-16")} />
        <div className={cn(bar, "h-5 w-11/12")} />
        <div className={cn(bar, "h-4 w-full")} />
        <div className={cn(bar, "h-4 w-2/3")} />
        <div className={cn(bar, "h-5.5 w-36")} />
        <div className={cn(bar, "h-6 w-24")} />
      </div>
    </div>
  );
}

export { ArticleCard, ArticleCardSkeleton, type ArticleCardProps };
