import type { Breadcrumb, ErrorEvent } from "@sentry/nextjs";

/*
 * Shared Sentry options for the browser, Node and edge runtimes
 * (src/instrumentation.ts, src/instrumentation-client.ts).
 * - Errors only: no tracing, no session replay, and no release-health sessions, so
 *   nothing reaches Sentry unless an error occurs.
 * - Off when NEXT_PUBLIC_SENTRY_DSN is unset (local development, forks).
 * - No personal data: the site handles names, emails and phone numbers (GDPR, ADR-002),
 *   so every event is scrubbed before it leaves, on top of the project's server-side
 *   data scrubber. Query strings go too: newsletter links carry an email and a token.
 */

export function sentryOptions(dsn: string | undefined, environment: string) {
  return {
    dsn,
    enabled: Boolean(dsn),
    environment,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    beforeSend: scrubEvent,
    beforeBreadcrumb: scrubBreadcrumb,
    integrations: withoutSessions,
  };
}

/**
 * BrowserSession reports a session for every page view, error or not: a third-party
 * request for each visitor. Errors are all this site needs.
 */
export function withoutSessions<T extends { name: string }>(defaults: T[]) {
  return defaults.filter(
    (integration) => integration.name !== "BrowserSession",
  );
}

/** The URL without its query string or fragment. */
export function stripQuery(url: string) {
  return url.split(/[?#]/, 1)[0] ?? "";
}

export function scrubEvent(event: ErrorEvent): ErrorEvent {
  delete event.user;
  if (event.request) {
    const { url, method } = event.request;
    event.request = { method, url: url === undefined ? url : stripQuery(url) };
  }
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs
      .map(scrubBreadcrumb)
      .filter((crumb): crumb is Breadcrumb => crumb !== null);
  }
  return event;
}

/** Console output may quote form input, so it never becomes a breadcrumb. */
export function scrubBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb | null {
  if (breadcrumb.category === "console") return null;
  const data = breadcrumb.data;
  if (!data) return breadcrumb;
  const scrubbed = { ...data };
  for (const key of ["url", "from", "to"]) {
    const value: unknown = scrubbed[key];
    if (typeof value === "string") scrubbed[key] = stripQuery(value);
  }
  return { ...breadcrumb, data: scrubbed };
}
