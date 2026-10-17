import { getTranslations } from "next-intl/server";

import { RevealGroup } from "@/components/motion/reveal-group";
import { revealItem } from "@/components/motion/reveal-item";
import { TextLink } from "@/components/site/text-link";
import { AuthorAvatar } from "@/features/blog/components/author-avatar";
import type { BlogPost } from "@/features/blog/post";

/*
 * Figma 05 Blog › Post › Author (287:22; mobile 372:857): photo, "Written by", name and
 * the author's bio in the page language, with "More articles" back to the listing.
 * Stacked below desktop. The card rises in when it scrolls into view.
 */
export async function AuthorCard({ author }: { author: BlogPost["author"] }) {
  const t = await getTranslations("BlogPost");

  return (
    <section
      aria-label={t("writtenBy")}
      className="bg-bg-surface px-(--gutter) pb-14 md:pb-18 lg:pb-27.5"
    >
      <RevealGroup className="mx-auto max-w-284">
        <div
          {...revealItem()}
          className="flex flex-col items-start gap-3.5 rounded-lg border border-border-default bg-bg-surface p-lg shadow-card md:flex-row md:items-center md:justify-between md:gap-lg lg:px-9 lg:py-8"
        >
          <div className="flex items-start gap-4.5 md:items-center md:gap-lg">
            <AuthorAvatar
              image={author.image}
              size={80}
              className="size-14 md:size-20"
            />
            <div className="flex max-w-155 min-w-0 flex-col gap-1.5">
              <p className="text-overline text-text-muted">{t("writtenBy")}</p>
              <p className="text-[20px] font-bold text-text-primary lg:text-[24px]">
                {author.name}
              </p>
              {author.bio ? (
                <p className="text-[16px] leading-[1.52] text-text-muted lg:text-[15px]">
                  {author.bio}
                </p>
              ) : null}
            </div>
          </div>
          <TextLink href="/blog" className="shrink-0">
            {t("moreArticles")}
          </TextLink>
        </div>
      </RevealGroup>
    </section>
  );
}
