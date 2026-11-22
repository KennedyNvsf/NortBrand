import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { CtaBand, CtaHighlight } from "@/components/site/cta-band";
import { CornerPromo } from "@/features/promo/components/corner-promo";
import { localizedPageMetadata } from "@/i18n/page-metadata";

import { AboutHero } from "./_components/about-hero";
import { AboutPrinciple } from "./_components/about-principle";
import { AboutStory } from "./_components/about-story";

/*
 * About (Figma 07 — About, 300:2): Hero · Our story · Our principle · CTA band. Nav,
 * footer and the mobile sticky CTA come from the (site) layout. Static for both
 * locales, and entirely server-rendered: the page ships no component JavaScript of
 * its own.
 */

export function generateMetadata(): Promise<Metadata> {
  return localizedPageMetadata("/about", (t) => ({
    title: t("aboutTitle"),
    description: t("aboutDescription"),
  }));
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
      <CornerPromo placement="about" />
    </main>
  );
}
