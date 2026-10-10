import { getTranslations } from "next-intl/server";

import { SectionHeader } from "@/components/site/section-header";
import { cn } from "@/lib/utils";

/*
 * Figma Home › Process (desktop 86:84, tablet 347:505, mobile 347:216).
 * - Desktop: four step cards at staggered heights over the red "journey line"
 *   (Figma vector 92:5, drawn static here; its draw-on animation belongs to the Motion
 *   ticket). Tablet: 2 × 2 grid, no line. Mobile: one column joined by a thin connector.
 * - Badge numbers use red/600: Figma red/500 on red/50 is 3.9:1 at 18 px (CLAUDE.md,
 *   small red text).
 * - An ordered list, because the order is the content; the 01–04 badges repeat what
 *   the list already says, so they are hidden from assistive tech.
 */
const steps = ["discover", "design", "build", "launch"] as const;

// Figma desktop card offsets inside the steps wrapper: 40 / 76 / 12 / 40 px.
const desktopOffset = ["lg:mt-10", "lg:mt-19", "lg:mt-3", "lg:mt-10"] as const;

export async function HomeProcess() {
  const t = await getTranslations("Home.process");

  return (
    <section
      aria-labelledby="home-process-title"
      className="bg-bg-surface py-18 md:py-22 lg:py-2xl"
    >
      <div className="container-page flex flex-col gap-xl md:gap-10 lg:gap-md">
        <SectionHeader
          id="home-process-title"
          eyebrow={t("eyebrow")}
          title={t("title")}
          align="center"
          className="lg:mx-auto lg:max-w-170"
        />

        <div className="relative w-full lg:mx-auto lg:max-w-285 lg:pb-12">
          <svg
            aria-hidden
            viewBox="0 0 1140 180"
            preserveAspectRatio="none"
            fill="none"
            className="absolute inset-x-0 top-0 hidden h-45 w-full text-action-primary lg:block"
          >
            <path
              d="M48 88C130 50 180 140 250 110C290 95 320 130 344 124C420 160 460 20 520 45C580 65 610 30 640 60C710 90 750 20 800 50C860 75 900 55 936 88"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          <span
            aria-hidden
            className="absolute top-12 bottom-12 left-12 w-0.5 -translate-x-1/2 rounded-full bg-action-primary/25 md:hidden"
          />

          <ol className="relative grid gap-3.5 md:grid-cols-2 lg:grid-cols-4 lg:gap-14">
            {steps.map((step, index) => (
              <li
                key={step}
                className={cn(
                  "flex flex-col items-start gap-md rounded-lg bg-bg-surface p-lg shadow-card lg:self-start",
                  desktopOffset[index],
                )}
              >
                <span
                  aria-hidden
                  className="flex size-12 items-center justify-center rounded-md bg-action-primary-subtle text-lead font-bold text-text-accent"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="text-lead font-semibold text-text-primary">
                  {t(`steps.${step}.title`)}
                </h3>
                <p className="text-small text-text-muted">
                  {t(`steps.${step}.body`)}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
