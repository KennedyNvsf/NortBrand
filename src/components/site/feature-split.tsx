import type { ReactNode } from "react";

import { Reveal } from "@/components/motion/reveal";
import { CheckList } from "@/components/site/check-list";
import { MarkPanel } from "@/components/site/mark-panel";
import { SectionHeader } from "@/components/site/section-header";
import { cn } from "@/lib/utils";

/*
 * Image panel + editorial copy (Figma Home "Brand Importance" 71:84 and "Philosophy"
 * 97:84). The two are mirror images, so one component with `panel="start" | "end"`.
 * - Mobile: copy first, panel below (224 tall). Tablet: side by side, panel 280 wide.
 *   Desktop: 48 px apart, centred; the panel size differs per section (panelClassName).
 * - `align="end"` right-aligns the copy on desktop only, as in Brand Importance.
 * - Panel and copy reveal on scroll, 60 ms apart (Motion Spec › Global).
 */
type FeatureSplitProps = {
  id: string;
  eyebrow: string;
  title: ReactNode;
  body: string;
  points: string[];
  panel: "start" | "end";
  align?: "start" | "end";
  panelClassName?: string;
};

export function FeatureSplit({
  id,
  eyebrow,
  title,
  body,
  points,
  panel,
  align = "start",
  panelClassName,
}: FeatureSplitProps) {
  return (
    <section
      aria-labelledby={id}
      className="bg-bg-surface py-18 md:py-22 lg:py-2xl"
    >
      <div
        className={cn(
          "container-page flex flex-col gap-9 md:flex-row md:items-stretch md:gap-10 lg:items-center lg:justify-center lg:gap-2xl",
          panel === "end" && "md:flex-row-reverse",
        )}
      >
        <Reveal
          className={cn(
            "order-last flex md:order-none md:w-70 md:shrink-0",
            panelClassName,
          )}
        >
          <MarkPanel className="h-56 w-full md:h-auto" />
        </Reveal>
        <Reveal
          index={1}
          className={cn(
            "flex flex-col gap-md md:flex-1 lg:w-115 lg:flex-none",
            align === "end" && "lg:items-end lg:text-right",
          )}
        >
          <SectionHeader
            id={id}
            eyebrow={eyebrow}
            title={title}
            align={align}
          />
          <p className="text-body text-text-muted">{body}</p>
          <CheckList items={points} className="mt-sm" />
        </Reveal>
      </div>
    </section>
  );
}
