"use client";

import { X } from "lucide-react";
import { useRef, type AnimationEvent } from "react";

import { BookingButton } from "@/components/site/booking-button";
import { useFixedBottomInset } from "@/lib/fixed-bottom-inset";
import { ICON_STROKE } from "@/lib/icons";

import type { PromoCopy } from "./promo-copy";

/*
 * The promo corner card on About and Services (#127; Figma 02 Components › Promo Card
 * 510:794: desktop 510:791 380 px, tablet 510:792 360 px, mobile 510:793). Non-blocking:
 * a labelled `aside` landmark that never takes focus or locks scroll, unlike the Home
 * modal. Bottom-right from 768 px up; on mobile it sits in the Sticky CTA's slot (12 px
 * above the safe area), and the Sticky CTA steps aside while it's there (globals.css).
 * Motion (Motion Spec › PROMO 550:2) is CSS on data-motion="promo-card" and data-state.
 */
export function PromoCard({
  copy,
  closing,
  onClose,
  onBook,
  onExited,
}: {
  copy: Pick<PromoCopy, "label" | "title" | "terms" | "book" | "close">;
  closing: boolean;
  onClose: () => void;
  onBook: () => void;
  /** Called once the exit animation has finished, so the card can unmount. */
  onExited: () => void;
}) {
  const ref = useRef<HTMLElement>(null);
  // Focus and anchors stop above the card while it shows (#177).
  useFixedBottomInset("promo-card", ref, !closing);

  const handleAnimationEnd = (event: AnimationEvent<HTMLElement>) => {
    if (closing && event.target === event.currentTarget) onExited();
  };

  return (
    <aside
      ref={ref}
      aria-labelledby="promo-card-title"
      data-motion="promo-card"
      data-state={closing ? "closed" : "open"}
      onAnimationEnd={handleAnimationEnd}
      className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+12px)] z-40 flex flex-col gap-3.5 rounded-lg border border-border-default bg-bg-surface pt-4 pr-4 pb-6 pl-6 shadow-overlay md:inset-x-auto md:right-6 md:bottom-6 md:w-[360px] lg:right-8 lg:bottom-8 lg:w-[380px]"
    >
      <div className="flex items-center justify-between gap-md">
        <p className="text-[13px] font-medium tracking-[0.08em] text-action-secondary uppercase">
          {copy.label}
        </p>
        <button
          type="button"
          aria-label={copy.close}
          onClick={onClose}
          className="touch-target grid size-10 shrink-0 place-items-center rounded-full border border-border-default bg-bg-surface text-icon-default transition-colors duration-(--duration-fast) ease-standard hover:border-border-strong hover:text-text-primary"
        >
          <X aria-hidden strokeWidth={ICON_STROKE} className="size-6" />
        </button>
      </div>
      <h2
        id="promo-card-title"
        className="text-[24px] leading-[1.1] font-bold tracking-[-0.01em] text-text-primary md:text-[26px]"
      >
        {copy.title}
      </h2>
      <p className="text-[15px] leading-[1.5] text-text-muted">{copy.terms}</p>
      <BookingButton className="w-full" onClick={onBook}>
        {copy.book}
      </BookingButton>
    </aside>
  );
}
