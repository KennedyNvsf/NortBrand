import { sentryOptions } from "@/lib/sentry";

/*
 * Browser error reporting (Sentry; options and scrubbing in src/lib/sentry.ts).
 * The SDK is about 50 KB gzipped, so it loads once the page is idle instead of on the
 * critical path: it never delays first paint or hydration. Errors in the first moments
 * before it starts are not reported; server errors always are (instrumentation.ts).
 * Without a DSN (local development, forks) nothing is downloaded at all.
 * NEXT_PUBLIC_VERCEL_ENV is exposed by Vercel (production, preview); anything else is
 * development.
 *
 * `next dev` warns that `onRouterTransitionStart` is not exported. That hook only records
 * navigation traces, and tracing is off (`tracesSampleRate: 0`); exporting it would also
 * import the SDK eagerly and undo the idle loading above, so the warning is expected (#88).
 */
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || undefined;

function startSentry() {
  void import("@sentry/nextjs").then((Sentry) => {
    Sentry.init(
      sentryOptions(dsn, process.env.NEXT_PUBLIC_VERCEL_ENV ?? "development"),
    );
  });
}

if (dsn) {
  if ("requestIdleCallback" in window) {
    requestIdleCallback(startSentry, { timeout: 4000 });
  } else {
    setTimeout(startSentry, 2000);
  }
}
