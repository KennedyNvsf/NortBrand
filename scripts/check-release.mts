/**
 * pnpm check:release
 *
 * Strict release guard: exits non-zero while any messages file still contains pseudo
 * strings. Run before launch (CLAUDE.md).
 */
import { fileURLToPath } from "node:url";

import { runReleaseGuard } from "../src/i18n/release-guard.ts";

try {
  runReleaseGuard(fileURLToPath(new URL("../messages", import.meta.url)), {
    strict: true,
  });
  console.log("Release guard: no placeholder translations.");
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
