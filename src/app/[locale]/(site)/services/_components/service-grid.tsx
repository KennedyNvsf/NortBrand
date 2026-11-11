import Image from "next/image";
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
import { ICON_STROKE, icons } from "@/lib/icons";
import { cn } from "@/lib/utils";

import { ServiceDetails } from "./service-details";
import { servicePhotos } from "./service-photos";

/*
 * Figma Services › Services Grid (desktop 467:1148, tablet 468:410, mobile 468:679):
 * a header and one vertical card per service, in `services` order (#124). It replaced
 * the pinned service blocks.
 * - Grid: desktop 3 + 2 (a 6-column grid, cards spanning 2 then 3); tablet 2 + 2 + 1,
 *   the last card spanning both columns; mobile one column. Cards in a row share a
 *   height and "More Details" sits at the bottom of each.
 * - Each card's id is its slug, so /services#web-design (Home cards, footer links)
 *   lands on it; scroll-mt keeps it clear of the fixed header.
 * - One interactive element per card: the "More Details" trigger. Its ::after covers
 *   the card (it is made `static`, so the after anchors to the card), so a click
 *   anywhere opens the details, while keyboard and screen-reader users meet a single,
 *   clearly named button ("More Details: Web Design").
 * - Nothing moves while the card is pressed. The button's usual press scale would
 *   shrink its ::after around the button's centre, so a press near the card's top
 *   ended with the mouseup on the content below and no click (found in e2e). Press
 *   feedback is the card's shadow flattening instead.
 * - Motion (Emil's practices on Motion Spec tokens): inside a RevealGroup the eyebrow
 *   and headline rise, the squiggle draws itself, and each card rises as it scrolls in;
 *   cards that arrive together are staggered. Hover (hover devices only) lifts the card
 *   4 px, deepens its shadow and tilts the icon chip, the Home service cards' language.
 *   Reduced motion: opacity only, no lift or tilt, and the squiggle is simply drawn.
 */

/*
 * The width each card's photo is drawn at: the card's width (photos are no wider than
 * the media, so object-cover fills it by width), at the 1440 / 768 / 390 layouts.
 */
const PHOTO_SIZES = {
  third:
    "(min-width: 1024px) 362px, (min-width: 768px) 340px, calc(100vw - 40px)",
  half: "(min-width: 1024px) 556px, (min-width: 768px) 340px, calc(100vw - 40px)",
  halfThenFull:
    "(min-width: 1024px) 556px, (min-width: 768px) 704px, calc(100vw - 40px)",
} as const;

/* Grid placement by index: 3 + 2 on desktop, the fifth card full width on tablet. */
function cardPlacement(index: number, total: number) {
  const isLast = index === total - 1;
  return {
    className: cn(
      index < 3 ? "lg:col-span-2" : "lg:col-span-3",
      isLast && "md:col-span-2 lg:col-span-3",
    ),
    sizes:
      index < 3
        ? PHOTO_SIZES.third
        : isLast
          ? PHOTO_SIZES.halfThenFull
          : PHOTO_SIZES.half,
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
            const Icon = icons[icon];
            const photo = servicePhotos[slug];
            const placement = cardPlacement(index, total);

            return (
              <li
                key={slug}
                {...revealItem()}
                className={cn("flex", placement.className)}
              >
                <article
                  id={slug}
                  aria-labelledby={titleId}
                  className={cn(
                    "group/card relative flex w-full scroll-mt-24 flex-col overflow-hidden rounded-lg border border-border-default bg-bg-surface shadow-card",
                    "transition-[translate,box-shadow] duration-(--duration-base) ease-emphasized hover:shadow-card-hover motion-safe:hover:-translate-y-1",
                    // Press: the shadow flattens. No scale or shift while pressed: moving
                    // the card (or the button's stretched ::after) under the pointer
                    // would make the mouseup miss it, and the click never completes.
                    "has-[button:active]:shadow-card-pressed",
                  )}
                >
                  <div className="relative h-50 shrink-0 overflow-hidden bg-action-primary-subtle md:h-54 lg:h-58">
                    <Image
                      src={photo.src}
                      alt=""
                      fill
                      sizes={placement.sizes}
                      placeholder="blur"
                      className={cn(
                        "object-cover",
                        "position" in photo && photo.position,
                      )}
                    />
                    <span className="absolute top-md left-md flex size-12 items-center justify-center rounded-md bg-bg-surface transition-transform duration-(--duration-base) ease-emphasized motion-safe:group-hover/card:scale-110 motion-safe:group-hover/card:-rotate-6">
                      <Icon
                        className="size-6 text-action-primary"
                        strokeWidth={ICON_STROKE}
                        aria-hidden
                      />
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col items-start gap-3 p-5 md:p-lg">
                    <p className="text-overline text-action-secondary">
                      {t("blocks.eyebrow", { number, name })}
                    </p>
                    <h3
                      id={titleId}
                      className="text-[24px] leading-[1.15] font-bold tracking-[-0.01em] text-text-primary lg:text-[28px] lg:leading-[1.12]"
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
                        // the card, not the button; hugs its label at every width. No
                        // press scale: it would shrink the ::after away from the pointer.
                        triggerClassName="static w-auto after:absolute after:inset-0 after:content-[''] motion-safe:active:scale-100"
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
