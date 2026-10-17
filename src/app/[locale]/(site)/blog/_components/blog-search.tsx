"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState, useTransition } from "react";

import {
  listingQuery,
  type ListingParams,
} from "@/features/blog/listing-params";
import { useRouter } from "@/i18n/navigation";
import { ICON_STROKE } from "@/lib/icons";
import { cn } from "@/lib/utils";

/*
 * Figma 05 Blog › Control Bar › Search (225:20). The search lives in the URL (?q=), so a
 * search can be shared and survives back/forward. Typing updates the URL 250 ms after
 * the last keystroke (brief › Rendering strategy); Enter searches at once. The server
 * renders the results; the count line announces them (aria-live, ArticlesSection).
 * - Without JavaScript (or before hydration) the form is a plain GET of ?q=, so Enter
 *   still searches; it drops the category and sort, which is acceptable for a fallback.
 * - The field follows the URL when it changes from elsewhere (Clear filters, back), but
 *   never overwrites what the visitor is still typing.
 */
const DEBOUNCE_MS = 250;

export function BlogSearch({
  params,
  className,
}: {
  params: ListingParams;
  className?: string;
}) {
  const t = useTranslations("Blog");
  const id = useId();
  const router = useRouter();
  const [value, setValue] = useState(params.q);
  const [, startTransition] = useTransition();
  const pushed = useRef(params.q);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Back/forward or a "Clear filters" link changed ?q= without this field: follow it.
  useEffect(() => {
    if (params.q !== pushed.current) {
      pushed.current = params.q;
      setValue(params.q);
    }
  }, [params.q]);

  useEffect(
    () => () => {
      clearTimeout(timer.current);
    },
    [],
  );

  const search = (q: string) => {
    clearTimeout(timer.current);
    const trimmed = q.trim();
    if (trimmed === pushed.current) return;
    pushed.current = trimmed;
    startTransition(() => {
      router.replace(
        { pathname: "/blog", query: listingQuery(params, { q: trimmed }) },
        { scroll: false },
      );
    });
  };

  return (
    <form
      role="search"
      method="get"
      onSubmit={(event) => {
        event.preventDefault();
        search(value);
      }}
      className={cn("relative flex items-center", className)}
    >
      <label htmlFor={id} className="sr-only">
        {t("searchLabel")}
      </label>
      <Search
        className="pointer-events-none absolute left-3.5 size-4 text-text-muted"
        strokeWidth={ICON_STROKE}
        aria-hidden
      />
      <input
        id={id}
        type="search"
        name="q"
        value={value}
        maxLength={80}
        autoComplete="off"
        placeholder={t("searchPlaceholder")}
        onChange={(event) => {
          const next = event.target.value;
          setValue(next);
          clearTimeout(timer.current);
          timer.current = setTimeout(() => {
            search(next);
          }, DEBOUNCE_MS);
        }}
        className={cn(
          "h-11 w-full rounded-sm border border-border-default bg-bg-surface pr-3.5 pl-9.5 text-small text-text-primary",
          "placeholder:text-text-muted hover:border-border-strong",
          "transition-[border-color,outline-color] duration-(--duration-fast) ease-standard",
          "focus-visible:border-[1.5px] focus-visible:border-action-primary focus-visible:outline-4 focus-visible:outline-offset-[1.5px] focus-visible:outline-action-primary/35",
          "lg:h-9.5",
        )}
      />
    </form>
  );
}
