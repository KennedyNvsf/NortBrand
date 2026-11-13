import type { PromoPlacement } from "@/content/promo";
import type { ServiceSlug } from "@/content/services";
import type { Locale } from "@/i18n/routing";

/*
 * GA4, loaded only after analytics consent (ADR-007, #43). Nothing here runs until the
 * consent-gated <GoogleAnalytics /> calls enableAnalytics(): before a choice, and after
 * Reject, the page makes no request to Google at all.
 *
 * Privacy rules, enforced here rather than trusted to the property settings:
 * - Google Signals and ad personalization are off in the tag config too.
 * - Page views are sent by hand with the path only, never the query string: the
 *   newsletter link pages carry the visitor's email in theirs. The same clean URL is
 *   set as `page_location` for every later hit.
 * - Events carry no personal data: the event map below is the whole vocabulary.
 * - Withdrawing consent sets Google's own `ga-disable-<ID>` switch and deletes the
 *   `_ga` / `_ga_<ID>` cookies.
 */

/**
 * Every event the site sends, with its only allowed parameters: exactly the list in
 * Brief › GA4 configuration (#72). Slugs, locale codes and counts only.
 */
export type AnalyticsEvents = {
  consultation_request_submitted: { service: ServiceSlug };
  newsletter_subscribed: Record<string, never>;
  /** A service's "What's included" opened on the Services page. */
  service_details_opened: { service: ServiceSlug };
  /** The language switcher, from the current language to the one picked. */
  language_switched: { from: Locale; to: Locale };
  /** The search's length and result count only: never the words typed. */
  blog_search: { term_length: number; results: number };
  /** The limited offer (#126): where it showed, and what the visitor did with it. */
  promo_view: { placement: PromoPlacement };
  promo_click: { placement: PromoPlacement };
  promo_dismiss: { placement: PromoPlacement };
};

type Gtag = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
  }
}

export const GTAG_ORIGIN = "https://www.googletagmanager.com";

let activeId: string | null = null;

function disableFlag(measurementId: string): `ga-disable-${string}` {
  return `ga-disable-${measurementId}`;
}

function setDisabled(measurementId: string, disabled: boolean) {
  (window as unknown as Record<string, unknown>)[disableFlag(measurementId)] =
    disabled;
}

/** The page URL GA may see: origin and path, no query string or fragment. */
export function cleanPageLocation(
  location: Pick<Location, "origin" | "pathname">,
) {
  return `${location.origin}${location.pathname}`;
}

/**
 * Loads gtag.js once and configures it. Called again after a withdrawal and a new
 * Accept in the same visit, it only lifts the disable switch.
 */
export function enableAnalytics(measurementId: string) {
  setDisabled(measurementId, false);
  if (activeId === measurementId) return;
  activeId = measurementId;

  window.dataLayer = window.dataLayer ?? [];
  window.gtag = function gtag() {
    // gtag.js reads the `arguments` object itself, not an array (Google's snippet).
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer?.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", measurementId, {
    send_page_view: false,
    page_location: cleanPageLocation(window.location),
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  });

  const script = document.createElement("script");
  script.async = true;
  script.src = `${GTAG_ORIGIN}/gtag/js?id=${encodeURIComponent(measurementId)}`;
  script.dataset.analytics = "ga4";
  document.head.append(script);
}

/** Stops all sending (Google's opt-out switch) and removes GA's cookies. */
export function disableAnalytics(measurementId: string) {
  setDisabled(measurementId, true);
  deleteGaCookies(document, window.location.hostname);
}

/** `_ga` and `_ga_<ID>` on the host and on each parent domain GA may have used. */
export function deleteGaCookies(
  doc: Pick<Document, "cookie">,
  hostname: string,
) {
  const names = doc.cookie
    .split(";")
    .map((part) => part.split("=")[0]?.trim() ?? "")
    .filter((name) => name === "_ga" || name.startsWith("_ga_"));

  const labels = hostname.split(".");
  const domains = [""];
  for (let i = 0; i < labels.length - 1; i += 1) {
    domains.push(`; Domain=.${labels.slice(i).join(".")}`);
  }

  for (const name of names) {
    for (const domain of domains) {
      doc.cookie = `${name}=; Max-Age=0; Path=/${domain}`;
    }
  }
}

function isEnabled(): boolean {
  if (!activeId || !window.gtag) return false;
  const flag = (window as unknown as Record<string, unknown>)[
    disableFlag(activeId)
  ];
  return flag !== true;
}

/** A page view for the current path (client-side navigations included). */
export function trackPageView(path: string) {
  if (!isEnabled()) return;
  const pageLocation = `${window.location.origin}${path}`;
  window.gtag?.("set", { page_location: pageLocation });
  window.gtag?.("event", "page_view", {
    page_location: pageLocation,
    page_path: path,
    page_title: document.title,
  });
}

/** Sends one of the site's events; a no-op without analytics consent. */
export function trackEvent<Name extends keyof AnalyticsEvents>(
  name: Name,
  params: AnalyticsEvents[Name],
) {
  if (!isEnabled()) return;
  window.gtag?.("event", name, params);
}

/** Test seam: forget the loaded tag so each test starts from a fresh page. */
export function resetAnalyticsForTests() {
  activeId = null;
}
