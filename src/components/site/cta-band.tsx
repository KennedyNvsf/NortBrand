import type { ReactNode } from "react";
import Image from "next/image";
import { Calendar } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { RevealGroup } from "@/components/motion/reveal-group";
import { revealItem } from "@/components/motion/reveal-item";
import { BookingButton } from "@/components/site/booking-button";
import { ICON_STROKE } from "@/lib/icons";
import { cn } from "@/lib/utils";
import seaCoast from "@/assets/images/sea-coast.jpg";

/*
 * Figma: 02 Components › CTA Band (337:146): Desktop 337:145, Tablet 345:139,
 * Mobile 345:153. "Override per page: headline (keep the red keyword) and supporting
 * line. The action card stays constant."
 * - Pages pass `headline` built with t.rich and <CtaHighlight> around the keyword, so
 *   the red word stays in place in every language. Without props it shows the default
 *   copy from the CtaBand messages.
 * - No blur placeholder (too costly to rasterise at this size; see ServicesHero): the
 *   band's dark fill shows until the photo arrives.
 * - The sea photo is decorative here (alt=""): the text carries the message. The
 *   photo-scrim utility keeps white text readable: vertical on touch, horizontal on
 *   desktop.
 * - data-sticky-cta-hide: the mobile StickyCta hides while this band is on screen.
 * - On scroll the headline and supporting line rise in, then the action card pops
 *   (Motion Spec › Global, revised).
 */

export function CtaHighlight({ children }: { children: ReactNode }) {
  return <span className="text-action-primary">{children}</span>;
}

type CtaBandProps = {
  /** Headline with the keyword wrapped in <CtaHighlight>. */
  headline?: ReactNode;
  subtext?: string;
  className?: string;
};

export async function CtaBand({ headline, subtext, className }: CtaBandProps) {
  const t = await getTranslations("CtaBand");
  const common = await getTranslations("Common");

  return (
    <section
      aria-labelledby="cta-band-title"
      data-sticky-cta-hide
      className={cn("bg-bg-surface px-(--gutter) py-lg lg:py-xl", className)}
    >
      {/* Full-width white band; the card stops at the 1440 canvas minus gutters. */}
      <RevealGroup className="relative isolate mx-auto max-w-[calc(var(--container-canvas)-2*var(--gutter))] overflow-hidden rounded-xl bg-text-primary shadow-card">
        <Image
          src={seaCoast}
          alt=""
          fill
          sizes="(min-width: 1440px) 1344px, 100vw"
          className="-z-10 object-cover"
        />
        <div aria-hidden className="absolute inset-0 -z-10 photo-scrim" />

        <div className="flex flex-col gap-7 px-lg py-7 md:gap-xl md:p-2xl lg:min-h-145 lg:flex-row lg:items-center lg:justify-center lg:gap-16 lg:p-xl">
          <div className="flex flex-col gap-lg lg:w-115">
            <h2
              {...revealItem()}
              id="cta-band-title"
              className="text-h2 font-bold tracking-[-0.005em] text-text-on-accent"
            >
              {headline ??
                t.rich("headline", {
                  highlight: (chunks) => <CtaHighlight>{chunks}</CtaHighlight>,
                })}
            </h2>
            <p {...revealItem()} className="text-body text-text-on-accent/90">
              {subtext ?? t("subtext")}
            </p>
          </div>

          <div
            {...revealItem("pop")}
            className="flex flex-col items-start gap-lg rounded-lg bg-bg-surface p-lg shadow-card md:p-xl lg:w-85"
          >
            <span className="flex size-12 items-center justify-center rounded-md bg-action-primary-subtle">
              <Calendar
                className="size-6 text-action-primary"
                strokeWidth={ICON_STROKE}
                aria-hidden
              />
            </span>
            <p className="text-h4 font-semibold text-text-primary">
              {common("bookConsultation")}
            </p>
            <p className="text-small text-text-muted">{t("cardText")}</p>
            <BookingButton className="w-full">
              {common("bookConsultation")}
            </BookingButton>
          </div>
        </div>
      </RevealGroup>
    </section>
  );
}
