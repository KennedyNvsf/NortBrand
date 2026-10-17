import { ChevronUp } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { BookingButton } from "@/components/site/booking-button";
import { TableOfContents } from "@/components/site/table-of-contents";
import { Badge } from "@/components/ui/badge";
import { PostBody } from "@/features/blog/components/post-body";
import type { BlogPost } from "@/features/blog/post";
import { tableOfContents } from "@/features/blog/table-of-contents";
import { Link } from "@/i18n/navigation";
import { ICON_STROKE } from "@/lib/icons";

import { ShareLinks } from "./share-links";

/*
 * Figma 05 Blog › Post › Article (285:35; tablet 372:525, mobile 372:793): the 680 px
 * reading column, and on desktop a 240 px rail that sticks 120 px from the top (Motion
 * Spec) with "On this page", Back to top and Get started.
 * - The table of contents lists the body's h2 headings (table-of-contents.ts); with
 *   none, the rail keeps only Back to top and Get started.
 * - Below desktop there is no rail (Figma): Get started follows Tags and Share.
 * - Tags: posts have one category and no tags (schema), so the category is the tag,
 *   linking to the filtered listing (docs/tech-debt.md).
 * - `id="post-article"` is what ReadingProgress measures.
 */
export async function PostArticle({
  post,
  url,
}: {
  post: BlogPost;
  url: string;
}) {
  const t = await getTranslations("BlogPost");
  const tCommon = await getTranslations("Common");
  const toc = tableOfContents(post.body).map(({ id, text }) => ({
    id,
    label: text,
  }));

  const getStarted = (
    <div className="flex flex-col items-start gap-md border-t border-border-default pt-5.5">
      <p className="text-[16px] font-semibold text-text-primary lg:text-nav">
        {t("getStarted")}
      </p>
      <BookingButton className="w-full md:w-auto">
        {tCommon("bookConsultation")}
      </BookingButton>
    </div>
  );

  return (
    <div className="bg-bg-surface px-(--gutter) pb-14 md:pb-18 lg:pb-22.5">
      <div className="mx-auto flex max-w-284 items-start justify-between gap-2xl pt-8 lg:pt-0">
        <div className="flex w-full max-w-170 min-w-0 flex-col gap-5 md:gap-lg">
          <article id="post-article">
            <PostBody body={post.body} />
          </article>

          <div className="flex flex-col gap-4.5 border-t border-border-default pt-lg md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2.5">
              <p className="text-overline text-text-muted">{t("tags")}</p>
              <Badge asChild>
                {/* 44 px tap area on touch without changing the badge's size. */}
                <Link
                  className="relative after:absolute after:-inset-2.5 after:content-[''] lg:after:hidden"
                  href={{
                    pathname: "/blog",
                    query: { category: post.category.slug },
                  }}
                >
                  {post.category.name ?? post.category.slug}
                </Link>
              </Badge>
            </div>
            <div className="flex items-center gap-2.5">
              <p className="text-overline text-text-muted">{t("share")}</p>
              <ShareLinks
                url={url}
                title={post.title}
                labels={{
                  share: t("shareNative"),
                  email: t("shareEmail"),
                  copy: t("copyLink"),
                  copied: t("linkCopied"),
                  copyFailed: t("copyFailed"),
                }}
              />
            </div>
          </div>

          <div className="lg:hidden">{getStarted}</div>
        </div>

        <aside className="sticky top-30 hidden w-60 shrink-0 flex-col gap-4.5 lg:flex">
          {toc.length ? (
            <TableOfContents items={toc} label={t("onThisPage")} />
          ) : null}
          <a
            href="#main"
            className="inline-flex items-center gap-1.5 self-start rounded-sm pt-3.5 pl-4 text-caption font-medium text-text-muted transition-colors duration-(--duration-fast) ease-standard hover:text-text-primary lg:text-[13px]"
          >
            {t("backToTop")}
            <ChevronUp
              className="size-4.5"
              strokeWidth={ICON_STROKE}
              aria-hidden
            />
          </a>
          {getStarted}
        </aside>
      </div>
    </div>
  );
}
