import { getTranslations } from "next-intl/server";

import { SectionHeader } from "@/components/site/section-header";
import { Reveal } from "@/components/motion/reveal";
import { cn } from "@/lib/utils";

import { ProcessTrack } from "./process-track";

/*
 * Figma Home › Process (desktop 86:84, tablet 347:505, mobile 347:216).
 * - Desktop: four step cards at staggered heights over the red "journey line"
 *   (Figma vector 92:5), which ProcessTrack draws as the section scrolls. Tablet: 2 × 2
 *   grid, no line. Mobile: one column joined by a connector that draws top to bottom.
 * - The cards settle in with the scroll reveal, 60 ms apart (Motion Spec › Home).
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

        <ProcessTrack>
          <ol className="relative grid gap-3.5 md:grid-cols-2 lg:grid-cols-4 lg:gap-14">
            {steps.map((step, index) => (
              <li
                key={step}
                className={cn("flex lg:self-start", desktopOffset[index])}
              >
                <Reveal
                  index={index}
                  className="flex w-full flex-col items-start gap-md rounded-lg bg-bg-surface p-lg shadow-card"
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
                </Reveal>
              </li>
            ))}
          </ol>
        </ProcessTrack>
      </div>
    </section>
  );
}
