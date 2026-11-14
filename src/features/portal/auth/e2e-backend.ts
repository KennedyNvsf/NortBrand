import { createHash } from "node:crypto";

import type { RequestCode, VerifyCode } from "./schema";

/**
 * A fake sign-in backend for Playwright (#131), used only when isFakeBackendEnabled()
 * (src/lib/e2e-backend.ts). The rules in sign-in.ts still run for real; only Supabase
 * is replaced, so e2e never needs a database or an inbox.
 *
 * Fixtures:
 *   Project ID NB-1234, any email `client…@e2e.example` → a match; the code is 123456.
 *   `locked@e2e.example`      → sign-in paused
 *   `ratelimited@e2e.example` → too many requests
 *   anything else             → no_match
 * Wrong codes are counted per email in this server process (3 tries), like the database.
 */

export const E2E_PORTAL_PROJECT_ID = "NB-1234";
export const E2E_PORTAL_PROJECT_NAME = "E2E Café website";
export const E2E_PORTAL_CODE = "123456";
export const E2E_PORTAL_COOKIE = "nb_portal_e2e";

const MAX_TRIES = 3;
const misses = new Map<string, number>();

function isFixtureClient(request: RequestCode): boolean {
  return (
    request.projectId === E2E_PORTAL_PROJECT_ID &&
    /^client[a-z0-9.+-]*@e2e\.example$/.test(request.email)
  );
}

/**
 * The fake user id the session marker is bound to: a UUID derived from the email, so it
 * passes the same validation as a real Supabase user id (team actions take UUIDs).
 */
export function e2eUserId(email: string): string {
  const hex = createHash("sha256").update(`e2e:${email}`).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export function fakeBegin(
  request: RequestCode,
): Promise<"ok" | "no_match" | "locked" | { error: { code: string } }> {
  if (request.email === "ratelimited@e2e.example") {
    return Promise.resolve({ error: { code: "PT429" } });
  }
  if (request.email === "locked@e2e.example") return Promise.resolve("locked");
  if (!isFixtureClient(request)) return Promise.resolve("no_match");
  misses.set(request.email, 0);
  return Promise.resolve("ok");
}

export function fakeCodeState(
  request: VerifyCode,
): Promise<"active" | "expired" | "locked"> {
  if (!isFixtureClient(request)) return Promise.resolve("expired");
  return Promise.resolve(
    (misses.get(request.email) ?? 0) >= MAX_TRIES ? "locked" : "active",
  );
}

export function fakeVerify(request: VerifyCode): Promise<"ok" | "mismatch"> {
  return Promise.resolve(request.code === E2E_PORTAL_CODE ? "ok" : "mismatch");
}

export function fakeRegisterWrongCode(request: VerifyCode): Promise<number> {
  const count = (misses.get(request.email) ?? 0) + 1;
  misses.set(request.email, count);
  return Promise.resolve(Math.max(MAX_TRIES - count, 0));
}
