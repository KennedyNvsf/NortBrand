import { getTranslations } from "next-intl/server";

import { RevealGroup } from "@/components/motion/reveal-group";
import { revealItem } from "@/components/motion/reveal-item";
import { emphasisTags, highlightTags } from "@/components/site/highlight";

/*
 * Figma About › Our Story (desktop 300:37, tablet 377:86, mobile 377:269).
 * - Desktop: heading column (360) and text column (680), 96 apart. Tablet and mobile:
 *   stacked.
 * - The four "understanding" points are an ordered list: 2 × 2 from tablet, one column
 *   on mobile. The visible 01–04 numbers are decorative (the <ol> already conveys
 *   order), so they are hidden from assistive tech.
 * - The statement beside the red bar is emphasis, not a heading.
 */

const understandingKeys = ["does", "serves", "interacts", "works"] as const;

export async function AboutStory() {
  const t = await getTranslations("About.story");

  return (
    <section
      aria-labelledby="about-story-title"
      className="bg-bg-surface pt-2 pb-(--section-y) lg:pt-5"
    >
      <div className="container-page">
        <RevealGroup className="flex flex-col gap-7 border-t border-border-default pt-xl md:gap-9 md:pt-10 lg:flex-row lg:items-start lg:gap-24">
          <div className="flex flex-col gap-lg lg:w-90 lg:shrink-0">
            <p {...revealItem()} className="text-overline text-text-accent">
              {t("eyebrow")}
            </p>
            <h2
              {...revealItem()}
              id="about-story-title"
              className="text-h1 text-text-primary lg:text-display-section"
            >
              {t.rich("title", highlightTags)}
            </h2>
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-lg lg:gap-xl">
            <div
              {...revealItem()}
              className="flex gap-lg py-md md:py-5 lg:py-7"
            >
              <span
                aria-hidden
                className="w-1 shrink-0 self-stretch rounded-[2px] bg-action-primary"
              />
              <p className="text-h2 font-bold tracking-[-0.012em] text-text-primary">
                {t.rich("statement", highlightTags)}
              </p>
            </div>

            <p
              {...revealItem()}
              className="text-body text-text-muted lg:text-lead"
            >
              {t("intro")}
            </p>

            <ol className="grid gap-3.5 md:grid-cols-2 md:gap-x-xl md:gap-y-lg">
              {understandingKeys.map((key, index) => (
                <li
                  key={key}
                  {...revealItem()}
                  className="flex flex-col gap-md border-t border-border-default pt-4.5"
                >
                  <span aria-hidden className="text-overline text-text-accent">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="text-lead font-semibold text-text-primary md:text-h4 md:font-semibold">
                    {t(`understanding.${key}`)}
                  </span>
                </li>
              ))}
            </ol>

            <p
              {...revealItem()}
              className="text-body text-text-muted lg:text-lead"
            >
              {t.rich("outro", emphasisTags)}
            </p>
          </div>
        </RevealGroup>
      </div>
    </section>
  );
}
