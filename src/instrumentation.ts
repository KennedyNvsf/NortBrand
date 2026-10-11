import * as Sentry from "@sentry/nextjs";

import { sentryOptions } from "@/lib/sentry";

/*
 * Server and edge error reporting (Sentry; options and scrubbing in src/lib/sentry.ts).
 * Next.js calls register() once per runtime at startup, and onRequestError for every
 * error thrown while rendering, in a route handler or in a server action.
 */
export function register() {
  Sentry.init(
    sentryOptions(
      process.env.NEXT_PUBLIC_SENTRY_DSN || undefined,
      process.env.VERCEL_ENV ?? "development",
    ),
  );
}

export const onRequestError = Sentry.captureRequestError;
