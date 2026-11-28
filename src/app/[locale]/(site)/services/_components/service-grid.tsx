import { getTranslations } from "next-intl/server";

import { RevealGroup } from "@/components/motion/reveal-group";
import { revealItem } from "@/components/motion/reveal-item";
import {
  highlightTags,
  indentTag,
  plainTags,
} from "@/components/site/highlight";
import { LogoMark } from "@/components/site/logo";
import { includedKeys, services } from "@/content/services";
import { cn } from "@/lib/utils";

import { IllustrationPlayer } from "./illustration-player";
import { ServiceDetails } from "./service-details";
import { serviceIllustrations } from "./service-illustrations";

/*
 * Figma Services › Services Grid (desktop 467:1148, tablet 468:410, mobile 468:679):
 * a header and one card per service, in `services` order (#124). It replaced the
 * pinned service blocks.
 * - Grid: desktop 3 + 2 (a 6-column grid, cards spanning 2 then 3); tablet 2 + 2 + 1,
 *   the last card spanning both columns; mobile one column. Cards in a row share a
 *   height and "What's included" sits at the bottom of each.
 * - Two card shapes (cardLayout): vertical, with the illustration above the copy, and
 *   horizontal, with it in a 272 px panel on the left. The wide cards are horizontal:
 *   the last two on desktop, the full-width fifth on tablet. Mobile is all vertical.
 * - Each card's id is its slug, so /services#web-design (Home cards, footer links)
 *   lands on it; the page's scroll-padding keeps it clear of the header (#177).
 * - One interactive element per card: the "What's included" trigger. Its ::after
 *   covers the card (it is made `static`, so the after anchors to the card), so a click
 *   anywhere opens the details, while keyboard and screen-reader users meet a single,
 *   clearly named button ("What's included: Web Design").
 * - Nothing moves while the card is pressed, and the trigger's pressed scale is `none`.
 *   Any `scale` value (even 100%) makes the button the containing block of its ::after,
 *   so during the press the stretched area collapsed to the button and the mouseup
 *   landed on the content below: no click (found in e2e). Press feedback is the card's
 *   shadow flattening (the Pressed state).
 * - Motion (Motion Spec › Service cards, following Emil Kowalski): the cards have no
 *   entrance of their own; the illustration drawing itself is the reveal
 *   (IllustrationPlayer). Hover deepens the shadow, nudges the arrow 4 px and plays
 *   the illustration's accent; no lift and no button tint. Reduced motion: drawings
 *   show complete and hover keeps only the shadow change.
 */

type CardLayout = {
  item: string;
  article: string;
  media: string;
  eyebrow: string;
  title: string;
};

/*
 * Placement and shape by index. Vertical media: 200 / 216 / 232 px tall with a hairline
 * below. Horizontal media: 272 px wide, full height, hairline on the right; its eyebrow
 * tightens to 12 px / 0.04em and its title stays 24 px on desktop (Figma 499:335).
 */
function cardLayout(index: number, total: number): CardLayout {
  const isLast = index === total - 1;
  const wideOnDesktop = index >= 3;
  const horizontal = isLast ? "md" : wideOnDesktop ? "lg" : null;

  return {
    item: cn(
      wideOnDesktop ? "lg:col-span-3" : "lg:col-span-2",
      isLast && "md:col-span-2",
    ),
    article: cn(
      horizontal === "md" && "md:flex-row",
      horizontal === "lg" && "lg:flex-row",
    ),
    media: cn(
      "h-50 w-full border-b md:h-54 lg:h-58",
      horizontal === "md" &&
        "md:h-auto md:w-68 md:border-r md:border-b-0 lg:h-auto",
      horizontal === "lg" && "lg:h-auto lg:w-68 lg:border-r lg:border-b-0",
    ),
    eyebrow: cn(
      horizontal === "md" && "md:text-[12px] md:tracking-[0.04em]",
      horizontal === "lg" && "lg:tracking-[0.04em]",
    ),
    title: horizontal ? "" : "lg:text-[28px] lg:leading-[1.12]",
  };
}

/* Figma: the second line starts 53 px in on desktop only. */
const titleIndent = indentTag("lg:block lg:pl-13.25");

export async function ServiceGrid() {
  const t = await getTranslations("Services");
  const names = await getTranslations("ServiceNames");
  const summaries = await getTranslations("ServiceSummaries");
  const common = await getTranslations("Common");
  const total = services.length;

  return (
    <section
      aria-labelledby="services-grid-title"
      className="overflow-x-clip bg-bg-surface py-(--section-y)"
    >
      <RevealGroup className="container-page flex flex-col gap-7 md:gap-10 lg:gap-14">
        <div className="flex flex-col items-start gap-3 lg:gap-md">
          <p {...revealItem()} className="text-overline text-action-secondary">
            {t("blocks.label")}
          </p>
          <h2
            {...revealItem()}
            id="services-grid-title"
            className="relative pb-1.5 text-h2 leading-[1.1] font-bold tracking-[-0.02em] text-text-primary lg:text-[44px] lg:leading-[1.08]"
          >
            {/* Figma "Brand Squiggle": hangs off the headline's start, about 1.08 × the
                type size, drawn once in view (Motion Spec › Title squiggle). */}
            <LogoMark
              draw="reveal"
              className="absolute -top-1.5 -left-4.5 h-[20.8px] w-6.5 md:-top-2 md:-left-7 md:h-[27.2px] md:w-8.5 lg:-left-10.5 lg:h-[38.4px] lg:w-12"
            />
            {t.rich("grid.title", { ...highlightTags, ...titleIndent })}
          </h2>
        </div>

        <ul className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-lg lg:grid-cols-6">
          {services.map(({ slug, key, icon }, index) => {
            const name = names(key);
            const number = String(index + 1).padStart(2, "0");
            const titleId = `${slug}-title`;
            const Illustration = serviceIllustrations[slug];
            const layout = cardLayout(index, total);

            return (
              <li key={slug} className={cn("flex", layout.item)}>
                <article
                  id={slug}
                  aria-labelledby={titleId}
                  className={cn(
                    "group/card relative flex w-full flex-col overflow-hidden rounded-lg border border-border-default bg-bg-surface shadow-card",
                    // Hover: the shadow deepens (no lift, Motion Spec › Service cards).
                    "transition-shadow duration-(--duration-base) ease-emphasized hover:shadow-card-hover",
                    // Press: the shadow flattens. No scale or shift while pressed: moving
                    // the card (or the button's stretched ::after) under the pointer
                    // would make the mouseup miss it, and the click never completes.
                    "has-[button:active]:shadow-card-pressed",
                    layout.article,
                  )}
                >
                  <IllustrationPlayer
                    className={cn(
                      "flex shrink-0 items-center justify-center overflow-hidden border-border-default",
                      layout.media,
                    )}
                  >
                    <Illustration />
                  </IllustrationPlayer>

                  <div className="flex flex-1 flex-col items-start gap-3 p-5 md:p-lg">
                    <p
                      className={cn(
                        "text-overline text-action-secondary",
                        layout.eyebrow,
                      )}
                    >
                      {t("blocks.eyebrow", { number, name })}
                    </p>
                    <h3
                      id={titleId}
                      className={cn(
                        "text-[24px] leading-[1.15] font-bold tracking-[-0.01em] text-text-primary",
                        layout.title,
                      )}
                    >
                      {t.rich(`items.${key}.title`, plainTags)}
                    </h3>
                    <p className="text-body text-text-muted">
                      {summaries(key)}
                    </p>
                    <div className="mt-auto pt-3">
                      <ServiceDetails
                        slug={slug}
                        icon={icon}
                        name={name}
                        position={t("details.position", {
                          current: number,
                          total: String(total).padStart(2, "0"),
                        })}
                        title={t.rich(`items.${key}.title`, highlightTags)}
                        details={t(`items.${key}.details`)}
                        included={includedKeys.map((item) =>
                          t(`items.${key}.included.${item}`),
                        )}
                        // Stretched over the card: `static` so the ::after anchors to
                        // the card, not the button; hugs its label at every width. Press
                        // scale is `none`, not 100%: any scale value makes the button the
                        // ::after's containing block, collapsing it to the button mid-click.
                        // The ::after makes a hover anywhere on the card a hover of the
                        // button: no tint (hover:bg-bg-surface), and the arrow nudges
                        // 4 px instead of the button's usual 2.
                        triggerClassName={cn(
                          "static w-auto after:absolute after:inset-0 after:content-[''] motion-safe:active:scale-none",
                          "hover:bg-bg-surface [&>span]:duration-(--duration-base) [&>span]:ease-emphasized motion-safe:hover:[&>span]:translate-x-1",
                        )}
                        labels={{
                          trigger: t("blocks.moreDetails"),
                          triggerAriaLabel: t("blocks.moreDetailsLabel", {
                            name,
                          }),
                          included: t("details.included"),
                          book: common("bookConsultation"),
                          close: common("close"),
                        }}
                      />
                    </div>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      </RevealGroup>
    </section>
  );
}
