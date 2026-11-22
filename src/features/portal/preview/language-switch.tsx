"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";

import type { PortalLocale } from "../overview/format";

/*
 * EN/PT for View as client (#160). The language is the path segment after /preview, so
 * switching keeps the section and its URL state (?status=, ?task=) and every link in
 * the screens follows it. A client component only to read the current URL.
 */

const LOCALES = ["en", "pt"] as const;

export function withLocale(
  pathname: string,
  search: string,
  locale: PortalLocale,
): string {
  const swapped = pathname.replace(
    /(\/preview\/)(en|pt)(?=\/|$)/,
    `$1${locale}`,
  );
  return search ? `${swapped}?${search}` : swapped;
}

export function LanguageSwitch({
  current,
  label,
  short,
  names,
}: {
  current: PortalLocale;
  label: string;
  short: Record<PortalLocale, string>;
  names: Record<PortalLocale, string>;
}) {
  const pathname = usePathname();
  const search = useSearchParams().toString();

  return (
    <nav aria-label={label} className="flex items-center gap-1">
      {LOCALES.map((option) => (
        <Link
          key={option}
          href={withLocale(pathname, search, option)}
          aria-current={option === current ? "true" : undefined}
          aria-label={names[option]}
          className={cn(
            "grid min-h-11 min-w-11 place-items-center rounded-sm px-2 font-medium transition-colors duration-(--duration-fast) ease-standard",
            option === current
              ? "bg-text-on-accent text-text-primary"
              : "text-text-on-accent hover:underline",
          )}
        >
          {short[option]}
        </Link>
      ))}
    </nav>
  );
}
