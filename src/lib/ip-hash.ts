import { createHash } from "node:crypto";

/**
 * The visitor's IP from the request headers. Vercel sets `x-forwarded-for` with the
 * client first; `x-real-ip` is a fallback for other proxies. Local requests may have
 * neither, and then every visitor shares one rate-limit bucket, which is fine locally.
 */
export function clientIp(headers: Pick<Headers, "get">): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || "unknown";
}

/**
 * Salted SHA-256 of the IP, as 64 hex characters (the `ip_hash` CHECK in Postgres). The
 * raw IP is never stored or logged; rotating IP_HASH_SALT resets every rate limit.
 */
export function hashIp(ip: string, salt: string): string {
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}
