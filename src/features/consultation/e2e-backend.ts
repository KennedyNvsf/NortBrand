import type { InsertError } from "./submit";
import type { ConsultationRequest } from "./schema";

/**
 * A fake database for Playwright (#39), so e2e can force every outcome without
 * Supabase or Resend. It is used only when `isFakeBackendEnabled()` (src/lib/e2e-backend.ts).
 * The bot checks and zod still run for real; only the insert and the emails are replaced.
 *
 * The outcome comes from a marker in the submitted name:
 *   "e2e:failed"        → a database error (Send failed)
 *   "e2e:rate-limited"  → PT429
 *   "e2e:slow"          → success after 1.5 s (to see the Sending state)
 *   anything else       → success
 */
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
