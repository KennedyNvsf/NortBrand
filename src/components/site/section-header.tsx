import type { ReactNode } from "react";

import { revealItem } from "@/components/motion/reveal-item";
import { cn } from "@/lib/utils";

/*
 * The eyebrow + heading pair that opens most sections (Figma: "WHAT WE DO" / "HOW IT
 * WORKS" / "WHY IT MATTERS"). The eyebrow is a styled paragraph, never a heading
 * (Handoff: "Eyebrows are not headings"); its uppercase comes from text-overline, so the
 * message stays in sentence case for translators.
 * Eyebrow and heading are reveal items: inside a RevealGroup they rise in one after the
 * other; anywhere else the markers do nothing.
 */
type SectionHeaderProps = {
  id: string;
  eyebrow: string;
  title: ReactNode;
  align?: "start" | "center" | "end";
  /** `center` and `end` apply from desktop; below it headers are left-aligned (Figma). */
  /** Heading weight: Figma uses bold for editorial headlines, semibold for lists. */
  weight?: "bold" | "semibold";
  className?: string;
};

export function SectionHeader({
  id,
  eyebrow,
  title,
  align = "start",
  weight = "bold",
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-sm",
        align === "center" && "lg:items-center lg:text-center",
        align === "end" && "lg:items-end lg:text-right",
        className,
      )}
    >
      <p {...revealItem()} className="text-overline text-action-secondary">
        {eyebrow}
      </p>
      <h2
        {...revealItem()}
        id={id}
        className={cn(
          "text-h2 text-text-primary",
          weight === "bold" ? "font-bold" : "font-semibold",
        )}
      >
        {title}
      </h2>
    </div>
  );
}
