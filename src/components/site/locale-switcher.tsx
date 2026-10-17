"use client";

import { Fragment } from "react";
import { useLocale, useTranslations } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation";

import { useAlternatePaths } from "./alternate-paths";
import { localeNames, routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";

/*
 * EN · PT switcher. Not designed in Figma; placement approved by the developer: desktop
 * nav and the tablet/mobile menu.
 * - Each option is a link to the same page in that locale. next-intl's Link with
 *   `locale` also writes the NEXT_LOCALE cookie, so the choice wins at `/` next time.
 * - Visible text is the code ("EN"); the accessible name adds the language name in that
 *   language ("EN – English", "PT – Português"), which keeps the visible label inside
 *   the name (WCAG 2.5.3) and is announced with the right pronunciation via `lang`.
 * - The current locale is bold and marked aria-current, so it is not colour alone.
 * - A page whose address differs per language (a blog post) declares its versions
 *   with <AlternatePaths>; the switcher then links to those (alternate-paths.tsx).
 */
export function LocaleSwitcher({
  className,
  onNavigate,
}: {
  className?: string;
  onNavigate?: () => void;
}) {
  const t = useTranslations("LocaleSwitcher");
  const locale = useLocale();
  const pathname = usePathname();
  const alternates = useAlternatePaths();

  return (
    <div
      role="group"
      aria-label={t("label")}
      className={cn("flex items-center gap-xs text-nav", className)}
    >
      {routing.locales.map((option, index) => {
        const current = option === locale;
        return (
          <Fragment key={option}>
            {index > 0 ? (
              <span
                aria-hidden
                className="text-text-muted group-data-[tone=overlay]/header:text-text-on-accent"
              >
                ·
              </span>
            ) : null}
            <Link
              href={alternates?.[option] ?? pathname}
              locale={option}
              lang={option}
              hrefLang={option}
              aria-current={current ? "true" : undefined}
              onClick={onNavigate}
              className={cn(
                "inline-flex min-h-11 min-w-8 items-center justify-center rounded-sm",
                "transition-colors duration-(--duration-fast) ease-standard",
                current
                  ? "font-semibold text-text-primary"
                  : "text-text-muted hover:text-text-accent",
                "group-data-[tone=overlay]/header:text-text-on-accent",
              )}
            >
              {option.toUpperCase()}
              <span className="sr-only"> – {localeNames[option]}</span>
            </Link>
          </Fragment>
        );
      })}
    </div>
  );
}
