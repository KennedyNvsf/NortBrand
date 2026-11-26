import type { ReactNode } from "react";

import { LogoMark } from "@/components/site/logo";
import { cn } from "@/lib/utils";

/*
 * The dark half of the sign-in card (Figma CP-01 516:51, TM-14; mobile CP-M01 554:316,
 * tablet CP-T01 558:1046). One component at every width:
 * - Mobile: a full-width header above the form: squiggle, eyebrow, headline.
 * - Tablet: the same stack as the card's header.
 * - Desktop: the card's right half: eyebrow at the top, squiggle, headline and body in
 *   the middle, the mini stage tracker at the bottom.
 * Everything here is presentational: the headline is a <p> (the form owns the page's
 * H1), and the tracker is decorative and static (14 Portal — Motion: the brand panel's
 * tracker never animates on its own; the login hand-off is the overview's job).
 */

type BrandPanelProps = {
  eyebrow: string;
  title: ReactNode;
  body: string;
  /** Stage names for the mini tracker, Discovery → Support. */
  stages: readonly string[];
  /** The stage shown as current in the illustration. */
  currentStage?: number;
  className?: string;
};

export function BrandPanel({
  eyebrow,
  title,
  body,
  stages,
  currentStage = 2,
  className,
}: BrandPanelProps) {
  return (
    <div
      data-surface="dark"
      className={cn(
        "flex flex-col gap-3.5 bg-text-primary px-5 pt-10 pb-7 md:px-8 md:pt-9 md:pb-8 lg:justify-between lg:gap-10 lg:p-12",
        className,
      )}
    >
      <p className="order-2 text-overline text-text-disabled lg:order-first lg:text-[13px]">
        {eyebrow}
      </p>
      <div className="contents lg:flex lg:flex-col lg:gap-md">
        <LogoMark className="order-1 h-[52.8px] w-[66px] lg:h-[76.8px] lg:w-24" />
        {/* Figma: Bold 30 / 36, line height 1.08, tracking -1.5%. */}
        <p className="order-3 text-[30px] leading-[1.08] font-bold tracking-[-0.015em] text-text-on-accent lg:text-[36px]">
          {title}
        </p>
        <p className="order-4 hidden text-body text-border-default lg:block">
          {body}
        </p>
      </div>
      <StageTracker
        stages={stages}
        current={currentStage}
        className="hidden lg:block"
      />
    </div>
  );
}

/*
 * The mini timeline (516:58): done stages white (lead, 2026-11-14: Figma's green reads
 * poorly on the dark panel), the current one red, the rest outlined.
 */
function StageTracker({
  stages,
  current,
  className,
}: {
  stages: readonly string[];
  current: number;
  className?: string;
}) {
  const last = Math.max(stages.length - 1, 1);
  return (
    <div aria-hidden className={cn("relative h-11 w-full", className)}>
      <span className="absolute top-[5px] right-[28px] left-[28px] h-0.5 bg-text-muted" />
      <span
        className="absolute top-[5px] left-[28px] h-0.5 bg-text-on-accent"
        style={{ width: `calc((100% - 56px) * ${String(current / last)})` }}
      />
      <ol className="relative flex justify-between">
        {stages.map((stage, index) => (
          <li key={stage} className="flex w-14 flex-col items-center gap-2.5">
            <span
              className={cn(
                "size-3 rounded-full border-2",
                index < current && "border-text-on-accent bg-text-on-accent",
                index === current && "border-action-primary bg-action-primary",
                index > current && "border-text-disabled bg-text-primary",
              )}
            />
            <span
              className={cn(
                "text-[11px] leading-none font-medium whitespace-nowrap",
                index === current
                  ? "text-text-on-accent"
                  : "text-text-disabled",
              )}
            >
              {stage}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
