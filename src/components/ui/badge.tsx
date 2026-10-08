import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

/*
 * Figma: 02 Components › Badge (41:19). Style: Neutral / Accent / Selected.
 * - Accent text uses red/600 (`text-text-accent`), not red/500: small red text on the
 *   red/50 fill needs the accessibility override to pass contrast.
 * - Selected is the active filter chip (dark fill). As a filter chip the blog renders it
 *   through `asChild` as a toggle button with aria-pressed (Handoff › Components).
 */
const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center rounded-sm px-sm py-xs text-caption font-medium whitespace-nowrap",
  {
    variants: {
      variant: {
        neutral: "bg-border-default text-text-primary",
        accent: "bg-action-primary-subtle text-text-accent",
        selected: "bg-text-primary text-text-on-accent",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

type BadgeProps = React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & {
    /** Render the single child element (e.g. a filter-chip button) with badge styles. */
    asChild?: boolean;
  };

function Badge({ className, variant, asChild = false, ...props }: BadgeProps) {
  const Comp = asChild ? Slot.Root : "span";
  return (
    <Comp
      data-slot="badge"
      data-variant={variant ?? "neutral"}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants, type BadgeProps };
