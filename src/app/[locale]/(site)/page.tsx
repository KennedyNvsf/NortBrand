import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { locale as rootLocale } from "next/root-params";

import { CtaBand } from "@/components/site/cta-band";
import { FeatureSplit } from "@/components/site/feature-split";
import { highlightTags } from "@/components/site/highlight";
import { localeAlternates } from "@/i18n/metadata";
import { routing, type Locale } from "@/i18n/routing";

import { HomeHero } from "./_components/home-hero";
import { HomeProcess } from "./_components/home-process";
import { HomeServices } from "./_components/home-services";

/*
 * Home (Figma 03 — Home, 49:2): Hero · Why it matters · What we do · Our philosophy ·
 * How it works · CTA band. Nav, footer and the mobile sticky CTA come from the (site)
 * layout. Static for both locales.
 */

async function currentLocale(): Promise<Locale> {
  const locale = await rootLocale();
  return routing.locales.find((l) => l === locale) ?? routing.defaultLocale;
}

export async function generateMetadata(): Promise<Metadata> {
  return { alternates: localeAlternates(await currentLocale(), "/") };
}

export default async function HomePage() {
  const t = await getTranslations("Home");

  return (
    <main id="main">
      <HomeHero />
      <FeatureSplit
        id="home-why-title"
        eyebrow={t("why.eyebrow")}
        title={t.rich("why.title", highlightTags)}
        body={t("why.body")}
        points={[
          t("why.points.first"),
          t("why.points.second"),
          t("why.points.third"),
        ]}
        panel="start"
        align="end"
        panelClassName="lg:h-150 lg:w-130"
      />
      <HomeServices />
      <FeatureSplit
        id="home-philosophy-title"
        eyebrow={t("philosophy.eyebrow")}
        title={t.rich("philosophy.title", highlightTags)}
        body={t("philosophy.body")}
        points={[
          t("philosophy.points.first"),
          t("philosophy.points.second"),
          t("philosophy.points.third"),
        ]}
        panel="end"
        panelClassName="lg:h-140 lg:w-120"
      />
      <HomeProcess />
      <CtaBand />
    </main>
  );
}
