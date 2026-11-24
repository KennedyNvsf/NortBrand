import type { NextConfig } from "next";
import { PHASE_PRODUCTION_BUILD } from "next/constants";
import createNextIntlPlugin from "next-intl/plugin";
import { withSentryConfig } from "@sentry/nextjs/config";

import { validateEnv } from "./src/env.schema";
import { unconfirmedSiteDetails } from "./src/content/site";
import {
  isReleaseBuild,
  runReleaseGuard,
  runSiteDetailsGuard,
} from "./src/i18n/release-guard";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Blog images come from the Sanity CDN (src/lib/sanity/image.ts).
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.sanity.io", pathname: "/images/**" },
    ],
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default function config(phase: string): NextConfig {
  // `next typegen` loads this file in the build phase too, but only needs route types.
  const isTypegen = process.argv.includes("typegen");

  // Fail `next dev` and `next build` early on missing or malformed variables.
  if (!isTypegen) validateEnv();

  // Pseudo translations and unconfirmed site.ts contact details (#79) fail release
  // builds and only warn on other builds. Next.js loads this file again in its build
  // workers, which inherit the env flag below, so the warning prints once.
  const strict = isReleaseBuild(process.env);
  if (
    phase === PHASE_PRODUCTION_BUILD &&
    !isTypegen &&
    (strict || process.env.RELEASE_GUARD_CHECKED !== "1")
  ) {
    runReleaseGuard("./messages", { strict });
    runSiteDetailsGuard(unconfirmedSiteDetails(), { strict });
    process.env.RELEASE_GUARD_CHECKED = "1";
  }

  // Source maps upload to Sentry only when SENTRY_AUTH_TOKEN is set (Vercel builds);
  // they are deleted afterwards so the browser never receives them.
  return withSentryConfig(withNextIntl(nextConfig), {
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    authToken: process.env.SENTRY_AUTH_TOKEN,
    silent: !process.env.CI,
    telemetry: false,
    widenClientFileUpload: true,
    sourcemaps: {
      disable: !process.env.SENTRY_AUTH_TOKEN,
      deleteSourcemapsAfterUpload: true,
    },
  });
}
