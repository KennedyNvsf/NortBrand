/**
 * The switch for Playwright's fake backends (src/features/<feature>/e2e-backend.ts), so e2e
 * never writes to Supabase or sends email. Only Playwright's web server sets
 * E2E_FAKE_BACKEND=1, and it is refused on Vercel production whatever the variable says.
 */
export function isFakeBackendEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env.E2E_FAKE_BACKEND === "1" && env.VERCEL_ENV !== "production";
}
