import Image, { type StaticImageData } from "next/image";
import { getTranslations } from "next-intl/server";

import { MarkPanel } from "@/components/site/mark-panel";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BOOKING_HREF } from "@/content/navigation";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import brandIdentityImage from "@/assets/images/approach-brand-identity.jpg";

/*
 * Figma Services › Talking Points (desktop 189:30, tablet 359:285, mobile 359:573).
 * - Tablet and desktop: a vertical tab list on the left, the selected point on the
 *   right (Radix Tabs: arrow keys move between points).
 * - Mobile: shadcn Accordion, type single, collapsible, first point open (Handoff).
 * Both live in one Tabs root so the section heading renders once; CSS shows the list +
 * panel from md and the accordion below it. Server component: Tabs and Accordion are
 * the client boundary, and they keep their own open state.
 * Figma designs only the Brand Identity point. The other three use draft copy and the
 * logomark placeholder until imagery and final copy arrive (docs/tech-debt.md).
 */

const points = [
  { key: "brandIdentity", image: brandIdentityImage },
  { key: "visualDesign" },
  { key: "contentStrategy" },
  { key: "growth" },
] as const satisfies readonly { key: string; image?: StaticImageData }[];

type Point = (typeof points)[number];

const DEFAULT_POINT = points[0].key;

const mediaClassName = "h-55 w-full shrink-0 md:h-65 lg:h-80";

function PointMedia({ point }: { point: Point }) {
  if (!("image" in point)) {
    return <MarkPanel className={cn(mediaClassName, "shadow-card")} />;
  }
  return (
    <Image
      src={point.image}
      alt=""
      placeholder="blur"
      sizes="(min-width: 1024px) 480px, (min-width: 768px) 50vw, 100vw"
      className={cn(mediaClassName, "rounded-lg object-cover shadow-card")}
    />
  );
}

/* Red 3 × 22 bar beside the selected point (Figma "Active Accent", 192:2). */
function ActiveAccent({ group }: { group: "tab" | "accordion" }) {
  return (
    <span
      aria-hidden
      className={cn(
        "hidden h-5.5 w-0.75 shrink-0 rounded-[2px] bg-action-primary",
        group === "tab"
          ? "group-data-[state=active]/tab:block"
          : "group-data-[state=open]/accordion-trigger:block",
      )}
    />
  );
}

export async function ServicesApproach() {
  const t = await getTranslations("Services.approach");
  const common = await getTranslations("Common");

  const bookButton = (className?: string) => (
    <Button asChild showIcon className={className}>
      <Link href={BOOKING_HREF}>{common("bookConsultation")}</Link>
    </Button>
  );

  return (
    <section
      aria-labelledby="approach-title"
      className="bg-bg-surface py-(--section-y) lg:py-2xl"
    >
      <Tabs
        defaultValue={DEFAULT_POINT}
        orientation="vertical"
        className="container-page flex-col gap-lg md:grid md:grid-cols-[--spacing(75)_minmax(0,1fr)] md:grid-rows-[auto_1fr] md:gap-x-10 md:gap-y-7 lg:grid-cols-[--spacing(119.5)_--spacing(120)] lg:gap-x-20 lg:gap-y-xl"
      >
        <div className="flex flex-col gap-lg md:col-start-1 md:gap-lg">
          <p className="text-overline text-action-secondary">{t("eyebrow")}</p>
          <h2
            id="approach-title"
            className="text-h2 font-bold tracking-[-0.005em] text-text-primary"
          >
            {t("title")}
          </h2>
          <p className="text-body text-text-muted">{t("body")}</p>
        </div>

        {/* Tablet and desktop */}
        <TabsList
          aria-labelledby="approach-title"
          className="hidden flex-col md:col-start-1 md:row-start-2 md:flex"
        >
          {points.map(({ key }) => (
            <TabsTrigger
              key={key}
              value={key}
              className="group/tab flex min-h-11 items-center gap-2.5 border-t border-border-default py-lg text-h4 text-text-muted transition-colors duration-(--duration-fast) ease-standard first:border-t-0 hover:text-text-primary data-[state=active]:pl-3.5 data-[state=active]:font-semibold data-[state=active]:text-text-primary"
            >
              <ActiveAccent group="tab" />
              {t(`points.${key}.title`)}
            </TabsTrigger>
          ))}
        </TabsList>
        {points.map((point) => (
          <TabsContent
            key={point.key}
            value={point.key}
            className="hidden flex-col items-start gap-5 md:col-start-2 md:row-span-2 md:row-start-1 md:data-[state=active]:flex lg:gap-lg"
          >
            <PointMedia point={point} />
            <h3 className="text-h3 text-text-primary">
              {t(`points.${point.key}.title`)}
            </h3>
            <p className="text-body text-text-muted">
              {t(`points.${point.key}.body`)}
            </p>
            {bookButton()}
          </TabsContent>
        ))}

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
                  <ActiveAccent group="accordion" />
                  {t(`points.${point.key}.title`)}
                </span>
              </AccordionTrigger>
              <AccordionContent className="flex flex-col gap-md pt-1 pb-7">
                <PointMedia point={point} />
                <p className="text-body text-text-muted">
                  {t(`points.${point.key}.body`)}
                </p>
                {bookButton("w-full")}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Tabs>
    </section>
  );
}
