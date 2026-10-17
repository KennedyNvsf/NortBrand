import { Search } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { revealItem } from "@/components/motion/reveal-item";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  listingQuery,
  type ListingParams,
} from "@/features/blog/listing-params";
import { Link } from "@/i18n/navigation";
import { ICON_STROKE } from "@/lib/icons";

/*
 * Figma 05 Blog › No Results (321:469; tablet 374:683, mobile 374:759): the search icon,
 * "No articles found.", what was searched, Clear filters, and a few topics to try.
 * Its parts are reveal items of the Articles group: on a fresh load below the fold the
 * icon pops in and the rest rises in after it.
 */
export async function NoResults({
  params,
  topics,
}: {
  params: ListingParams;
  topics: { slug: string; name: string | null }[];
}) {
  const t = await getTranslations("Blog");

  return (
    <div className="flex flex-col items-center gap-5.5 pt-14 pb-10 text-center md:pt-17.5 md:pb-15">
      <span
        {...revealItem("pop")}
        className="flex size-21 items-center justify-center rounded-full border border-border-default bg-bg-surface"
      >
        <Search
          className="size-9 text-action-primary"
          strokeWidth={ICON_STROKE}
          aria-hidden
        />
      </span>
      <h3
        {...revealItem()}
        className="text-h2 font-bold tracking-[-0.01em] text-text-primary lg:text-[40px] lg:leading-tight"
      >
        {t("noResultsTitle")}
      </h3>
      <p
        {...revealItem()}
        className="max-w-120 text-body leading-[1.56] text-text-muted md:text-lead"
      >
        {params.q
          ? t("noResultsQuery", { q: params.q })
          : t("noResultsFilters")}
      </p>
      <div {...revealItem()}>
        <Button asChild variant="secondary" showIcon>
          <Link href="/blog" scroll={false}>
            {t("clearFilters")}
          </Link>
        </Button>
      </div>
      {topics.length > 0 ? (
        <div
          {...revealItem()}
          className="flex flex-wrap items-center justify-center gap-2.5 pt-3.5"
        >
          <p className="text-overline text-text-muted">{t("popularTopics")}</p>
          <ul className="flex flex-wrap justify-center gap-2.5">
            {topics.slice(0, 3).map(({ slug, name }) => (
              <li key={slug}>
                <Badge asChild>
                  <Link
                    href={{
                      pathname: "/blog",
                      query: listingQuery(params, { q: "", category: slug }),
                    }}
                    scroll={false}
                    className="min-h-11 px-3 text-small md:min-h-9 lg:min-h-0 lg:px-sm lg:text-caption"
                  >
                    {name ?? slug}
                  </Link>
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
