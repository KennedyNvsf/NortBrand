import { getTranslations } from "next-intl/server";

import { RevealGroup } from "@/components/motion/reveal-group";
import { revealItem } from "@/components/motion/reveal-item";
import { highlightTags } from "@/components/site/highlight";
import { SectionHeader } from "@/components/site/section-header";
import { ServiceCard } from "@/components/site/service-card";
import { services } from "@/content/services";

/*
 * Figma Home › Services (57:16). Grid of the five ServiceCards: 3 columns on desktop,
 * 2 on tablet with the last card spanning both, 1 on mobile. Each card links to its
 * block on the Services page (/services#<slug>).
 * On scroll: eyebrow, heading, then the cards rise in 100 ms apart, row by row.
 */
export async function HomeServices() {
  const t = await getTranslations("Home.services");
  const names = await getTranslations("ServiceNames");
  const summaries = await getTranslations("ServiceSummaries");

  return (
    <section
      aria-labelledby="home-services-title"
      className="bg-bg-surface py-18 md:py-22 lg:py-2xl"
    >
      <RevealGroup className="container-page flex flex-col gap-xl md:gap-10 lg:gap-md">
        <SectionHeader
          id="home-services-title"
          eyebrow={t("eyebrow")}
          title={t.rich("title", highlightTags)}
          weight="semibold"
        />
        <ul className="grid gap-3.5 md:grid-cols-2 md:gap-5 lg:grid-cols-3 lg:gap-xl">
          {services.map(({ slug, key, icon }) => (
            <li
              key={slug}
              {...revealItem()}
              className="flex md:last:col-span-2 lg:last:col-span-1"
            >
              <ServiceCard
                href={{ pathname: "/services", hash: slug }}
                icon={icon}
                title={names(key)}
                description={summaries(key)}
                actionLabel={t("learnMore")}
              />
            </li>
          ))}
        </ul>
      </RevealGroup>
    </section>
  );
}
