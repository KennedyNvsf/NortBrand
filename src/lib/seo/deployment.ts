/**
 * Whether this build is a Vercel preview deployment. Preview URLs must never be
 * indexed (brief, "SEO"): their pages get `noindex` and robots.txt disallows
 * everything. Vercel sets VERCEL_ENV at build time, and pages are prerendered per
 * deployment, so the flag is baked into each deployment's static output.
 * Local builds and production are indexable (the e2e harness relies on that locally).
 */
export function isPreviewDeployment(
  env: Readonly<Record<string, string | undefined>> = process.env,
): boolean {
  return env.VERCEL_ENV === "preview";
}
