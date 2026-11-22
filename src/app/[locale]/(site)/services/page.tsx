import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { CtaBand } from "@/components/site/cta-band";
import { JsonLd } from "@/components/site/json-ld";
import { services } from "@/content/services";
import { publicEnv } from "@/env";
import { localeAlternates } from "@/i18n/metadata";
import { CornerPromo } from "@/features/promo/components/corner-promo";
import { localizedPageMetadata } from "@/i18n/page-metadata";
import { servicesJsonLd } from "@/lib/seo/structured-data";

import { ServiceGrid } from "./_components/service-grid";
import { ServicesApproach } from "./_components/services-approach";
import { ServicesHero } from "./_components/services-hero";

/*
 * Services (Figma 04 — Services, 129:2): Photo hero · the services grid (five cards,
 * each opening a details Dialog/Drawer, #124) · Our approach · CTA band. Nav (transparent over the
 * hero), footer and the mobile sticky CTA come from the (site) layout. Static for both
 * locales; the only client code is ServiceDetails and the Tabs/Accordion primitives.
 * Service JSON-LD lists each offering, addressed at its card (#slug).
 */

export function generateMetadata(): Promise<Metadata> {
  return localizedPageMetadata("/services", (t) => ({
    title: t("servicesTitle"),
    description: t("servicesDescription"),
  }));
}

export default async function ServicesPage() {
  const t = await getTranslations("Services.cta");
  const names = await getTranslations("ServiceNames");
  const summaries = await getTranslations("ServiceSummaries");
  const siteUrl = publicEnv.NEXT_PUBLIC_SITE_URL;
  const { canonical } = localeAlternates(await getLocale(), "/services");

  return (
    <main id="main">
      <JsonLd
        data={servicesJsonLd({
          siteUrl,
          pageUrl: new URL(canonical, siteUrl).toString(),
          services: services.map(({ slug, key }) => ({
            slug,
            name: names(key),
            description: summaries(key),
          })),
        })}
      />
      <ServicesHero />
      <ServiceGrid />
      <ServicesApproach />
      <CtaBand headline={t("headline")} subtext={t("subtext")} />
      <CornerPromo placement="services" />
    </main>
  );
}
