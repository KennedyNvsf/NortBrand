"use client";

import * as React from "react";
import { m, useReducedMotion } from "motion/react";
import { Switch as SwitchPrimitive } from "radix-ui";

import { motionTokens } from "@/lib/motion";
import { cn } from "@/lib/utils";

/*
 * Figma: 02 Components › Toggle (325:26). State: Off / On / Locked.
 * - Off: white track, 1.5 px text/muted border, 14 px text/muted knob on the left.
 * - On: text/primary track, 20 px white knob on the right.
 * - Locked (always on, e.g. essential cookies): On at 45% opacity, not operable.
 * - Motion Spec › System › Toggle: "The knob travels on a spring (snappy) while the
 *   track crossfades." Reduced motion: no travel animation, colours fade in 150 ms.
 * - 44 × 26 drawn; the hit area grows to 44 × 44 for touch (CLAUDE.md, 44 pt targets).
 * Radix gives it role="switch", aria-checked and Space/Enter.
 */
function Switch({
  className,
  checked,
  locked = false,
  ...props
}: Omit<React.ComponentProps<typeof SwitchPrimitive.Root>, "checked"> & {
  checked: boolean;
  /** Always on and not operable (Figma State=Locked). */
  locked?: boolean;
}) {
  const reduced = useReducedMotion() ?? false;
  const on = checked || locked;

  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      checked={on}
      disabled={locked || props.disabled}
      className={cn(
        "relative inline-flex h-6.5 w-11 shrink-0 cursor-pointer items-center rounded-full border-[1.5px]",
        "transition-[background-color,border-color] duration-(--duration-fast) ease-standard",
        "before:absolute before:inset-x-0 before:-inset-y-2.25 before:content-['']",
        "data-[state=unchecked]:border-text-muted data-[state=unchecked]:bg-bg-surface",
        "data-[state=checked]:border-text-primary data-[state=checked]:bg-text-primary",
        "disabled:cursor-not-allowed",
        locked && "opacity-45",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb asChild>
        <m.span
          aria-hidden
          // A 20 px knob, scaled to 14 px when off: transform only (Motion Spec). Its
          // centre sits 13 px (off) or 31 px (on) from the track's outer left edge.
          className={cn(
            "absolute top-1/2 left-0 block size-5 -translate-y-1/2 rounded-full",
            "transition-colors duration-(--duration-fast) ease-standard",
            on ? "bg-text-on-accent" : "bg-text-muted",
          )}
          initial={false}
          animate={{ x: on ? 19.5 : 1.5, scale: on ? 1 : 0.7 }}
          transition={
            reduced ? { duration: 0 } : { ...motionTokens.spring.snappy }
          }
        />
      </SwitchPrimitive.Thumb>
    </SwitchPrimitive.Root>
  );
}

export { Switch };
