import { getTranslations } from "next-intl/server";

import { highlightTags } from "@/components/site/highlight";
import { Button } from "@/components/ui/button";
import { BOOKING_HREF } from "@/content/navigation";
import { Link } from "@/i18n/navigation";

/*
 * Figma Home › Hero (desktop 50:6, tablet 347:446, mobile 347:157). Centred on every
 * breakpoint; buttons stack full-width on mobile. Holds the page's only H1.
 * data-sticky-cta-trigger: the mobile StickyCta appears once this has scrolled away.
 */
export async function HomeHero() {
  const t = await getTranslations("Home.hero");
  const common = await getTranslations("Common");

  return (
    <section
      aria-labelledby="home-hero-title"
      data-sticky-cta-trigger
      className="bg-bg-surface pt-14 pb-18 md:pt-18 md:pb-22 lg:py-2xl"
    >
      <div className="container-page flex flex-col items-center gap-5 text-center lg:gap-xl">
        <p className="text-overline text-action-secondary">{t("eyebrow")}</p>
        <h1
          id="home-hero-title"
          className="max-w-205 text-display text-text-primary"
        >
          {t.rich("title", highlightTags)}
        </h1>
        <p className="max-w-155 text-lead text-text-muted">{t("lead")}</p>
        <div className="mt-3 flex w-full flex-col gap-3 md:mt-0 md:w-auto md:flex-row md:gap-md">
          <Button asChild showIcon className="w-full md:w-auto">
            <Link href={BOOKING_HREF}>{common("bookConsultation")}</Link>
          </Button>
          <Button
            asChild
            variant="secondary"
            showIcon
            className="w-full md:w-auto"
          >
            <Link href="/services">{t("secondary")}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
