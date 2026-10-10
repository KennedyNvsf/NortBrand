/**
 * pnpm check:release
 *
 * Strict release guard: exits non-zero while any messages file still contains pseudo
 * strings, or any legal document is still the unreviewed draft. Run before launch
 * (CLAUDE.md).
 */
import { fileURLToPath } from "node:url";

import { draftLegalDocuments } from "../src/content/legal.ts";
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

const drafts = draftLegalDocuments();
if (drafts.length > 0) {
  console.error(
    `Release guard: legal text awaiting review (src/content/legal.ts): ${drafts.join(", ")}`,
  );
  process.exitCode = 1;
} else {
  console.log("Release guard: legal documents reviewed.");
}
