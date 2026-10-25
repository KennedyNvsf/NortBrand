import { describe, expect, it } from "vitest";

import {
  EnvValidationError,
  parsePublicEnv,
  parseServerEnv,
  validateEnv,
} from "./env.schema";

const validPublic = {
  NEXT_PUBLIC_SITE_URL: "https://nortbrand.com",
  NEXT_PUBLIC_SUPABASE_URL: "https://abcd.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
  NEXT_PUBLIC_SANITY_PROJECT_ID: "abc123",
  NEXT_PUBLIC_SANITY_DATASET: "production",
  NEXT_PUBLIC_GA_MEASUREMENT_ID: "G-ABC123",
};

const validServer = {
  SANITY_API_READ_TOKEN: "token",
  SANITY_REVALIDATE_SECRET: "x".repeat(32),
  RESEND_API_KEY: "re_123",
  RESEND_SEGMENT_ID: "segment",
  RESEND_WEBHOOK_SECRET: "whsec_c2VjcmV0LXNlY3JldC1zZWNyZXQ=",
  EMAIL_FROM: "NortBrand <onboarding@resend.dev>",
  NOTIFY_TO_EMAIL: "team@example.com",
  IP_HASH_SALT: "s".repeat(32),
  NEWSLETTER_TOKEN_SECRET: "n".repeat(32),
};

describe("parsePublicEnv", () => {
  it("accepts a complete, valid set", () => {
    expect(parsePublicEnv(validPublic)).toEqual(validPublic);
  });

  it("rejects a missing variable and names it", () => {
    const { NEXT_PUBLIC_SITE_URL: _omit, ...rest } = validPublic;
    expect(() => parsePublicEnv(rest)).toThrow(/NEXT_PUBLIC_SITE_URL/);
  });

  it("rejects a malformed GA measurement ID", () => {
    expect(() =>
      parsePublicEnv({ ...validPublic, NEXT_PUBLIC_GA_MEASUREMENT_ID: "UA-1" }),
    ).toThrow(EnvValidationError);
  });

  it("treats an unset or empty Sentry DSN as off", () => {
    expect(parsePublicEnv(validPublic).NEXT_PUBLIC_SENTRY_DSN).toBeUndefined();
    expect(
      parsePublicEnv({ ...validPublic, NEXT_PUBLIC_SENTRY_DSN: "" })
        .NEXT_PUBLIC_SENTRY_DSN,
    ).toBeUndefined();
  });

  it("accepts an https Sentry DSN and rejects anything else", () => {
    const dsn = "https://key@o1.ingest.de.sentry.io/2";
    expect(
      parsePublicEnv({ ...validPublic, NEXT_PUBLIC_SENTRY_DSN: dsn })
        .NEXT_PUBLIC_SENTRY_DSN,
    ).toBe(dsn);
    expect(() =>
      parsePublicEnv({ ...validPublic, NEXT_PUBLIC_SENTRY_DSN: "not-a-url" }),
    ).toThrow(/NEXT_PUBLIC_SENTRY_DSN/);
  });

  it("does not expose server-only keys", () => {
    const parsed = parsePublicEnv({ ...validPublic, ...validServer });
    expect(Object.keys(parsed)).not.toContain("RESEND_API_KEY");
  });
});

describe("parseServerEnv", () => {
  it("accepts a complete, valid set", () => {
    expect(parseServerEnv(validServer)).toEqual(validServer);
  });

  it("rejects a short revalidate secret", () => {
    expect(() =>
      parseServerEnv({ ...validServer, SANITY_REVALIDATE_SECRET: "short" }),
    ).toThrow(/SANITY_REVALIDATE_SECRET/);
  });

  it("rejects a short newsletter token secret", () => {
    expect(() =>
      parseServerEnv({ ...validServer, NEWSLETTER_TOKEN_SECRET: "short" }),
    ).toThrow(/NEWSLETTER_TOKEN_SECRET/);
  });

  it("rejects a Resend webhook secret without the whsec_ prefix", () => {
    expect(() =>
      parseServerEnv({ ...validServer, RESEND_WEBHOOK_SECRET: "secret" }),
    ).toThrow(/RESEND_WEBHOOK_SECRET/);
  });

  it("rejects a Resend key without the re_ prefix", () => {
    expect(() =>
      parseServerEnv({ ...validServer, RESEND_API_KEY: "sk_123" }),
    ).toThrow(/RESEND_API_KEY/);
  });
});

describe("validateEnv", () => {
  it("passes with every variable present", () => {
    expect(() => {
      validateEnv({ ...validPublic, ...validServer });
    }).not.toThrow();
  });

  it("fails when a server-only variable is missing", () => {
    const { IP_HASH_SALT: _omit, ...rest } = validServer;
    expect(() => {
      validateEnv({ ...validPublic, ...rest });
    }).toThrow(/IP_HASH_SALT/);
  });

  it("can be skipped explicitly for tooling", () => {
    expect(() => {
      validateEnv({ SKIP_ENV_VALIDATION: "1" });
    }).not.toThrow();
  });
});
