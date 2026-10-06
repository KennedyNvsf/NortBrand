import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

import { validateEnv } from "./src/env.schema";

// Fail `next dev` and `next build` early on missing or malformed variables.
// `next typegen` loads this file in the build phase too, but only needs route types.
if (!process.argv.includes("typegen")) validateEnv();

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  cacheComponents: true,
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

export default withNextIntl(nextConfig);
