"use client";

import * as React from "react";
import { Tabs as TabsPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

/*
 * shadcn Tabs on Radix (radix-ui is already a dependency). Unstyled beyond layout:
 * the only Figma tab pattern is the Services "Our approach" list, which styles its own
 * triggers. Radix handles roles, arrow-key navigation and roving focus.
 */

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex gap-sm", className)}
      {...props}
    />
  );
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn("flex", className)}
      {...props}
    />
  );
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn("cursor-pointer text-left", className)}
      {...props}
    />
  );
}

/*
 * Radix makes the panel a tab stop (tabindex 0), so the global :focus-visible ring
 * applies to it; no `outline-none` here (WCAG 2.4.7, #93). Mouse users focus the
 * trigger, not the panel, so they never see it.
 */
function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={className}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
