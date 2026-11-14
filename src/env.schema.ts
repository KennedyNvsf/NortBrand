import { z } from "zod";

/**
 * Environment contract: schemas and parsers only, with no side effects on import, so
 * next.config.ts can use them. Runtime access goes through src/env.ts.
 */

const nonEmpty = z.string().trim().min(1);

/** Optional: an unset or empty value is undefined, so local builds run without it. */
const optionalHttpsUrl = z
  .union([z.literal(""), z.url({ protocol: /^https$/ })])
  .optional()
  .transform((value) => value || undefined);

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
  /** Sentry is off when unset (local development, forks). Public by design. */
  NEXT_PUBLIC_SENTRY_DSN: optionalHttpsUrl,
});

export const serverSchema = z.object({
  SANITY_API_READ_TOKEN: nonEmpty,
  SANITY_REVALIDATE_SECRET: z.string().min(32, "Use at least 32 characters"),
  RESEND_API_KEY: z.string().startsWith("re_", "Resend keys start with re_"),
  RESEND_SEGMENT_ID: nonEmpty,
  /** Verifies Resend webhooks (/api/newsletter/resend-webhook): the endpoint's signing secret. */
  RESEND_WEBHOOK_SECRET: z
    .string()
    .startsWith("whsec_", "Resend webhook secrets start with whsec_"),
  /** Sender, `Name <address>` or `address`. `onboarding@resend.dev` until the domain is verified. */
  EMAIL_FROM: z
    .string()
    .regex(
      /^(?:[^<>@]+ <[^\s<>@]+@[^\s<>@]+>|[^\s<>@]+@[^\s<>@]+)$/,
      'Use "Name <address>" or a plain address',
    ),
  NOTIFY_TO_EMAIL: z.email(),
  IP_HASH_SALT: z.string().min(32, "Use at least 32 characters"),
  /** Signs newsletter confirm and unsubscribe links (HMAC-SHA256). */
  NEWSLETTER_TOKEN_SECRET: z.string().min(32, "Use at least 32 characters"),
  /**
   * Portal auth administration only (ADR-009, #132), read only by
   * src/lib/supabase/admin.ts. Optional so a build without it still works; inviting and
   * removing teammates refuse to run until it is set.
   */
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20).optional(),
});

export type PublicEnv = z.infer<typeof publicSchema>;
export type ServerEnv = z.infer<typeof serverSchema>;
export type EnvSource = Record<string, string | undefined>;

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

export function isEnvValidationSkipped(source: EnvSource = process.env) {
  return source.SKIP_ENV_VALIDATION === "1";
}

/** Validates both scopes. Called from next.config.ts so dev and build fail fast. */
export function validateEnv(source: EnvSource = process.env): void {
  if (isEnvValidationSkipped(source)) return;
  parsePublicEnv(source);
  parseServerEnv(source);
}
