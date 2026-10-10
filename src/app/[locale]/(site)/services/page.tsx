import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { locale as rootLocale } from "next/root-params";

import { CtaBand } from "@/components/site/cta-band";
import { localeAlternates } from "@/i18n/metadata";
import { routing, type Locale } from "@/i18n/routing";

import { ServiceBlocks } from "./_components/service-blocks";
import { ServicesApproach } from "./_components/services-approach";
import { ServicesHero } from "./_components/services-hero";

/*
 * Services (Figma 04 — Services, 129:2): Photo hero · five service blocks with a
 * details Dialog/Drawer each · Our approach · CTA band. Nav (transparent over the
 * hero), footer and the mobile sticky CTA come from the (site) layout. Static for both
 * locales; the only client code is ServiceDetails and the Tabs/Accordion primitives.
 */

async function currentLocale(): Promise<Locale> {
  const locale = await rootLocale();
  return routing.locales.find((l) => l === locale) ?? routing.defaultLocale;
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Metadata");
  return {
    title: t("servicesTitle"),
    description: t("servicesDescription"),
    alternates: localeAlternates(await currentLocale(), "/services"),
  };
}

export default async function ServicesPage() {
  const t = await getTranslations("Services.cta");

  return (
    <main id="main">
      <ServicesHero />
      <ServiceBlocks />
      <ServicesApproach />
      <CtaBand headline={t("headline")} subtext={t("subtext")} />
    </main>
  );
}
