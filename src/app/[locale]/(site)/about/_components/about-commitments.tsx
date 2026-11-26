import { getTranslations } from "next-intl/server";

import { RevealGroup } from "@/components/motion/reveal-group";
import { revealItem } from "@/components/motion/reveal-item";
import { highlightTags } from "@/components/site/highlight";

/*
 * About › How we work (#77). Final copy with no Figma frame, so it reuses the Our Story
 * layout (300:37) and its tokens: heading column (360) beside the text column on
 * desktop, stacked on tablet and mobile, with the four commitments 2 × 2 from tablet.
 * - An unordered list: the commitments hold together, they aren't steps, so there
 *   are no 01–04 numbers. Each title is an h3 under the section's h2.
 * - Reveals like the sections above it.
 */

const commitmentKeys = [
  "conversation",
  "proposal",
  "portal",
  "aftercare",
] as const;

export async function AboutCommitments() {
  const t = await getTranslations("About.commitments");

  return (
    <section
      aria-labelledby="about-commitments-title"
      className="bg-bg-surface pb-(--section-y)"
    >
      <div className="container-page">
        <RevealGroup className="flex flex-col gap-7 border-t border-border-default pt-xl md:gap-9 md:pt-10 lg:flex-row lg:items-start lg:gap-24">
          <div className="flex flex-col gap-lg lg:w-90 lg:shrink-0">
            <p {...revealItem()} className="text-overline text-text-accent">
              {t("eyebrow")}
            </p>
            <h2
              {...revealItem()}
              id="about-commitments-title"
              className="text-h1 text-text-primary lg:text-display-section"
            >
              {t.rich("title", highlightTags)}
            </h2>
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-lg lg:gap-xl">
            <p
              {...revealItem()}
              className="text-body text-text-muted lg:text-lead"
            >
              {t("intro")}
            </p>

            <ul className="grid gap-3.5 md:grid-cols-2 md:gap-x-xl md:gap-y-lg">
              {commitmentKeys.map((key) => (
                <li
                  key={key}
                  {...revealItem()}
                  className="flex flex-col gap-2 border-t border-border-default pt-4.5"
                >
                  <h3 className="text-lead font-semibold text-text-primary md:text-h4 md:font-semibold">
                    {t(`items.${key}.title`)}
                  </h3>
                  <p className="text-body text-text-muted">
                    {t(`items.${key}.body`)}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </RevealGroup>
      </div>
    </section>
  );
}
