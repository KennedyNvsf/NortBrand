import { getTranslations } from "next-intl/server";

import { LayoutGrid } from "lucide-react";

import { enterItem } from "@/components/motion/reveal-item";
import { BookingButton } from "@/components/site/booking-button";
import { highlightTags } from "@/components/site/highlight";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { ICON_STROKE } from "@/lib/icons";

/*
 * Figma Home › Hero (desktop 50:6, tablet 347:446, mobile 347:157). Centred on every
 * breakpoint; buttons stack full-width on mobile. Holds the page's only H1.
 * - Fills the first screen below the header (--header-height), content centred, so the
 *   next section starts below the fold and the hero gets the whole first impression.
 * - Entrance (CSS, first paint): eyebrow, headline, lead, then the buttons, 110 ms
 *   apart. "View Services" morphs its arrow into a grid of services on hover; "Book a
 *   Consultation" into a calendar (BookingButton).
 * data-sticky-cta-trigger: the mobile StickyCta appears once this has scrolled away.
 */
export async function HomeHero() {
  const t = await getTranslations("Home.hero");
  const common = await getTranslations("Common");

  return (
    <section
      aria-labelledby="home-hero-title"
      data-sticky-cta-trigger
      className="flex min-h-[calc(100svh-var(--header-height))] items-center bg-bg-surface py-14 md:py-18 lg:py-2xl"
    >
      <div className="container-page flex flex-col items-center gap-5 text-center lg:gap-xl">
        <p {...enterItem(0)} className="text-overline text-action-secondary">
          {t("eyebrow")}
        </p>
        <h1
          {...enterItem(1)}
          id="home-hero-title"
          className="max-w-205 text-display text-text-primary"
        >
          {t.rich("title", highlightTags)}
        </h1>
        <p {...enterItem(2)} className="max-w-155 text-lead text-text-muted">
          {t("lead")}
        </p>
        <div
          {...enterItem(3)}
          className="mt-3 flex w-full flex-col gap-3 md:mt-0 md:w-auto md:flex-row md:gap-md"
        >
          <BookingButton className="w-full md:w-auto">
            {common("bookConsultation")}
          </BookingButton>
          <Button
            asChild
            variant="secondary"
            showIcon
            hoverIcon={<LayoutGrid strokeWidth={ICON_STROKE} aria-hidden />}
            className="w-full md:w-auto"
          >
            <Link href="/services">{t("secondary")}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
