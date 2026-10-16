/**
 * Sanity connection settings, shared by the Studio (sanity.config.ts), the CLI
 * (sanity.cli.ts) and the app's client (#59). Read straight from process.env, not
 * through `@/env`: the Sanity CLI bundles this folder itself and knows no path aliases.
 * The project id and dataset are public by design; the read token is not here.
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `${name} is missing. Set it in .env.local (docs/guides/environments.md › Sanity).`,
    );
  }
  return value;
}

export const projectId = required(
  "NEXT_PUBLIC_SANITY_PROJECT_ID",
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
);

export const dataset = required(
  "NEXT_PUBLIC_SANITY_DATASET",
  process.env.NEXT_PUBLIC_SANITY_DATASET,
);

export { apiVersion } from "./api-version";
