import { ChevronLeft, ChevronRight } from "lucide-react";
import { getTranslations } from "next-intl/server";

import {
  listingQuery,
  type ListingParams,
} from "@/features/blog/listing-params";
import { Link } from "@/i18n/navigation";
import { ICON_STROKE } from "@/lib/icons";
import { cn } from "@/lib/utils";

/*
 * Figma 05 Blog › Pagination (263:8): previous, the page numbers, next. Plain links that
 * keep the search, category and sort (listingQuery), so every page has its own URL and
 * works without JavaScript. The current page is aria-current="page"; the ends render the
 * arrow as disabled text, not a link. 36 px circles on desktop, 44 px on touch.
 */
const item =
  "flex size-11 items-center justify-center rounded-full text-small font-semibold transition-colors duration-(--duration-fast) ease-standard lg:size-9";

export async function Pagination({
  params,
  totalPages,
}: {
  params: ListingParams;
  totalPages: number;
}) {
  const t = await getTranslations("Blog");
  if (totalPages <= 1) return null;
  const href = (page: number) => ({
    pathname: "/blog" as const,
    query: listingQuery(params, { page }),
  });
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);
  const arrow = cn(item, "border border-border-default text-text-primary");

  return (
    <nav
      aria-label={t("paginationLabel")}
      className="flex justify-center pt-lg"
    >
      <ul className="flex items-center gap-2.5">
        <li>
          {params.page > 1 ? (
            <Link
              href={href(params.page - 1)}
              aria-label={t("previousPage")}
              className={cn(arrow, "hover:bg-bg-primary")}
            >
              <ChevronLeft
                className="size-6"
                strokeWidth={ICON_STROKE}
                aria-hidden
              />
            </Link>
          ) : (
            <span
              aria-disabled="true"
              className={cn(arrow, "text-text-disabled")}
            >
              <ChevronLeft
                className="size-6"
                strokeWidth={ICON_STROKE}
                aria-hidden
              />
              <span className="sr-only">{t("previousPage")}</span>
            </span>
          )}
        </li>
        {pages.map((page) => (
          <li key={page}>
            <Link
              href={href(page)}
              aria-label={t("page", { page })}
              aria-current={page === params.page ? "page" : undefined}
              className={cn(
                item,
                page === params.page
                  ? "bg-action-primary-fill text-text-on-accent"
                  : "text-text-muted hover:bg-bg-primary hover:text-text-primary",
              )}
            >
              {page}
            </Link>
          </li>
        ))}
        <li>
          {params.page < totalPages ? (
            <Link
              href={href(params.page + 1)}
              aria-label={t("nextPage")}
              className={cn(arrow, "hover:bg-bg-primary")}
            >
              <ChevronRight
                className="size-6"
                strokeWidth={ICON_STROKE}
                aria-hidden
              />
            </Link>
          ) : (
            <span
              aria-disabled="true"
              className={cn(arrow, "text-text-disabled")}
            >
              <ChevronRight
                className="size-6"
                strokeWidth={ICON_STROKE}
                aria-hidden
              />
              <span className="sr-only">{t("nextPage")}</span>
            </span>
          )}
        </li>
      </ul>
    </nav>
  );
}
