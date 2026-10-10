import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { locale as rootLocale } from "next/root-params";

import { CtaBand, CtaHighlight } from "@/components/site/cta-band";
import { localeAlternates } from "@/i18n/metadata";
import { routing, type Locale } from "@/i18n/routing";

import { AboutHero } from "./_components/about-hero";
import { AboutPrinciple } from "./_components/about-principle";
import { AboutStory } from "./_components/about-story";

/*
 * About (Figma 07 — About, 300:2): Hero · Our story · Our principle · CTA band. Nav,
 * footer and the mobile sticky CTA come from the (site) layout. Static for both
 * locales, and entirely server-rendered: the page ships no component JavaScript of
 * its own.
 */

async function currentLocale(): Promise<Locale> {
  const locale = await rootLocale();
  return routing.locales.find((l) => l === locale) ?? routing.defaultLocale;
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Metadata");
  return {
    title: t("aboutTitle"),
    description: t("aboutDescription"),
    alternates: localeAlternates(await currentLocale(), "/about"),
  };
}

export default async function AboutPage() {
  const t = await getTranslations("About.cta");

  return (
    <main id="main">
      <AboutHero />
      <AboutStory />
      <AboutPrinciple />
      <CtaBand
        headline={t.rich("headline", {
          highlight: (chunks) => <CtaHighlight>{chunks}</CtaHighlight>,
        })}
        subtext={t("subtext")}
      />
    </main>
  );
}
