import { getTranslations } from "next-intl/server";

import { RevealGroup } from "@/components/motion/reveal-group";
import { revealItem } from "@/components/motion/reveal-item";
import {
  emphasisTags,
  highlightTags,
  indentTag,
} from "@/components/site/highlight";

/*
 * Figma About › Our Principle (desktop 301:43, tablet 377:112, mobile 377:295).
 * - The headline's second line is indented on tablet (48) and desktop (90). The
 *   message marks it with <indent>, so it stays one translatable sentence; on mobile
 *   the indent span is inline and the sentence flows normally.
 * - Desktop: the paragraph starts at the Story text column (456 in), so the two
 *   sections share one vertical edge.
 */

/* Inline on mobile, so the sentence flows; its own line from tablet. */
const titleIndent = indentTag("md:block md:pl-12 lg:pl-22.5");

export async function AboutPrinciple() {
  const t = await getTranslations("About.principle");

  return (
    <section
      aria-labelledby="about-principle-title"
      className="bg-bg-surface pb-(--section-y)"
    >
      <div className="container-page">
        <RevealGroup className="flex flex-col gap-lg border-t border-border-default pt-xl md:pt-10 lg:gap-xl">
          <div className="flex flex-col gap-lg">
            <p {...revealItem()} className="text-overline text-text-accent">
              {t("eyebrow")}
            </p>
            <h2
              {...revealItem()}
              id="about-principle-title"
              className="text-display-xl text-text-primary"
            >
              {t.rich("title", { ...highlightTags, ...titleIndent })}
            </h2>
          </div>
          <p
            {...revealItem()}
            className="text-body text-text-muted lg:ml-114 lg:max-w-170 lg:text-lead"
          >
            {t.rich("body", emphasisTags)}
          </p>
        </RevealGroup>
      </div>
    </section>
  );
}
