import type { InsertError } from "./submit";
import type { ConsultationRequest } from "./schema";

/**
 * A fake database for Playwright (#39), so e2e can force every outcome without
 * Supabase or Resend. Only Playwright's web server sets E2E_FAKE_BACKEND=1, and it is
 * refused on Vercel production whatever the variable says. The bot checks and zod still
 * run for real; only the insert and the emails are replaced.
 *
 * The outcome comes from a marker in the submitted name:
 *   "e2e:failed"        → a database error (Send failed)
 *   "e2e:rate-limited"  → PT429
 *   "e2e:slow"          → success after 1.5 s (to see the Sending state)
 *   anything else       → success
 */
export function isFakeBackendEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env.E2E_FAKE_BACKEND === "1" && env.VERCEL_ENV !== "production";
}

export async function fakeInsert(
  request: ConsultationRequest,
): Promise<{ id: string } | { error: InsertError }> {
  if (request.name.includes("e2e:failed")) return { error: { code: "XX000" } };
  if (request.name.includes("e2e:rate-limited")) {
    return { error: { code: "PT429" } };
  }
  if (request.name.includes("e2e:slow")) {
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  return { id: "00000000-0000-0000-0000-00000000e2e0" };
}
