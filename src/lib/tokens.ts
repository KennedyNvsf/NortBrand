import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Signed tokens: unpadded base64url of HMAC-SHA256(secret, message). The same format as
 * `private.newsletter_token` in Postgres (#36), so newsletter links signed here verify in
 * SQL. Each use prefixes its own purpose (`confirm|…`, `form|…`), so a token for one
 * purpose never verifies for another.
 */
export function signToken(secret: string, message: string): string {
  return createHmac("sha256", secret).update(message).digest("base64url");
}

/** Constant-time check of a token against the message it should sign. */
export function verifyToken(
  secret: string,
  message: string,
  token: string,
): boolean {
  const expected = Buffer.from(signToken(secret, message));
  const actual = Buffer.from(token);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
