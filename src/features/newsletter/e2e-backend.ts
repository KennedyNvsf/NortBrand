import type {
  ConfirmLink,
  NewsletterSubscription,
  UnsubscribeLink,
} from "./schema";
import type { RpcError } from "./subscribe";

/**
 * Fake newsletter functions for Playwright (#41), used only when
 * `isFakeBackendEnabled()` (src/lib/e2e-backend.ts). The honeypot, zod and the signed
 * link checks still run for real; only the database calls are replaced, and nothing
 * is emailed or synced to Resend.
 *
 * The outcome comes from the start of the email address:
 *   "e2e-failed@…"        → a database error
 *   "e2e-rate-limited@…"  → PT429 (signup only)
 *   "e2e-slow@…"          → success after 1.5 s (to see the busy state)
 *   "e2e-used@…"          → the database refuses the confirm link (reused or replaced)
 *   anything else         → success
 */

const FAILED: RpcError = { code: "XX000" };

function marker(email: string): string {
  return email.split("@")[0] ?? "";
}

async function slowDown(email: string) {
  if (marker(email) === "e2e-slow") {
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
}

export async function fakeSubscribe({
  email,
}: NewsletterSubscription): Promise<
  { issuedAt: number } | { error: RpcError }
> {
  if (marker(email) === "e2e-failed") return { error: FAILED };
  if (marker(email) === "e2e-rate-limited") return { error: { code: "PT429" } };
  await slowDown(email);
  return { issuedAt: Math.floor(Date.now() / 1000) };
}

export async function fakeConfirm({
  email,
}: ConfirmLink): Promise<{ confirmed: boolean } | { error: RpcError }> {
  if (marker(email) === "e2e-failed") return { error: FAILED };
  await slowDown(email);
  return { confirmed: marker(email) !== "e2e-used" };
}

export async function fakeUnsubscribe({
  email,
}: UnsubscribeLink): Promise<{ unsubscribed: boolean } | { error: RpcError }> {
  if (marker(email) === "e2e-failed") return { error: FAILED };
  await slowDown(email);
  return { unsubscribed: true };
}
