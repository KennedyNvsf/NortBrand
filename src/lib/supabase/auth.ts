import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { publicEnv } from "@/env";

import type { Database } from "./database.types";

/**
 * The portal's Supabase client (ADR-009): the anon key plus the signed-in user's session,
 * kept in httpOnly cookies by @supabase/ssr. Every portal read and write goes through it,
 * so RLS sees the user. Import it only from server components and server actions.
 *
 * The marketing site keeps getSupabase() (no session, ADR-002). The service-role key
 * never appears here.
 */
export async function getPortalSupabase() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server components can't set cookies. The proxy refreshes the session on
            // every portal request instead (src/proxy.ts), so nothing is lost here.
          }
        },
      },
    },
  );
}
