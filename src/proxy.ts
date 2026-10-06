import createMiddleware from "next-intl/middleware";

import { routing } from "./i18n/routing";

/**
 * Locale negotiation for the bare `/` only (ADR-006): NEXT_LOCALE cookie, then
 * Accept-Language, then `pt`. The matcher keeps every other path, including /studio,
 * /api and all prefixed URLs, out of the proxy, so they are never redirected.
 */
export default createMiddleware(routing);

export const config = {
  matcher: ["/"],
};
