import {
  isEnvValidationSkipped,
  parsePublicEnv,
  parseServerEnv,
  type EnvSource,
  type PublicEnv,
  type ServerEnv,
} from "./env.schema";

/**
 * Validated environment. Every variable in CLAUDE.md is defined in src/env.schema.ts.
 *
 * - Public variables are inlined into the client bundle by Next.js, so each one is read
 *   as a literal `process.env.NEXT_PUBLIC_*` expression below.
 * - Server-only variables are read lazily through `getServerEnv()`, which refuses to run
 *   in the browser. Never prefix a secret with `NEXT_PUBLIC_`.
 * - `next.config.ts` validates both scopes, so `next dev` and `next build` fail on a
 *   missing or malformed variable. `SKIP_ENV_VALIDATION=1` bypasses this (tooling only).
 */

export type { PublicEnv, ServerEnv };

const publicSource: EnvSource = {
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SANITY_PROJECT_ID: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  NEXT_PUBLIC_SANITY_DATASET: process.env.NEXT_PUBLIC_SANITY_DATASET,
  NEXT_PUBLIC_GA_MEASUREMENT_ID: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
};

const skipValidation = isEnvValidationSkipped({
  SKIP_ENV_VALIDATION: process.env.SKIP_ENV_VALIDATION,
});

/** Validated public variables. Safe to import from client and server code. */
export const publicEnv: PublicEnv = skipValidation
  ? (publicSource as PublicEnv)
  : parsePublicEnv(publicSource);

let serverEnvCache: ServerEnv | undefined;

/** Validated server-only variables. Throws if called in the browser. */
export function getServerEnv(): ServerEnv {
  if (typeof window !== "undefined") {
    throw new Error("getServerEnv() must not be called in the browser.");
  }
  serverEnvCache ??= skipValidation
    ? (process.env as EnvSource as ServerEnv)
    : parseServerEnv(process.env);
  return serverEnvCache;
}
