import Image from "next/image";
import { getTranslations } from "next-intl/server";

import { enterItem } from "@/components/motion/reveal-item";
import { highlightTags } from "@/components/site/highlight";
import servicesHero from "@/assets/images/services-hero.jpg";

import { HeroVideo } from "./hero-video";

/*
 * Figma Services › Photo Hero (desktop 149:44, tablet 359:151, mobile 359:439). The
 * header is fixed and transparent over this photo (overlayNavRoutes), so the hero
 * starts at the top of the page and pads its own content below the nav.
 * - It fills the first screen at every size (#68), with the content at the bottom, so
 *   no white from the next section shows on first view. Desktop keeps Figma's 780 as
 *   the minimum.
 * - A looping video plays over the photo (HeroVideo, #68), with its own pause button.
 * - Desktop: text bottom-left, quote card bottom-right.
 * - Tablet and mobile: text then a full-width quote card, height from content.
 * - The eyebrow is white at 85%, not green: green fails contrast on the photo
 *   (CLAUDE.md, accessibility decisions).
 * - The photo is decorative (alt=""); hero-scrim keeps the white text readable.
 * - No blur placeholder: on a full-bleed photo, next/image's SVG blur costs seconds of
 *   rasterisation on slower devices (measured in #27). The section's dark fill shows
 *   until the (priority) photo arrives.
 * - data-sticky-cta-trigger: the mobile StickyCta appears once this has scrolled away.
 * - Entrance (CSS, first paint): eyebrow, headline, lead, then the quote card, while
 *   the photo settles from a slight zoom (1.08 → 1, 1.6 s).
 * Holds the page's only H1.
 */
export async function ServicesHero() {
  const t = await getTranslations("Services.hero");

  return (
    <section
      aria-labelledby="services-hero-title"
      data-sticky-cta-trigger
      data-surface="dark"
      className="relative isolate flex min-h-svh flex-col justify-end overflow-hidden bg-text-primary text-text-on-accent"
    >
      <Image
        src={servicesHero}
        alt=""
        fill
        priority
        sizes="100vw"
        className="-z-10 object-cover motion-safe:animate-hero-settle"
      />
      <HeroVideo
        src="/videos/services-hero.mp4"
        labels={{ pause: t("pauseVideo"), play: t("playVideo") }}
      />
      <div aria-hidden className="absolute inset-0 -z-10 hero-scrim" />

      <div className="mx-auto flex w-full max-w-(--container-canvas) flex-col gap-7 px-(--gutter) pt-55 pb-7 md:gap-0 md:pt-76 md:pb-9 lg:min-h-195 lg:flex-row lg:items-end lg:justify-between lg:gap-xl lg:pt-0 lg:pb-10">
        <div className="flex flex-col gap-3.5 md:pb-7 lg:gap-3 lg:pb-12">
          <p {...enterItem(0)} className="text-overline text-text-on-accent/85">
            {t("eyebrow")}
          </p>
          <h1
            {...enterItem(1)}
            id="services-hero-title"
            className="text-h1 text-text-on-accent lg:max-w-170"
          >
            {t.rich("title", highlightTags)}
          </h1>
          <p
            {...enterItem(2)}
            className="text-body text-text-on-accent/90 md:text-lead lg:max-w-130"
          >
            {t("lead")}
          </p>
        </div>

        <figure
          {...enterItem(3)}
          className="flex flex-col gap-3.5 rounded-lg border border-text-on-accent/12 bg-text-primary/55 px-7 pt-6 pb-6.5 lg:mr-8 lg:w-85 lg:shrink-0"
        >
          <span
            aria-hidden
            className="text-[40px] leading-[0.6] font-bold text-action-primary"
          >
            “
          </span>
          <blockquote className="text-body font-semibold italic">
            <p className="leading-[1.4]">{t("quote")}</p>
          </blockquote>
          <figcaption className="text-overline text-text-on-accent/75">
            {t("quoteSource")}
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
