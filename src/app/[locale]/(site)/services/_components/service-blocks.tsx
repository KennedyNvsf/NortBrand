import { getTranslations } from "next-intl/server";

import { revealItem } from "@/components/motion/reveal-item";
import { highlightTags, plainTags } from "@/components/site/highlight";
import { includedKeys, services } from "@/content/services";
import { cn } from "@/lib/utils";

import { ServiceCollage } from "./service-collage";
import { ServiceDetails } from "./service-details";
import { servicePhotos } from "./service-photos";
import { ServiceStage } from "./service-stage";

/*
 * Figma Services › Service Blocks (desktop 163:32, tablet 359:174, mobile 359:462).
 * One block per service, in `services` order. Each block's id is its slug, so
 * /services#web-design (Home cards, footer links) lands on it; scroll-mt keeps the
 * heading clear of the fixed header.
 * - Desktop and tablet: collage and text side by side, alternating sides. Mobile: a
 *   plain vertical stack, collage first (CLAUDE.md, Motion).
 * - Tablet and mobile separate blocks with a hairline (359:197).
 * - Desktop keeps a 76 px column on the right for the dot navigation (Figma 173:2).
 * - ServiceStage (client) pins the blocks on desktop and plays each block's entrance
 *   (collage pop, then the copy) via the reveal markers; the blocks stay
 *   server-rendered.
 */
export async function ServiceBlocks() {
  const t = await getTranslations("Services");
  const names = await getTranslations("ServiceNames");
  const summaries = await getTranslations("ServiceSummaries");
  const common = await getTranslations("Common");
  const total = services.length;

  return (
    <ServiceStage
      label={t("blocks.label")}
      dotsLabel={t("blocks.jump")}
      steps={services.map(({ slug, key }) => ({ slug, name: names(key) }))}
    >
      {services.map(({ slug, key, icon }, index) => {
        const name = names(key);
        const number = String(index + 1).padStart(2, "0");
        const titleId = `${slug}-title`;

        return (
          <article
            key={slug}
            id={slug}
            aria-labelledby={titleId}
            className="scroll-mt-24"
          >
            <div className="container-page flex flex-col gap-7 py-2xl md:flex-row md:items-center md:gap-10 md:py-16 lg:justify-center lg:gap-16 lg:py-2xl lg:pr-[calc(var(--gutter)+--spacing(19))]">
              <ServiceCollage
                photos={servicePhotos[slug]}
                className={cn(
                  "w-full md:w-78 lg:w-139",
                  index % 2 === 1 && "md:order-last",
                )}
              />

              <div className="flex flex-col items-start gap-3 md:flex-1 lg:w-110 lg:flex-none lg:gap-lg">
                <p
                  {...revealItem()}
                  className="text-overline text-action-secondary"
                >
                  {t("blocks.eyebrow", { number, name })}
                </p>
                <h2
                  {...revealItem()}
                  id={titleId}
                  className="text-h2 font-bold tracking-[-0.005em] text-text-primary"
                >
                  {t.rich(`items.${key}.title`, plainTags)}
                </h2>
                <p
                  {...revealItem()}
                  className="text-body text-text-muted lg:text-lead"
                >
                  {summaries(key)}
                </p>
                <div {...revealItem()} className="w-full pt-1 lg:pt-2">
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
                    labels={{
                      trigger: t("blocks.moreDetails"),
                      triggerAriaLabel: t("blocks.moreDetailsLabel", { name }),
                      included: t("details.included"),
                      book: common("bookConsultation"),
                      close: common("close"),
                    }}
                  />
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </ServiceStage>
  );
}
