import { describe, expect, it } from "vitest";

import { signToken, verifyToken } from "./tokens";

// The same secret and vectors as supabase/tests/03_newsletter.test.sql: a token signed
// here must verify in Postgres, and the other way round.
const secret = "test-secret-0123456789abcdef0123456789";

describe("signToken", () => {
  it("matches the Postgres test vectors", () => {
    expect(signToken(secret, "confirm|ana@example.com|1700000000")).toBe(
      "QGarSH8806G_BeOERWNKMVOnGN5hhKLabFIabU3Fngo",
    );
    expect(signToken(secret, "unsubscribe|ana@example.com")).toBe(
      "QcQyEaQAdgoas-1uK3mWvuMc9xqCuR6myajF0Nk-SDE",
    );
  });
});

describe("verifyToken", () => {
  const message = "confirm|ana@example.com|1700000000";
  const token = signToken(secret, message);

  it("accepts the token for its message", () => {
    expect(verifyToken(secret, message, token)).toBe(true);
  });

  it("rejects another message, another secret, or a malformed token", () => {
    expect(
      verifyToken(secret, "confirm|bo@example.com|1700000000", token),
    ).toBe(false);
    expect(verifyToken(`${secret}x`, message, token)).toBe(false);
    expect(verifyToken(secret, message, token.slice(1))).toBe(false);
    expect(verifyToken(secret, message, "")).toBe(false);
  });
});
