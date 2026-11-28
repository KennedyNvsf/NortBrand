"use client";

import { useId, useRef } from "react";
import { m, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";

import {
  LINK_ROOT,
  TextLink,
  TextLinkContent,
} from "@/components/site/text-link";
import { Button } from "@/components/ui/button";
import {
  motionTokens,
  consentBannerSpec,
  reducedMotionDuration,
} from "@/lib/motion";
import { useFixedBottomInset } from "@/lib/fixed-bottom-inset";
import { cn } from "@/lib/utils";

import { openConsentPreferences, saveConsent } from "../consent-store";

/*
 * Figma: 02 Components › Cookie Banner (328:513); 08 System / States: desktop 326:16,
 * tablet 382:268, mobile 382:131.
 * - A floating card, bottom left from tablet (520 wide, 24 / 32 px from the edges) and
 *   full width on mobile, 12 px above the safe area like the StickyCta.
 * - Not modal: no scrim, no focus trap, nothing behind it is blocked (Handoff: "never
 *   blocks content or focus"). The manager's live region announces it.
 * - Reject and Accept have equal size and weight at every breakpoint (ADR-007): side
 *   by side from tablet, stacked full width on mobile. No pre-ticked choice.
 * - Motion Spec › Cookie banner: rises 24 px and fades in after 800 ms (350 ms), and
 *   leaves down 16 px (200 ms). Reduced motion: opacity only, 150 ms, no delay.
 */
export function CookieBanner() {
  const t = useTranslations("Consent.banner");
  const titleId = useId();
  const bodyId = useId();
  const reduced = useReducedMotion() ?? false;
  const ref = useRef<HTMLElement>(null);
  // Focus and anchors stop above the banner while it shows (#177).
  useFixedBottomInset("cookie-banner", ref, true);

  return (
    <m.section
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      data-consent-banner=""
      initial={{ opacity: 0, y: reduced ? 0 : consentBannerSpec.rise }}
      animate={{
        opacity: 1,
        y: 0,
        transition: reduced
          ? { duration: reducedMotionDuration }
          : {
              delay: consentBannerSpec.delay,
              duration: consentBannerSpec.enter,
              ease: motionTokens.ease.emphasized,
            },
      }}
      exit={{
        opacity: 0,
        y: reduced ? 0 : consentBannerSpec.drop,
        transition: {
          duration: reduced ? reducedMotionDuration : consentBannerSpec.exit,
          ease: motionTokens.ease.exit,
        },
      }}
      className={cn(
        "fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+12px)] z-40",
        "flex flex-col gap-3.5 rounded-lg border border-border-default bg-bg-surface p-5.5 shadow-overlay",
        "md:right-auto md:bottom-6 md:left-6 md:w-130 md:gap-lg md:px-8 md:py-7.5",
        "lg:bottom-8 lg:left-8",
      )}
    >
      <h2
        id={titleId}
        className="text-[20px] font-bold tracking-[-0.005em] text-text-primary md:text-[24px]"
      >
        {t("title")}
      </h2>
      <p
        id={bodyId}
        className="text-small leading-[1.54] text-text-muted md:text-[15px]"
      >
        {t("body")}
      </p>
      <div className="flex flex-wrap items-center gap-x-5.5">
        <button
          type="button"
          onClick={openConsentPreferences}
          className={cn(
            LINK_ROOT,
            "inline-flex min-h-11 items-center rounded-sm lg:min-h-0",
          )}
        >
          <TextLinkContent>{t("manage")}</TextLinkContent>
        </button>
        <TextLink href="/legal/privacy">{t("privacy")}</TextLink>
      </div>
      {/* Two equal columns: flex-1 would let the longer label widen its button. */}
      <div className="grid gap-2.5 md:grid-cols-2 md:gap-md">
        <Button
          variant="secondary"
          className="w-full"
          onClick={() => {
            saveConsent({ analytics: false });
          }}
        >
          {t("reject")}
        </Button>
        <Button
          className="w-full"
          onClick={() => {
            saveConsent({ analytics: true });
          }}
        >
          {t("accept")}
        </Button>
      </div>
    </m.section>
  );
}
