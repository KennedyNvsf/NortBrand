import { getTranslations } from "next-intl/server";

import { Reveal } from "@/components/motion/reveal";
import { highlightTags, indentTag } from "@/components/site/highlight";

/*
 * Figma Contact › What Happens Next (desktop 280:27, tablet 378:153, mobile 378:372).
 * - Headline: two lines, the second indented at every breakpoint.
 * - Three step cards in an ordered list: a row from tablet, stacked on mobile.
 * - Step numbers use red/600 on red/50: red/500 at 18 px fails contrast (same fix as
 *   the Home process badges).
 */

const stepKeys = ["request", "reply", "call"] as const;

const titleIndent = indentTag("block pl-9 md:pl-14 lg:pl-17.5");

export async function ContactSteps() {
  const t = await getTranslations("Contact.steps");

  return (
    <section
      aria-labelledby="contact-steps-title"
      className="bg-bg-surface pb-18 md:pb-22 lg:pt-7.5 lg:pb-27.5"
    >
      <div className="container-page flex flex-col gap-7 md:gap-9 lg:gap-xl">
        <div className="flex flex-col gap-md">
          <p className="text-overline text-text-accent">{t("eyebrow")}</p>
          <h2
            id="contact-steps-title"
            className="text-display-section text-text-primary"
          >
            {t.rich("title", { ...highlightTags, ...titleIndent })}
          </h2>
        </div>

        <ol className="grid gap-md md:grid-cols-3 md:gap-sm lg:gap-lg">
          {stepKeys.map((key, index) => (
            <li key={key} className="flex">
              <Reveal
                index={index}
                className="flex w-full flex-col gap-md rounded-lg border border-border-default bg-bg-surface px-lg pt-6 pb-7 shadow-card md:px-md lg:px-7 lg:pt-7 lg:pb-8"
              >
                <span
                  aria-hidden
                  className="flex size-12 items-center justify-center rounded-md bg-action-primary-subtle text-lead font-bold text-text-accent"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="text-h4 font-semibold text-text-primary">
                  {t(`items.${key}.title`)}
                </h3>
                <p className="text-small text-text-muted">
                  {t(`items.${key}.body`)}
                </p>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
