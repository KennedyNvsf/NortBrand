"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { publicEnv } from "@/env";
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
 */
export function GoogleAnalytics() {
  const consent = useConsent();
  const pathname = usePathname();
  const measurementId = publicEnv.NEXT_PUBLIC_GA_MEASUREMENT_ID;
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
