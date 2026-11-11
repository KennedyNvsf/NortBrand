import { Fragment } from "react";
import Image, { type StaticImageData } from "next/image";
import { getTranslations } from "next-intl/server";

import { RevealGroup } from "@/components/motion/reveal-group";
import { revealItem } from "@/components/motion/reveal-item";
import { BookingButton } from "@/components/site/booking-button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import brandIdentityImage from "@/assets/images/approach-brand-identity.jpg";
import contentStrategyImage from "@/assets/images/approach-content-strategy.jpg";
import growthImage from "@/assets/images/approach-growth.jpg";
import visualDesignImage from "@/assets/images/approach-visual-design.jpg";

import { ApproachTabs } from "./approach-tabs";

/*
 * Figma Services › Talking Points (desktop 189:30, tablet 359:285, mobile 359:573).
 * - Tablet and desktop: a vertical tab list on the left, the selected point on the
 *   right (Radix Tabs: arrow keys move between points).
 * - Mobile: shadcn Accordion, type single, collapsible, first point open (Handoff).
 * Both live in one Tabs root so the section heading renders once; CSS shows the list +
 * panel from md and the accordion below it. Server component: ApproachTabs (the
 * travelling accent and the panel slide-in) and Accordion are the client boundary.
 * - On scroll the heading, the points and the selected panel reveal (RevealGroup); the
 *   panel's items slide in from the right, as they do on every change.
 * Figma designs only the Brand Identity point; the other three use draft copy until the
 * final copy arrives (docs/tech-debt.md). Each point has the lead's photo (#82): 1600 px,
 * metadata stripped, decorative (alt=""), with an object-position that keeps its subject
 * in the landscape panel.
 */

const points = [
  { key: "brandIdentity", image: brandIdentityImage },
  {
    key: "visualDesign",
    image: visualDesignImage,
    position: "object-[50%_30%]",
  },
  // Portrait: the panel shows a band; keep the "Content plan" heading and first rows.
  {
    key: "contentStrategy",
    image: contentStrategyImage,
    position: "object-[50%_35%]",
  },
  { key: "growth", image: growthImage, position: "object-[60%_55%]" },
] as const satisfies readonly {
  key: string;
  image: StaticImageData;
  position?: string;
}[];

type Point = (typeof points)[number];

const DEFAULT_POINT = points[0].key;

const mediaClassName = "h-55 w-full shrink-0 md:h-65 lg:h-80";

function PointMedia({ point }: { point: Point }) {
  return (
    <Image
      {...revealItem("right")}
      src={point.image}
      alt=""
      placeholder="blur"
      // Panel width: 480 on desktop, about half the viewport on tablet, the container
      // (20 px gutters) on mobile.
      sizes="(min-width: 1024px) 480px, (min-width: 768px) 50vw, calc(100vw - 40px)"
      className={cn(
        mediaClassName,
        "rounded-lg object-cover shadow-card",
        "position" in point && point.position,
      )}
    />
  );
}

/* Mobile accordion: the red 3 × 22 bar beside the open point (Figma "Active Accent",
   192:2) grows from its centre as the point opens. Tablet and desktop: ApproachTabs. */
function ActiveAccent() {
  return (
    <span
      aria-hidden
      className="hidden h-5.5 w-0.75 shrink-0 rounded-[2px] bg-action-primary group-data-[state=open]/accordion-trigger:block motion-safe:animate-accent-in"
    />
  );
}

export async function ServicesApproach() {
  const t = await getTranslations("Services.approach");
  const common = await getTranslations("Common");

  const header = (
    <div className="flex flex-col gap-lg md:col-start-1 md:gap-lg">
      <p {...revealItem()} className="text-overline text-action-secondary">
        {t("eyebrow")}
      </p>
      <h2
        {...revealItem()}
        id="approach-title"
        className="text-h2 font-bold tracking-[-0.005em] text-text-primary"
      >
        {t("title")}
      </h2>
      <p {...revealItem()} className="text-body text-text-muted">
        {t("body")}
      </p>
    </div>
  );

  const panels = points.map((point) => (
    <Fragment key={point.key}>
      <PointMedia point={point} />
      <h3 {...revealItem("right")} className="text-h3 text-text-primary">
        {t(`points.${point.key}.title`)}
      </h3>
      <p {...revealItem("right")} className="text-body text-text-muted">
        {t(`points.${point.key}.body`)}
      </p>
      <BookingButton {...revealItem("right")}>
        {common("bookConsultation")}
      </BookingButton>
    </Fragment>
  ));

  return (
    <section
      aria-labelledby="approach-title"
      className="overflow-x-clip bg-bg-surface py-(--section-y) lg:py-2xl"
    >
      <RevealGroup contents>
        <ApproachTabs
          labelledBy="approach-title"
          points={points.map(({ key }) => ({
            key,
            title: t(`points.${key}.title`),
          }))}
          header={header}
          panels={panels}
          className="container-page flex-col gap-lg md:grid md:grid-cols-[--spacing(75)_minmax(0,1fr)] md:grid-rows-[auto_1fr] md:gap-x-10 md:gap-y-7 lg:grid-cols-[--spacing(119.5)_--spacing(120)] lg:gap-x-20 lg:gap-y-xl"
        >
          {/* Mobile */}
          <Accordion
            type="single"
            collapsible
            defaultValue={DEFAULT_POINT}
            className="md:hidden"
          >
            {points.map((point) => (
              <AccordionItem key={point.key} value={point.key}>
                <AccordionTrigger className="text-h4 text-text-muted data-[state=open]:font-semibold data-[state=open]:text-text-primary">
                  <span className="flex items-center gap-2.5">
                    <ActiveAccent />
                    {t(`points.${point.key}.title`)}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="flex flex-col gap-md pt-1 pb-7">
                  <PointMedia point={point} />
                  <p className="text-body text-text-muted">
                    {t(`points.${point.key}.body`)}
                  </p>
                  <BookingButton className="w-full">
                    {common("bookConsultation")}
                  </BookingButton>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </ApproachTabs>
      </RevealGroup>
    </section>
  );
}
