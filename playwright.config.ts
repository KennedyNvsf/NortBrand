import { defineConfig, devices } from "@playwright/test";

import {
  onPreview,
  PREVIEW_IGNORED,
  PREVIEW_STATE_PATH,
  previewURL,
} from "./tests/e2e/target";
import { promoDismissedOrigin } from "./tests/e2e/promo-state";

// E2E_PORT lets the suite run on its own production server while `pnpm dev` keeps 3000.
const PORT = Number(process.env.E2E_PORT ?? 3000);
const localURL = `http://localhost:${PORT}`;
// E2E_BASE_URL: run against a Vercel preview instead of a local build (tests/e2e/target.ts).
const baseURL = onPreview && previewURL ? previewURL : localURL;

// Chromium desktop + WebKit mobile (brief, "Testing"). Install browsers with
// `pnpm exec playwright install chromium webkit`.
export default defineConfig({
  testDir: "./tests/e2e",
  ...(onPreview && {
    testIgnore: PREVIEW_IGNORED,
    globalSetup: "./tests/e2e/preview-setup.ts",
  }),
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // GitHub's 2-vCPU runners render WebKit in software and run one worker: animations
  // and hydration take several times longer than on a laptop. Locally the defaults
  // (30 s, 5 s) stay, so real slowness still shows there.
  ...(process.env.CI && { timeout: 60_000, expect: { timeout: 10_000 } }),
  // CI: annotations on the PR, plus an HTML report (with traces from retries) that the
  // workflow uploads when a test fails.
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    // A cookie choice is already made, so the consent banner (#42) never covers what a
    // spec clicks. consent.spec.ts starts without it. On a preview, the setup file adds
    // the same cookie next to Vercel's bypass cookie. The Home promo is marked as
    // dismissed for the same reason (tests/e2e/promo-state.ts).
    storageState: onPreview
      ? PREVIEW_STATE_PATH
      : {
          cookies: [
            {
              name: "nb_consent",
              value: "v1.0",
              domain: "localhost",
              path: "/",
              expires: -1,
              httpOnly: false,
              secure: false,
              sameSite: "Lax",
            },
          ],
          origins: [promoDismissedOrigin(localURL)],
        },
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["iPhone 14"] } },
    // CI only (#44): the iPhone 14 viewport, touch and user agent in Chromium. It is the
    // required mobile check, because WebKit on GitHub's Linux runners hangs and crashes
    // intermittently. WebKit ("mobile") runs locally only since #184 (docs/guides/ci.md).
    ...(process.env.CI
      ? [
          {
            name: "mobile-chromium",
            use: { ...devices["iPhone 14"], browserName: "chromium" as const },
          },
        ]
      : []),
  ],
  // No local server on a preview run: the deployment is the server.
  ...(!onPreview && {
    webServer: {
      command: `pnpm build && pnpm start --port ${PORT}`,
      url: localURL,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      // The consultation form talks to a fake backend (src/features/consultation/
      // e2e-backend.ts), so e2e never writes to Supabase or sends email. A reused server
      // must be started the same way: E2E_FAKE_BACKEND=1 pnpm start.
      env: { E2E_FAKE_BACKEND: "1" },
    },
  }),
});
