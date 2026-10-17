"use client";

import { useTranslations } from "next-intl";
import { useTransition } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  listingQuery,
  sortOptions,
  type BlogSort as Sort,
  type ListingParams,
} from "@/features/blog/listing-params";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/*
 * Figma 05 Blog › Control Bar › Sort Dropdown (225:36): Latest / Oldest, in the URL as
 * ?sort= (latest is the default and left out). The shared Select gives keyboard and
 * screen-reader support; this only sizes it to the control bar.
 */
const labels = { latest: "sortLatest", oldest: "sortOldest" } as const;

function isSort(value: string): value is Sort {
  return (sortOptions as readonly string[]).includes(value);
}

export function BlogSortSelect({
  params,
  className,
}: {
  params: ListingParams;
  className?: string;
}) {
  const t = useTranslations("Blog");
  const router = useRouter();
  const [, startTransition] = useTransition();

  return (
    <Select
      value={params.sort}
      onValueChange={(value) => {
        if (!isSort(value) || value === params.sort) return;
        startTransition(() => {
          router.push(
            { pathname: "/blog", query: listingQuery(params, { sort: value }) },
            { scroll: false },
          );
        });
      }}
    >
      <SelectTrigger
        aria-label={t("sortLabel")}
        className={cn(
          "h-11 w-auto min-w-26 gap-sm px-3.5 text-label font-medium lg:h-11",
          className,
        )}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {sortOptions.map((sort) => (
          <SelectItem key={sort} value={sort}>
            {t(labels[sort])}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
