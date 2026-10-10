import { getTranslations } from "next-intl/server";

import { highlightTags } from "@/components/site/highlight";

/*
 * Figma About › Hero (desktop 300:19, tablet 377:78, mobile 377:261). Centred on every
 * breakpoint. The headline wraps after "designed" on tablet and desktop because of its
 * max width, not a hard break, so translations wrap naturally.
 * - Eyebrow: small red text uses red/600 (CLAUDE.md, accessibility decisions).
 * - data-sticky-cta-trigger: the mobile StickyCta appears once this has scrolled away.
 * Holds the page's only H1.
 */
export async function AboutHero() {
  const t = await getTranslations("About.hero");

  return (
    <section
      aria-labelledby="about-hero-title"
      data-sticky-cta-trigger
      className="bg-bg-surface pt-14 pb-18 md:pt-18 md:pb-22 lg:pt-20 lg:pb-25"
    >
      <div className="container-page flex flex-col items-center gap-5 text-center md:gap-7 lg:gap-xl">
        <p className="text-overline text-text-accent">{t("eyebrow")}</p>
        <h1
          id="about-hero-title"
          className="text-display-xl text-text-primary md:max-w-150 lg:max-w-215"
        >
          {t.rich("title", highlightTags)}
        </h1>
        <p className="text-intro text-text-muted lg:max-w-147">{t("lead")}</p>
      </div>
    </section>
  );
}
