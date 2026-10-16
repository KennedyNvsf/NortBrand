"use client";

import { AnimatePresence } from "motion/react";
import { useTranslations } from "next-intl";

import {
  useConsent,
  useConsentPreferencesOpen,
  useConsentSavedThisVisit,
} from "../consent-store";
import { ConsentPreferences } from "./consent-preferences";
import { CookieBanner } from "./cookie-banner";

/*
 * Mounted once in the [locale] layout, on every page including the 404 (the Sanity
 * Studio is outside it). Pages are static, so nothing renders until the browser has
 * read the consent cookie: no banner flash for visitors who already chose.
 * - The banner shows while there is no valid choice, and leaves with its exit motion.
 * - The polite live region announces the banner when it appears (it never takes focus)
 *   and confirms a saved choice.
 */
export function ConsentManager() {
  const t = useTranslations("Consent");
  const consent = useConsent();
  const preferencesOpen = useConsentPreferencesOpen();
  const saved = useConsentSavedThisVisit();

  const undecided = consent.status === "undecided";
  const current = consent.status === "decided" ? consent.consent : null;

  return (
    <>
      <div role="status" aria-live="polite" className="sr-only">
        {undecided
          ? `${t("banner.title")} ${t("banner.body")}`
          : saved
            ? t("saved")
            : ""}
      </div>
      <AnimatePresence>
        {undecided ? <CookieBanner key="banner" /> : null}
      </AnimatePresence>
      <ConsentPreferences open={preferencesOpen} current={current} />
    </>
  );
}
