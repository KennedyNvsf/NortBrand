import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

/*
 * Figma: 02 Components › Button (38:42). Style: Primary / Secondary / Ghost.
 * State: Default / Hover / Pressed (code rule) / Focus / Disabled / Loading.
 * - Height 40 desktop, 44 tablet, 48 mobile (44pt minimum tap target).
 * - Press: scale 0.98, 100ms; hover 150ms; standard easing (10 — Motion Spec).
 * - Focus: global 2px outline with 2px offset (globals.css).
 * - Accessibility overrides: primary fill #DC2626; small red labels use red/600.
 * - Loading: spinner replaces the icon, aria-busy, not clickable, colors unchanged.
 */
const buttonVariants = cva(
  [
    "group/button relative inline-flex shrink-0 cursor-pointer items-center justify-center gap-sm whitespace-nowrap select-none",
    "text-label transition-[background-color,border-color,color,scale] duration-(--duration-fast) ease-standard",
    "motion-safe:active:scale-[0.98] motion-safe:active:duration-(--duration-instant)",
    "disabled:cursor-not-allowed aria-busy:cursor-progress aria-disabled:pointer-events-none",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-6",
  ],
  {
    variants: {
      variant: {
        primary: [
          "bg-action-primary-fill text-text-on-accent hover:bg-action-primary-hover",
          "disabled:not-aria-busy:bg-action-disabled-bg disabled:not-aria-busy:text-text-disabled",
        ],
        secondary: [
          "border-[1.5px] border-action-primary bg-bg-surface text-text-accent hover:bg-action-primary-subtle",
          "disabled:not-aria-busy:border-border-default disabled:not-aria-busy:bg-bg-surface disabled:not-aria-busy:text-text-disabled",
        ],
        ghost: [
          "bg-transparent text-text-primary hover:text-text-accent",
          "disabled:not-aria-busy:text-text-disabled",
        ],
      },
      size: {
        default: "h-12 rounded-md px-lg md:h-11 lg:h-10",
        icon: "size-12 rounded-full md:size-11 lg:size-10",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    /** Render the single child element (e.g. a Link) with button styles. */
    asChild?: boolean;
    /** Show a trailing icon. Defaults to Lucide ArrowRight (Figma "Show Icon"). */
    showIcon?: boolean;
    /** Replace the default trailing icon (Figma "Icon" instance swap). */
    icon?: React.ReactNode;
    /** Spinner replaces the icon; the button is busy and cannot be activated. */
    loading?: boolean;
  };

function Button({
  className,
  variant = "primary",
  size = "default",
  asChild = false,
  showIcon = false,
  icon,
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  const inactive = Boolean(disabled) || loading;

  const trailing = loading ? (
    <span className="flex size-6 items-center justify-center" aria-hidden>
      <LoaderCircle className="size-5 animate-spin" strokeWidth={1.75} />
    </span>
  ) : showIcon ? (
    (icon ?? <ArrowRight strokeWidth={1.75} aria-hidden />)
  ) : null;

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      // Native buttons use `disabled`; slotted elements (links) use aria-disabled.
      disabled={asChild ? undefined : inactive}
      aria-disabled={asChild && inactive ? true : undefined}
      aria-busy={loading || undefined}
      {...props}
    >
      {asChild ? <Slot.Slottable>{children}</Slot.Slottable> : children}
      {trailing}
    </Comp>
  );
}

export { Button, buttonVariants, type ButtonProps };
