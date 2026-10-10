import { Check } from "lucide-react";

import { ICON_STROKE } from "@/lib/icons";
import { cn } from "@/lib/utils";

/* Figma "Labels": red check + Medium 15 text, 16 px apart (Home 71:94, 97:92). */
export function CheckList({
  items,
  className,
}: {
  items: string[];
  className?: string;
}) {
  return (
    <ul className={cn("flex flex-col gap-md", className)}>
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2.5 text-left">
          <Check
            className="size-6 shrink-0 text-action-primary"
            strokeWidth={ICON_STROKE}
            aria-hidden
          />
          <span className="pt-0.5 text-nav text-text-primary">{item}</span>
        </li>
      ))}
    </ul>
  );
}
