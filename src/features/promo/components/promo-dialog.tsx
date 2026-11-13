"use client";

import type { ComponentType, ReactNode } from "react";
import { X } from "lucide-react";

import { BookingButton } from "@/components/site/booking-button";
import { MARK_PATH, MARK_VIEW_BOX } from "@/components/site/mark-panel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";
import { ICON_STROKE } from "@/lib/icons";
import { MEDIA_MD, useMediaQuery } from "@/lib/use-media-query";
import { cn } from "@/lib/utils";

import type { PromoCopy } from "./promo-copy";

/*
 * The Home promo (Figma 02 Components › Promo Modal 510:732, #126). Loaded in its own
 * chunk by PromoLauncher, which owns `open` and the analytics.
 * - Tablet and desktop: a centred Dialog with two panels, the dark offer panel (224 px
 *   on tablet 510:730, 320 px on desktop 510:729) and the content. Mobile: a bottom
 *   sheet (Drawer, 510:731) with the offer as a dark band. One `open` state drives both,
 *   so crossing 768 px while open swaps the container instead of closing it.
 * - Radix and vaul trap focus, close on Esc and the backdrop, lock scroll (which also
 *   hides the StickyCta) and return focus on close. Nothing opened the promo, so focus
 *   goes back to the body.
 * - On open, focus goes to the dialog itself (focusDialog), not the close button: the
 *   visitor didn't ask for this dialog, and a focus ring on Close as it appears reads as
 *   a highlighted action. The dialog's name and description are still announced, and
 *   Tab moves into it as usual.
 * - Motion: data-motion="promo" (globals.css, Motion Spec › PROMO).
 */

type PromoDialogProps = {
  copy: PromoCopy;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** "Book a Consultation" was pressed: counted and remembered before navigating. */
  onBook: () => void;
};

/** Radix's open auto-focus, redirected to the dialog container (its tabIndex is -1). */
function focusDialog(event: Event) {
  event.preventDefault();
  if (event.currentTarget instanceof HTMLElement) event.currentTarget.focus();
}

type TextPart = ComponentType<{
  id?: string;
  className?: string;
  children: ReactNode;
}>;
type ClosePart = ComponentType<{ asChild: boolean; children: ReactNode }>;

export function PromoDialog({
  copy,
  open,
  onOpenChange,
  onBook,
}: PromoDialogProps) {
  const isTabletUp = useMediaQuery(MEDIA_MD);

  if (isTabletUp) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          data-motion="promo"
          onOpenAutoFocus={focusDialog}
          showCloseButton={false}
          overlayProps={{
            className: "data-closed:duration-(--duration-base-exit)",
          }}
          className="gap-0 overflow-x-hidden p-0 md:max-w-[680px] md:grid-cols-[224px_minmax(0,1fr)] lg:max-w-[880px] lg:grid-cols-[320px_minmax(0,1fr)] data-closed:duration-(--duration-base-exit)"
        >
          <OfferPanel copy={copy} />
          <PromoBody
            copy={copy}
            onBook={onBook}
            Title={DialogTitle}
            Description={DialogDescription}
            Close={DialogClose}
            className="gap-5 py-8 pr-8 pl-9 lg:gap-lg lg:py-10 lg:pr-10 lg:pl-11"
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        data-motion="promo"
        onOpenAutoFocus={focusDialog}
        overlayProps={{ "data-motion": "promo" }}
        className="rounded-t-xl outline-none"
      >
        <PromoBody
          copy={copy}
          onBook={onBook}
          Title={DrawerTitle}
          Description={DrawerDescription}
          Close={DrawerClose}
          className="gap-5 overflow-y-auto px-5 pt-4 pb-8"
        />
      </DrawerContent>
    </Drawer>
  );
}

/*
 * The dark offer panel (510:637 / 510:685): the end date at the top, the big figure
 * and its label at the bottom, and the logomark watermark. The watermark is the
 * mark-panel path (Figma's 360 px watermark is the same mark at stroke 22.15 / 360,
 * which is 13.6 on its 221 viewBox), white at 12%, static: it carries no meaning, and
 * the dialog's own entrance is the only motion (Motion Spec › PROMO).
 * data-surface="dark" switches the focus ring to white; the panel holds no controls,
 * but keeps the convention.
 */
function OfferPanel({ copy }: { copy: PromoCopy }) {
  return (
    <div
      data-surface="dark"
      className="relative flex flex-col justify-between overflow-hidden bg-text-primary p-7 lg:p-9"
    >
      <svg
        viewBox={MARK_VIEW_BOX}
        fill="none"
        aria-hidden
        className="pointer-events-none absolute top-53.75 left-2.5 size-90 text-text-on-accent opacity-12 lg:top-58.75 lg:left-27.5"
      >
        <path
          d={MARK_PATH}
          stroke="currentColor"
          strokeWidth={13.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <p className="relative text-overline text-text-on-dark-subtle lg:text-[13px]">
        {copy.until}
      </p>
      <p className="relative flex flex-col gap-1.5 text-text-on-accent">
        {/* Figma: Bold 84 / 120, line height 0.92, tracking -4%. */}
        <span className="text-[84px] leading-[0.92] font-bold tracking-[-0.04em] lg:text-[120px]">
          {copy.offer}
        </span>
        <span className="text-overline lg:text-[13px]">{copy.offerLabel}</span>
      </p>
      {/* Keeps the figure off the bottom edge, as the Figma spacer does. */}
      <span aria-hidden className="size-px" />
    </div>
  );
}

function PromoBody({
  copy,
  onBook,
  Title,
  Description,
  Close,
  className,
}: {
  copy: PromoCopy;
  onBook: () => void;
  Title: TextPart;
  Description: TextPart;
  Close: ClosePart;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col", className)}>
      <div className="flex items-center justify-between gap-md">
        <p className="text-overline text-action-secondary lg:text-[13px]">
          {copy.label}
        </p>
        <Close asChild>
          <Button
            variant="ghost"
            size="icon"
            className="border border-border-default bg-bg-surface md:size-11 lg:size-10"
          >
            <X strokeWidth={ICON_STROKE} aria-hidden />
            <span className="sr-only">{copy.close}</span>
          </Button>
        </Close>
      </div>

      {/* The mobile offer band (510:712) stands in for the dark panel below 768 px.
          Figma rounds it 12 px, which is no token: radius/md (10) is the nearest. */}
      <p
        data-surface="dark"
        className="flex items-center gap-3.5 rounded-md bg-text-primary px-5 py-3.5 text-text-on-accent md:hidden"
      >
        {/* Figma: Bold 56, line height 0.92, tracking -4%. */}
        <span className="text-[56px] leading-[0.92] font-bold tracking-[-0.04em]">
          {copy.offer}
        </span>
        <span className="flex flex-col gap-1 text-[12px] leading-normal font-medium tracking-[0.08em] uppercase">
          <span>{copy.offerLabel}</span>
          <span>{copy.until}</span>
        </span>
      </p>

      {/* Figma: Bold 30 / 34 / 44, line height 1.1, tracking -1%. */}
      <Title className="pr-0 text-[30px] leading-[1.1] font-bold tracking-[-0.01em] text-text-primary md:text-[34px] lg:text-[44px]">
        {copy.title}
      </Title>
      <Description className="text-body leading-[1.58] text-text-muted lg:text-[17px]">
        {copy.body}
      </Description>
      <p className="text-[13px] leading-[1.4] text-text-muted">{copy.terms}</p>

      <div className="flex flex-col gap-2 border-t border-border-default pt-1 md:flex-row md:items-center md:gap-md md:pt-2">
        <BookingButton className="w-full md:w-auto" onClick={onBook}>
          {copy.book}
        </BookingButton>
        <Close asChild>
          <Button variant="ghost" className="w-full md:w-auto">
            {copy.dismiss}
          </Button>
        </Close>
      </div>
    </div>
  );
}
