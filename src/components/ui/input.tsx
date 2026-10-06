import * as React from "react";

import { cn } from "@/lib/utils";

/*
 * Figma: 02 Components › Input (41:30). State: Default / Hover (code rule) / Focus /
 * Error / Disabled.
 * - Field 48 on touch breakpoints, 38 on desktop (Figma field height).
 * - Hover: darker border (neutral/500). Focus: 1.5px red border plus a 4px red halo at
 *   35%, drawn as an outline (real geometry, never a shadow).
 * - Error: set aria-invalid; 1.5px red border. Pair it with an icon + text message in
 *   red/600 (`text-text-error`), linked through aria-describedby.
 */
const fieldClassName = cn(
  "w-full min-w-0 rounded-sm border border-border-default bg-bg-surface px-md text-body text-text-primary",
  "placeholder:text-text-muted",
  "transition-[border-color,outline-color] duration-(--duration-fast) ease-standard",
  "hover:border-border-strong",
  "focus-visible:border-[1.5px] focus-visible:border-action-primary focus-visible:outline-4 focus-visible:outline-offset-[1.5px] focus-visible:outline-action-primary/35",
  "aria-invalid:border-[1.5px] aria-invalid:border-action-primary",
  "disabled:cursor-not-allowed disabled:bg-bg-primary disabled:text-text-disabled disabled:placeholder:text-text-disabled disabled:hover:border-border-default",
);

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(fieldClassName, "h-12 py-sm lg:h-[38px]", className)}
      {...props}
    />
  );
}

export { Input, fieldClassName };
