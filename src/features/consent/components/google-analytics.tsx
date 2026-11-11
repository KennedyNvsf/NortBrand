"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import {
  disableAnalytics,
  enableAnalytics,
  trackPageView,
} from "@/lib/analytics";

import { useConsent } from "../consent-store";

/*
 * Mounted next to the ConsentManager in the [locale] layout. It follows the consent
 * store: analytics accepted → load gtag and send page views; rejected later in the
 * visit → switch it off and delete GA's cookies. Undecided or rejected from the start →
 * nothing is loaded at all (ADR-007).
 *
 * Page views: one when analytics starts, then one per client-side navigation
 * (usePathname). The path only; the query string never reaches Google.
 *
 * The layout passes `measurementId` from the validated `publicEnv`. Don't import
 * `@/env` here: it brings zod into every page's client bundle (#105).
 */
export function GoogleAnalytics({ measurementId }: { measurementId: string }) {
  const consent = useConsent();
  const pathname = usePathname();
  const accepted = consent.status === "decided" && consent.consent.analytics;
  const withdrawn = consent.status === "decided" && !consent.consent.analytics;

  useEffect(() => {
    if (accepted) enableAnalytics(measurementId);
    else if (withdrawn) disableAnalytics(measurementId);
  }, [accepted, withdrawn, measurementId]);

  useEffect(() => {
    if (accepted) trackPageView(pathname);
  }, [accepted, pathname]);

  return null;
}
