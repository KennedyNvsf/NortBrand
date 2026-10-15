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
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL, trace: "on-first-retry" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["iPhone 14"] } },
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
