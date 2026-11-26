import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import asking from "@/assets/images/asking.jpg";
import homeWhy from "@/assets/images/home-why.jpg";
import { CtaBand, CtaHighlight } from "@/components/site/cta-band";
import { FeatureSplit } from "@/components/site/feature-split";
import { highlightTags } from "@/components/site/highlight";
import { HomePromo } from "@/features/promo/components/home-promo";
import { localizedPageMetadata } from "@/i18n/page-metadata";

import { HomeHero } from "./_components/home-hero";
import { HomeProcess } from "./_components/home-process";
import { HomeServices } from "./_components/home-services";

/*
 * Home (Figma 03 — Home, 49:2): Hero · Why it matters · What we do · Our philosophy ·
 * How it works · CTA band. Nav, footer and the mobile sticky CTA come from the (site)
 * layout. The limited-offer modal (#126) mounts after the cookie choice. Static for
 * both locales.
 */

export function generateMetadata(): Promise<Metadata> {
  return localizedPageMetadata("/", (t) => ({
    title: { absolute: t("homeTitle") },
    description: t("homeDescription"),
  }));
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
        image={{
          src: homeWhy,
          // Panel width: the container (20 px gutters) below 768, 280 on tablet, 520 on desktop.
          sizes:
            "(min-width: 1024px) 520px, (min-width: 768px) 280px, calc(100vw - 40px)",
          // Faces sit top-left: y keeps them in the short mobile crop, x in the narrow
          // tablet panel (desktop and mobile do not crop sideways).
          imageClassName: "object-[35%_16%]",
        }}
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
        image={{
          src: asking,
          // Panel width: the container (20 px gutters) below 768, 280 on tablet, 480 on desktop.
          sizes:
            "(min-width: 1024px) 480px, (min-width: 768px) 280px, calc(100vw - 40px)",
          // Keeps the three faces in the shorter mobile crop.
          imageClassName: "object-[50%_48%]",
        }}
      />
      <HomeProcess />
      <CtaBand
        headline={t.rich("cta.headline", {
          highlight: (chunks) => <CtaHighlight>{chunks}</CtaHighlight>,
        })}
        subtext={t("cta.subtext")}
      />
      <HomePromo />
    </main>
  );
}
