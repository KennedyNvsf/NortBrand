import { defineConfig, devices } from "@playwright/test";

// E2E_PORT lets the suite run on its own production server while `pnpm dev` keeps 3000.
const PORT = Number(process.env.E2E_PORT ?? 3000);
const baseURL = `http://localhost:${PORT}`;

// Chromium desktop + WebKit mobile (brief, "Testing"). Install browsers with
// `pnpm exec playwright install chromium webkit`.
export default defineConfig({
  testDir: "./tests/e2e",
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
    // spec clicks. consent.spec.ts starts without it.
    storageState: {
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
      origins: [],
    },
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["iPhone 14"] } },
    // CI only (#44): the iPhone 14 viewport, touch and user agent in Chromium. It is the
    // required mobile check, because WebKit on GitHub's Linux runners hangs and crashes
    // intermittently; WebKit ("mobile") still runs there as an informational check.
    ...(process.env.CI
      ? [
          {
            name: "mobile-chromium",
            use: { ...devices["iPhone 14"], browserName: "chromium" as const },
          },
        ]
      : []),
  ],
  webServer: {
    command: `pnpm build && pnpm start --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    // The consultation form talks to a fake backend (src/features/consultation/
    // e2e-backend.ts), so e2e never writes to Supabase or sends email. A reused server
    // must be started the same way: E2E_FAKE_BACKEND=1 pnpm start.
    env: { E2E_FAKE_BACKEND: "1" },
  },
});
