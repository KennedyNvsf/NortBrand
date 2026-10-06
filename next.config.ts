import type { NextConfig } from "next";

import { validateEnv } from "./src/env";

// Fail `next dev` and `next build` early on missing or malformed variables.
validateEnv();

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

export default nextConfig;
