"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { Accordion as AccordionPrimitive } from "radix-ui";

import { ICON_STROKE } from "@/lib/icons";
import { cn } from "@/lib/utils";

/*
 * shadcn Accordion on Radix (Handoff: "FAQ · Talking Points (mobile): shadcn Accordion,
 * type=single, collapsible"). Items are separated by a hairline; the chevron turns up
 * when open (Figma 359:726). Opening uses the tw-animate accordion keyframes at
 * --duration-base; reduced motion shortens them to a 150 ms fade (globals.css).
 */

function Accordion(
  props: React.ComponentProps<typeof AccordionPrimitive.Root>,
) {
  return <AccordionPrimitive.Root data-slot="accordion" {...props} />;
}

function AccordionItem({
  className,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Item>) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn(
        "border-t border-border-default first:border-t-0",
        className,
      )}
      {...props}
    />
  );
}

function AccordionTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          "group/accordion-trigger flex min-h-11 flex-1 cursor-pointer items-center justify-between gap-md py-lg text-left",
          className,
        )}
        {...props}
      >
        {children}
        <ChevronDown
          className="size-6 shrink-0 text-icon-default transition-transform duration-(--duration-base) ease-standard group-data-[state=open]/accordion-trigger:rotate-180"
          strokeWidth={ICON_STROKE}
          aria-hidden
        />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

function AccordionContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content
      data-slot="accordion-content"
      className="overflow-hidden data-open:animate-accordion-down data-open:duration-(--duration-base) data-closed:animate-accordion-up data-closed:duration-(--duration-fast)"
      {...props}
    >
      <div className={className}>{children}</div>
    </AccordionPrimitive.Content>
  );
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
