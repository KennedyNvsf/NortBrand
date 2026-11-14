/*
 * Where the suite runs (#45). By default Playwright builds and starts the app locally
 * with the fake backend (playwright.config.ts). CI's "e2e (preview)" job instead sets
 * E2E_BASE_URL to the pull request's own Vercel preview.
 *
 * A preview is a real deployment: it reads the Sanity `development` dataset and the dev
 * Supabase project, sends real email, and is noindex by design (src/lib/seo/
 * deployment.ts). So specs that need the fake backend or their own browser state stay
 * local (PREVIEW_IGNORED), and the few assertions about indexing check `onPreview`.
 */

export const previewURL = process.env.E2E_BASE_URL;

export const onPreview = previewURL !== undefined && previewURL !== "";

/**
 * Specs that run only against the local build:
 * - consultation-form, newsletter: they submit forms, which on a preview would write to
 *   the dev database and send email;
 * - portal-sign-in, team-sign-in, portal-shell, portal-overview, portal-content, team-projects: they sign in with the fake backend's fixtures;
 * - blog, blog-post: they assert the fixture posts (src/features/blog/e2e-backend.ts);
 * - analytics, consent, i18n, promo: they replace the browser state or open fresh contexts,
 *   which would drop the preview's bypass cookie. What they test (GA4 after consent,
 *   the banner, the locale redirect) does not depend on the host.
 */
export const PREVIEW_IGNORED = [
  "consultation-form.spec.ts",
  "newsletter.spec.ts",
  "portal-sign-in.spec.ts",
  "team-sign-in.spec.ts",
  "team-projects.spec.ts",
  "portal-shell.spec.ts",
  "portal-overview.spec.ts",
  "portal-content.spec.ts",
  "blog.spec.ts",
  "blog-post.spec.ts",
  "analytics.spec.ts",
  "consent.spec.ts",
  "i18n.spec.ts",
  "promo.spec.ts",
];

/**
 * Written by preview-setup.ts: the bypass cookie plus a made cookie choice. Git-ignored,
 * and outside test-results/, which Playwright empties at the start of a run.
 */
export const PREVIEW_STATE_PATH = "playwright/.auth/preview.json";
