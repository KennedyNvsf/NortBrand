import { signToken, verifyToken } from "@/lib/tokens";

/**
 * Minimum fill time. The Contact page is static, so the form asks the server for a
 * signed start time when it mounts (`getConsultationFormToken`). A submission whose
 * token is missing, forged or younger than this is treated as a bot.
 */
export const MIN_FILL_MS = 3000;

const PURPOSE = "form|consultation";

/** `<issuedAt ms>.<signature>`. */
export function createFormToken(secret: string, now: number): string {
  return `${now}.${signToken(secret, `${PURPOSE}|${now}`)}`;
}

export type FormTokenCheck = "ok" | "invalid" | "too-fast";

export function checkFormToken(
  secret: string,
  token: unknown,
  now: number,
): FormTokenCheck {
  if (typeof token !== "string") return "invalid";
  const [issued, signature, ...rest] = token.split(".");
  if (!issued || !signature || rest.length > 0 || !/^\d{13}$/.test(issued)) {
    return "invalid";
  }
  if (!verifyToken(secret, `${PURPOSE}|${issued}`, signature)) return "invalid";

  const elapsed = now - Number(issued);
  if (elapsed < 0) return "invalid";
  return elapsed < MIN_FILL_MS ? "too-fast" : "ok";
}
