import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { publicEnv } from "@/env";

import type { Database } from "./database.types";

export type Supabase = SupabaseClient<Database>;

let client: Supabase | undefined;

/**
 * The website's only Supabase client: the anon key, used from server actions to call
 * the public write functions (ADR-002). There is no auth, so no session is stored or
 * refreshed, and no cookies are read. Never add a service-role client to the app.
 */
export function getSupabase(): Supabase {
  client ??= createClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  return client;
}
