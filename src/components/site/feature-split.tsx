import type { StaticImageData } from "next/image";
import type { ReactNode } from "react";

import { RevealGroup } from "@/components/motion/reveal-group";
import { revealItem } from "@/components/motion/reveal-item";
import { CheckList } from "@/components/site/check-list";
import { MarkPanel } from "@/components/site/mark-panel";
import { PhotoPanel } from "@/components/site/photo-panel";
import { SectionHeader } from "@/components/site/section-header";
import { cn } from "@/lib/utils";

/*
 * Image panel + editorial copy (Figma Home "Brand Importance" 71:84 and "Philosophy"
 * 97:84). The two are mirror images, so one component with `panel="start" | "end"`.
 * - Mobile: copy first, panel below (224 tall). Tablet: side by side, panel 280 wide.
 *   Desktop: 48 px apart, centred; the panel size differs per section (panelClassName).
 * - `align="end"` right-aligns the copy on desktop only, as in Brand Importance.
 * - On scroll the panel slides in from its own side and its mark draws, then the
 *   eyebrow, title, body and each point follow, 100 ms apart (RevealGroup). The section
 *   clips horizontally so the slide never adds a scrollbar.
 * - `image`: a photograph replaces the placeholder panel (#82). It settles (zooms out)
 *   as the panel arrives, where the mark used to draw, and drifts on desktop.
 *   `imageClassName` keeps the subject in frame when the panel crops. On mobile a photo
 *   panel is 4:3, not the placeholder's 224 px: a group photo needs the height (lead's
 *   decision, 2026-11-08).
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
  /** A photograph instead of the MarkPanel placeholder; `sizes` is the panel's width. */
  image?: { src: StaticImageData; sizes: string; imageClassName?: string };
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
  image,
}: FeatureSplitProps) {
  return (
    <section
      aria-labelledby={id}
      className="overflow-x-clip bg-bg-surface py-18 md:py-22 lg:py-2xl"
    >
      <RevealGroup
        className={cn(
          "container-page flex flex-col gap-9 md:flex-row md:items-stretch md:gap-10 lg:items-center lg:justify-center lg:gap-2xl",
          panel === "end" && "md:flex-row-reverse",
        )}
      >
        <div
          {...revealItem(panel === "start" ? "left" : "right")}
          className={cn(
            "order-last flex md:order-none md:w-70 md:shrink-0",
            panelClassName,
          )}
        >
          {image ? (
            <PhotoPanel
              src={image.src}
              sizes={image.sizes}
              imageClassName={image.imageClassName}
              parallax
              settle
              className="aspect-[4/3] w-full md:aspect-auto md:h-auto"
            />
          ) : (
            <MarkPanel draw parallax className="h-56 w-full md:h-auto" />
          )}
        </div>
        <div
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
          <p {...revealItem()} className="text-body text-text-muted">
            {body}
          </p>
          <CheckList items={points} reveal className="mt-sm" />
        </div>
      </RevealGroup>
    </section>
  );
}
