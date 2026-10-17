import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { locale as rootLocale } from "next/root-params";

import { isPreviewDeployment } from "@/lib/seo/deployment";

import { pageMetadata } from "./metadata";
import { routing, type Locale } from "./routing";

/*
 * The one call every page's generateMetadata makes: it resolves the current locale,
 * the Metadata messages and the preview flag, so a page only names its path and which
 * copy to use. `copy` receives the typed translator, so message keys stay checked.
 */

type MetadataTranslator = Awaited<
  ReturnType<typeof getTranslations<"Metadata">>
>;

export async function localizedPageMetadata(
  path: `/${string}`,
  copy: (t: MetadataTranslator) => {
    title: string | { absolute: string };
    description: string;
  },
  paths?: Partial<Record<Locale, `/${string}`>>,
): Promise<Metadata> {
  const requested = await rootLocale();
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;
  const t = await getTranslations("Metadata");

  return pageMetadata({
    locale,
    path,
    ...copy(t),
    siteName: t("siteName"),
    preview: isPreviewDeployment(),
    paths,
  });
}
