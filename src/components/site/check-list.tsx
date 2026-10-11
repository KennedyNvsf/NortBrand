import { Check } from "lucide-react";

import { revealItem } from "@/components/motion/reveal-item";
import { ICON_STROKE } from "@/lib/icons";
import { cn } from "@/lib/utils";

/*
 * Figma "Labels": red check + Medium 15 text, 16 px apart (Home 71:94, 97:92).
 * `textClassName` replaces the label type role where Figma uses another size (the
 * Services details "What's included" list is Medium 16).
 * `reveal`: each point is a reveal item, so inside a RevealGroup they arrive one by one.
 */
export function CheckList({
  items,
  className,
  textClassName = "text-nav",
  reveal = false,
}: {
  items: string[];
  className?: string;
  textClassName?: string;
  reveal?: boolean;
}) {
  return (
    <ul className={cn("flex flex-col gap-md", className)}>
      {items.map((item) => (
        <li
          key={item}
          {...(reveal && revealItem())}
          className="flex items-start gap-2.5 text-left"
        >
          <Check
            className="size-6 shrink-0 text-action-primary"
            strokeWidth={ICON_STROKE}
            aria-hidden
          />
          <span className={cn("pt-0.5 text-text-primary", textClassName)}>
            {item}
          </span>
        </li>
      ))}
    </ul>
  );
}
