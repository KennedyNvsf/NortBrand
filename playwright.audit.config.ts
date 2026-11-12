import { defineConfig, devices } from "@playwright/test";

/*
 * The pre-launch accessibility audit (#84, docs/accessibility-audit.md § 4): every page,
 * in EN and PT, at 1440 / 768 / 390 / 320. Not part of `pnpm test:e2e` or CI: it is a
 * report generator, run by hand against a production build that is already serving:
 *
 *   pnpm build && E2E_FAKE_BACKEND=1 pnpm start --port 3100
 *   E2E_PORT=3100 pnpm a11y:audit                 # Chromium, every check
 *   E2E_PORT=3100 pnpm a11y:audit --project=webkit  # Safari's engine (§ 4.1)
 *
 * Results land in test-results/a11y-audit/*.json; `node tests/audit/summary.mjs`
 * prints the per-page table for the report.
 */

const PORT = Number(process.env.E2E_PORT ?? 3100);

export default defineConfig({
  testDir: "./tests/audit",
  testMatch: "*.spec.ts",
  // Playwright empties its outputDir before every run; keep it apart from the audit's
  // JSON (test-results/a11y-audit), so partial reruns add to the results.
  outputDir: "test-results/a11y-audit-artifacts",
  fullyParallel: true,
  // Two: each worker opens a browser per width, and four ran a 16 GB laptop out of memory.
  workers: 2,
  // A page runs up to four widths, each with axe, a full scroll, a keyboard walk and
  // the touch-target probe.
  timeout: 240_000,
  reporter: "list",
  use: { baseURL: `http://localhost:${String(PORT)}` },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
});
