import { defineCliConfig } from "sanity/cli";

/*
 * The Sanity CLI (`pnpm sanity:types`). It loads .env files itself only for
 * SANITY_STUDIO_* variables, so the project id and dataset are passed through from the
 * app's NEXT_PUBLIC_* names by the script (package.json).
 */
export default defineCliConfig({
  api: {
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  },
  typegen: {
    path: "./src/**/*.{ts,tsx}",
    schema: "./sanity/schema.json",
    generates: "./src/lib/sanity/sanity.types.ts",
  },
});
