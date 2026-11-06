"use client";

import dynamic from "next/dynamic";
import { AnimatePresence } from "motion/react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import {
  useConsent,
  useConsentPreferencesOpen,
  useConsentSavedThisVisit,
} from "../consent-store";
import { CookieBanner } from "./cookie-banner";

/*
 * The preferences panel (Radix Dialog on tablet and up, vaul Drawer on mobile) is about
 * 20 KiB of JavaScript that most visits never open. It loads in its own chunk: fetched
 * when the browser is idle after load, and mounted the first time it opens. It then
 * stays mounted so it can play its close animation and return focus (#105).
 */
const loadPreferences = () =>
  import("./consent-preferences").then((m) => m.ConsentPreferences);
const ConsentPreferences = dynamic(loadPreferences);

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
  const [preferencesMounted, setPreferencesMounted] = useState(false);

  if (preferencesOpen && !preferencesMounted) setPreferencesMounted(true);

  useEffect(() => {
    const prefetch = () => void loadPreferences();
    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(prefetch, { timeout: 5000 });
      return () => {
        window.cancelIdleCallback(id);
      };
    }
    const id = setTimeout(prefetch, 3000);
    return () => {
      clearTimeout(id);
    };
  }, []);

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
      {preferencesMounted ? (
        <ConsentPreferences open={preferencesOpen} current={current} />
      ) : null}
    </>
  );
}
