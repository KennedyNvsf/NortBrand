import type { Metadata } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { locale as rootLocale } from "next/root-params";

import { JsonLd } from "@/components/site/json-ld";
import { LoadingSplash, splashScript } from "@/components/site/loading-splash";
import { Toaster } from "@/components/ui/sonner";
import { publicEnv } from "@/env";
import { site } from "@/content/site";
import { routing } from "@/i18n/routing";
import { organizationJsonLd } from "@/lib/seo/structured-data";

import { instrumentSans } from "../fonts";
import "../globals.css";

// Required with Cache Components: every root param needs at least one static value.
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Metadata");
  return {
    metadataBase: new URL(publicEnv.NEXT_PUBLIC_SITE_URL),
    title: { default: t("homeTitle"), template: `%s · ${t("siteName")}` },
    description: t("homeDescription"),
  };
}

export default async function LocaleLayout({
  children,
}: LayoutProps<"/[locale]">) {
  // Any first segment reaches this layout (/blog → locale "blog"). It renders in the
  // default locale for an unknown one, and (site)/layout.tsx then calls notFound(),
  // so every 404 goes through the one localized [locale]/not-found.tsx. A notFound()
  // here would bypass it (nothing sits above the root layout).
  const requested = await rootLocale();
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  const t = await getTranslations("Common");
  const metadata = await getTranslations("Metadata");

  return (
    // suppressHydrationWarning: the splash script sets data-splash on <html> before
    // React hydrates (one level only; children are still checked).
    <html
      lang={locale}
      className={instrumentSans.variable}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: splashScript }} />
      </head>
      <body>
        <LoadingSplash label={t("loading")} />
        <a
          href="#main"
          className="sr-only rounded-md bg-bg-surface px-md py-sm text-label text-text-primary shadow-overlay focus-visible:not-sr-only focus-visible:fixed focus-visible:top-md focus-visible:left-md focus-visible:z-50"
        >
          {t("skipToContent")}
        </a>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
        {/* Organization on every page (brief, "SEO"). */}
        <JsonLd
          data={organizationJsonLd({
            siteUrl: publicEnv.NEXT_PUBLIC_SITE_URL,
            description: metadata("homeDescription"),
            config: site,
          })}
        />
        <Toaster />
      </body>
    </html>
  );
}
