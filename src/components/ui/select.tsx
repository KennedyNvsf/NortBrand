"use client";

import * as React from "react";
import { Check, ChevronDown } from "lucide-react";
import { Select as SelectPrimitive } from "radix-ui";

import { fieldClassName } from "@/components/ui/input";
import { ICON_STROKE } from "@/lib/icons";
import { cn } from "@/lib/utils";

/*
 * Figma: 02 Components › Select (407:218). State: Default / Focus / Error / Disabled,
 * sharing the Input field rules (height, border, focus halo, aria-invalid error).
 * - Placeholder text is muted; the chevron is Lucide chevron-down.
 * - The open list is not designed in Figma. It uses the surface, border, radius/sm and
 *   shadow/card tokens, with the highlighted option on red/50, and keeps 44 pt rows on
 *   touch.
 * - Built on Radix Select: keyboard navigation, typeahead and focus return come from
 *   the primitive. Works with a hidden native <select> for form submission.
 */

function Select(props: React.ComponentProps<typeof SelectPrimitive.Root>) {
  return <SelectPrimitive.Root data-slot="select" {...props} />;
}

function SelectValue(
  props: React.ComponentProps<typeof SelectPrimitive.Value>,
) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />;
}

function SelectTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      className={cn(
        fieldClassName,
        "flex h-12 cursor-pointer items-center justify-between gap-sm py-sm text-left lg:h-[38px]",
        "data-placeholder:text-text-muted disabled:data-placeholder:text-text-disabled",
        "[&>span]:truncate",
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown
          className="size-6 shrink-0 text-icon-default in-disabled:text-text-disabled"
          strokeWidth={ICON_STROKE}
          aria-hidden
        />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

function SelectContent({
  className,
  children,
  position = "popper",
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        position={position}
        className={cn(
          "relative z-50 max-h-(--radix-select-content-available-height) min-w-(--radix-select-trigger-width) overflow-x-hidden overflow-y-auto",
          "rounded-sm border border-border-default bg-bg-surface p-xs text-text-primary shadow-card",
          "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0",
          "duration-(--duration-fast)",
          position === "popper" &&
            "data-[side=bottom]:translate-y-xs data-[side=top]:-translate-y-xs",
          className,
        )}
        {...props}
      >
        <SelectPrimitive.Viewport>{children}</SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "relative flex min-h-11 w-full cursor-pointer items-center gap-sm rounded-sm py-sm pr-10 pl-md text-body outline-none select-none lg:min-h-9",
        "data-highlighted:bg-action-primary-subtle data-disabled:pointer-events-none data-disabled:text-text-disabled",
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <span className="absolute right-sm flex size-6 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Check
            className="size-5 text-text-accent"
            strokeWidth={ICON_STROKE}
            aria-hidden
          />
        </SelectPrimitive.ItemIndicator>
      </span>
    </SelectPrimitive.Item>
  );
}

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue };
