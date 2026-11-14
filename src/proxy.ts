import { createServerClient } from "@supabase/ssr";
import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";

import { publicEnv } from "./env";
import { routing } from "./i18n/routing";
import { isFakeBackendEnabled } from "./lib/e2e-backend";

/**
 * Two jobs, on different paths:
 * - The bare `/`: locale negotiation only (ADR-006): NEXT_LOCALE cookie, then
 *   Accept-Language, then `pt`. Every other marketing URL stays out of the proxy, so
 *   prefixed URLs are never redirected.
 * - Portal paths (`/en/portal…`, `/pt/portal…`): refresh the Supabase session cookies
 *   before the page renders (ADR-009). Server components can read cookies but not
 *   write them, so an expiring access token is renewed here.
 */
const localeProxy = createMiddleware(routing);

const PORTAL_PATH = new RegExp(`^/(${routing.locales.join("|")})/portal(/|$)`);

async function refreshPortalSession(
  request: NextRequest,
): Promise<NextResponse> {
  let response = NextResponse.next({ request });
  if (isFakeBackendEnabled()) return response;

  const supabase = createServerClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          for (const { name, value } of cookiesToSet)
            request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );
  // getUser() validates the session with Supabase and triggers the refresh above.
  await supabase.auth.getUser();
  return response;
}

export default function proxy(
  request: NextRequest,
): Response | Promise<Response> {
  if (PORTAL_PATH.test(request.nextUrl.pathname))
    return refreshPortalSession(request);
  return localeProxy(request);
}

export const config = {
  matcher: ["/", "/(en|pt)/portal", "/(en|pt)/portal/:path*"],
};
