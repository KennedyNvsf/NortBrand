"use client";

import { useState, type ComponentType, type ReactNode } from "react";
import { X } from "lucide-react";

import { CheckList } from "@/components/site/check-list";
import { MARK_PATH, MARK_VIEW_BOX } from "@/components/site/mark-panel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { BOOKING_HREF } from "@/content/navigation";
import { Link } from "@/i18n/navigation";
import { ICON_STROKE, icons, type IconName } from "@/lib/icons";
import { MEDIA_MD, useMediaQuery } from "@/lib/use-media-query";
import { cn } from "@/lib/utils";

/*
 * "More Details" for one service (Handoff: "shadcn Dialog on md and up, Drawer (bottom
 * sheet, drag to dismiss) on mobile"). The only client component on the Services page:
 * the server block passes in translated strings and the rich title.
 * - Figma: desktop modal 317:57 (dark visual panel + content), tablet dialog 362:383,
 *   mobile bottom sheet 362:325. Tablet and desktop share one DialogContent: the visual
 *   panel appears from lg, the small icon tile and "01 / 05" below it.
 * - One `open` state drives both containers, so crossing the md breakpoint while open
 *   swaps Dialog for Drawer instead of closing.
 * - Radix (Dialog) and vaul (built on Radix Dialog) trap focus, close on Esc and return
 *   focus to the trigger. Opening locks scroll, which also hides the StickyCta.
 */

export type ServiceDetailsProps = {
  icon: IconName;
  /** Service name, shown as the eyebrow. */
  name: string;
  /** "01 / 05" */
  position: string;
  /** Rich title with the green keyword. */
  title: ReactNode;
  details: string;
  included: string[];
  labels: {
    trigger: string;
    /** Trigger name including the service, so five "More Details" buttons differ. */
    triggerAriaLabel: string;
    included: string;
    book: string;
    close: string;
  };
};

type TextPart = ComponentType<{ className?: string; children: ReactNode }>;
type ClosePart = ComponentType<{ asChild: boolean; children: ReactNode }>;

export function ServiceDetails(props: ServiceDetailsProps) {
  const { labels } = props;
  const [open, setOpen] = useState(false);
  const isTabletUp = useMediaQuery(MEDIA_MD);

  const trigger = (
    <Button
      variant="secondary"
      showIcon
      aria-label={labels.triggerAriaLabel}
      className="w-full md:w-auto"
    >
      {labels.trigger}
    </Button>
  );

  if (isTabletUp) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent
          showCloseButton={false}
          className="gap-0 overflow-x-hidden p-0 lg:grid-cols-[340px_minmax(0,1fr)]"
        >
          <VisualPanel icon={props.icon} position={props.position} />
          <DetailsBody
            {...props}
            Title={DialogTitle}
            Description={DialogDescription}
            Close={DialogClose}
            className="gap-5 px-9 pt-8 pb-9 lg:gap-lg lg:py-10 lg:pr-10 lg:pl-11"
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>{trigger}</DrawerTrigger>
      <DrawerContent className="rounded-t-xl">
        <DetailsBody
          {...props}
          Title={DrawerTitle}
          Description={DrawerDescription}
          Close={DrawerClose}
          className="gap-5 overflow-y-auto px-5 pt-4 pb-8.5"
        />
      </DrawerContent>
    </Drawer>
  );
}

/* Desktop modal left panel (317:58): position, large icon tile, logomark watermark. */
function VisualPanel({ icon, position }: { icon: IconName; position: string }) {
  const Icon = icons[icon];
  return (
    <div
      data-surface="dark"
      className="relative hidden flex-col justify-between overflow-hidden bg-text-primary p-9 lg:flex"
    >
      <p className="text-overline text-text-on-accent/70">{position}</p>
      <span className="flex size-30 items-center justify-center rounded-lg border border-text-on-accent/18 bg-text-on-accent/8">
        <Icon
          className="size-15.5 text-icon-on-accent"
          strokeWidth={ICON_STROKE}
          aria-hidden
        />
      </span>
      {/* Keeps the tile centred between the position label and the panel bottom. */}
      <span aria-hidden className="size-px" />
      <svg
        viewBox={MARK_VIEW_BOX}
        fill="none"
        aria-hidden
        className="pointer-events-none absolute top-90 left-22.5 size-90 text-text-on-accent opacity-12"
      >
        <path
          d={MARK_PATH}
          stroke="currentColor"
          strokeWidth={13.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

function DetailsBody({
  icon,
  name,
  position,
  title,
  details,
  included,
  labels,
  Title,
  Description,
  Close,
  className,
}: ServiceDetailsProps & {
  Title: TextPart;
  Description: TextPart;
  Close: ClosePart;
  className?: string;
}) {
  const Icon = icons[icon];
  return (
    <div className={cn("flex min-w-0 flex-col", className)}>
      <div className="flex items-center justify-between gap-md">
        <div className="flex items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-text-primary lg:hidden">
            <Icon
              className="size-6 text-icon-on-accent"
              strokeWidth={ICON_STROKE}
              aria-hidden
            />
          </span>
          <div className="flex flex-col gap-0.5">
            <p className="text-overline text-action-secondary">{name}</p>
            <p className="text-caption text-text-muted lg:hidden">{position}</p>
          </div>
        </div>
        <Close asChild>
          <Button
            variant="ghost"
            size="icon"
            className="border border-border-default bg-bg-surface md:size-11 lg:size-10"
          >
            <X strokeWidth={ICON_STROKE} aria-hidden />
            <span className="sr-only">{labels.close}</span>
          </Button>
        </Close>
      </div>

      <Title className="pr-0 text-h2 font-bold tracking-[-0.01em] text-text-primary">
        {title}
      </Title>
      <Description className="text-body text-text-muted">{details}</Description>

      <div className="flex flex-col gap-3.5 pt-1 lg:gap-md lg:pt-1.5">
        <h3 className="text-overline text-text-accent">{labels.included}</h3>
        <CheckList items={included} textClassName="text-body font-medium" />
      </div>

      <div className="flex flex-col gap-3 pt-2 md:flex-row md:items-center lg:gap-md lg:border-t lg:border-border-default lg:pt-lg">
        <Button asChild showIcon className="w-full md:w-auto">
          <Link href={BOOKING_HREF}>{labels.book}</Link>
        </Button>
        <Close asChild>
          <Button variant="ghost" className="w-full md:w-auto">
            {labels.close}
          </Button>
        </Close>
      </div>
    </div>
  );
}
