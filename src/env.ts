import { z } from "zod";

/**
 * Environment contract. Every variable in CLAUDE.md is listed here and nowhere else.
 *
 * - Public variables are inlined into the client bundle by Next.js, so each one must be
 *   read as a literal `process.env.NEXT_PUBLIC_*` expression (see `publicSource`).
 * - Server-only variables are read lazily through `getServerEnv()`, which refuses to run
 *   in the browser. Never prefix a secret with `NEXT_PUBLIC_`.
 * - `next.config.ts` calls `validateEnv()`, so `next dev` and `next build` fail on a
 *   missing or malformed variable. `SKIP_ENV_VALIDATION=1` bypasses this (tooling only).
 */

const nonEmpty = z.string().trim().min(1);

export const publicSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.url({ protocol: /^https?$/ }),
  NEXT_PUBLIC_SUPABASE_URL: z.url({ protocol: /^https?$/ }),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: nonEmpty,
  NEXT_PUBLIC_SANITY_PROJECT_ID: z
    .string()
    .regex(/^[a-z0-9]+$/, "Sanity project IDs are lowercase alphanumeric"),
  NEXT_PUBLIC_SANITY_DATASET: z
    .string()
    .regex(/^[a-z0-9_-]+$/, "Sanity dataset names are lowercase"),
  NEXT_PUBLIC_GA_MEASUREMENT_ID: z
    .string()
    .regex(/^G-[A-Z0-9]+$/, "GA4 measurement IDs look like G-XXXXXXXXXX"),
});

export const serverSchema = z.object({
  SANITY_API_READ_TOKEN: nonEmpty,
  SANITY_REVALIDATE_SECRET: z.string().min(32, "Use at least 32 characters"),
  RESEND_API_KEY: z.string().startsWith("re_", "Resend keys start with re_"),
  RESEND_AUDIENCE_ID: nonEmpty,
  NOTIFY_TO_EMAIL: z.email(),
  IP_HASH_SALT: z.string().min(32, "Use at least 32 characters"),
});

export type PublicEnv = z.infer<typeof publicSchema>;
export type ServerEnv = z.infer<typeof serverSchema>;

type EnvSource = Record<string, string | undefined>;

// Literal references so Next.js can inline them into client code.
const publicSource: EnvSource = {
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SANITY_PROJECT_ID: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  NEXT_PUBLIC_SANITY_DATASET: process.env.NEXT_PUBLIC_SANITY_DATASET,
  NEXT_PUBLIC_GA_MEASUREMENT_ID: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
};

export class EnvValidationError extends Error {
  constructor(scope: "public" | "server", error: z.ZodError) {
    super(
      `Invalid ${scope} environment variables:\n${z.prettifyError(error)}\n` +
        "See .env.example and README.md.",
    );
    this.name = "EnvValidationError";
  }
}

export function parsePublicEnv(source: EnvSource): PublicEnv {
  const result = publicSchema.safeParse(source);
  if (!result.success) throw new EnvValidationError("public", result.error);
  return result.data;
}

export function parseServerEnv(source: EnvSource): ServerEnv {
  const result = serverSchema.safeParse(source);
  if (!result.success) throw new EnvValidationError("server", result.error);
  return result.data;
}

const skipValidation = process.env.SKIP_ENV_VALIDATION === "1";

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

/** Validates both scopes. Called from next.config.ts so dev and build fail fast. */
export function validateEnv(): void {
  if (skipValidation) return;
  parsePublicEnv(publicSource);
  parseServerEnv(process.env);
}
