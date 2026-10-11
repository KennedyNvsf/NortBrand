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
 * - Trailing icon on hover/keyboard focus: the arrow nudges 2 px forward, or, with
 *   `hoverIcon`, morphs into that icon (see IconMorph).
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
    /** On hover and keyboard focus, the trailing icon morphs into this one. */
    hoverIcon?: React.ReactNode;
    /** Spinner replaces the icon; the button is busy and cannot be activated. */
    loading?: boolean;
  };

/*
 * The trailing icon's hover morph. Both icons share one 24 px cell: the resting icon
 * slides on (x 6 px), shrinks and blurs out quickly; the hover icon scales up from 0.5
 * out of a 2 px blur. Entering uses the 250 ms emphasized ease-out, leaving the 150 ms
 * exit curve, so the button answers the pointer at once and settles without lag.
 * Transform and blur are motion-safe; with reduced motion the icons only crossfade.
 * Hover only fires on devices that can hover (Tailwind v4), so touch never sticks.
 */
const morphOut =
  "transition-[opacity,translate,scale,filter] duration-(--duration-fast) ease-exit group-hover/button:duration-(--duration-base) group-hover/button:ease-emphasized group-hover/button:opacity-0 group-focus-visible/button:opacity-0 motion-safe:group-hover/button:translate-x-1.5 motion-safe:group-hover/button:scale-75 motion-safe:group-hover/button:blur-[2px] motion-safe:group-focus-visible/button:translate-x-1.5 motion-safe:group-focus-visible/button:scale-75";
const morphIn =
  "opacity-0 transition-[opacity,scale,filter] duration-(--duration-fast) ease-exit group-hover/button:duration-(--duration-base) group-hover/button:ease-emphasized group-hover/button:opacity-100 group-focus-visible/button:opacity-100 motion-safe:scale-50 motion-safe:blur-[2px] motion-safe:group-hover/button:scale-100 motion-safe:group-hover/button:blur-none motion-safe:group-focus-visible/button:scale-100 motion-safe:group-focus-visible/button:blur-none";

function IconMorph({
  icon,
  hoverIcon,
}: {
  icon: React.ReactNode;
  hoverIcon: React.ReactNode;
}) {
  return (
    <span aria-hidden className="grid size-6 place-items-center">
      <span className={cn("col-start-1 row-start-1 flex", morphOut)}>
        {icon}
      </span>
      <span className={cn("col-start-1 row-start-1 flex", morphIn)}>
        {hoverIcon}
      </span>
    </span>
  );
}

function Button({
  className,
  variant = "primary",
  size = "default",
  asChild = false,
  showIcon = false,
  icon,
  hoverIcon,
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  const inactive = Boolean(disabled) || loading;
  const arrow = <ArrowRight strokeWidth={1.75} aria-hidden />;

  const trailing = loading ? (
    <span className="flex size-6 items-center justify-center" aria-hidden>
      <LoaderCircle className="size-5 animate-spin" strokeWidth={1.75} />
    </span>
  ) : showIcon ? (
    hoverIcon ? (
      <IconMorph icon={icon ?? arrow} hoverIcon={hoverIcon} />
    ) : (
      <span
        aria-hidden
        className="flex transition-[translate] duration-(--duration-fast) ease-standard motion-safe:group-hover/button:translate-x-0.5"
      >
        {icon ?? arrow}
      </span>
    )
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
