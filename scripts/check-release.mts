/**
 * pnpm check:release
 *
 * Strict release guard: exits non-zero while any messages file still contains pseudo
 * strings, any legal document is still the unreviewed draft, or any contact detail in
 * src/content/site.ts is still a placeholder (#79). Run before launch (CLAUDE.md).
 */
import { fileURLToPath } from "node:url";

import { draftLegalDocuments } from "../src/content/legal.ts";
import { unconfirmedSiteDetails } from "../src/content/site.ts";
import {
  runReleaseGuard,
  runSiteDetailsGuard,
} from "../src/i18n/release-guard.ts";

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

try {
  runSiteDetailsGuard(unconfirmedSiteDetails(), { strict: true });
  console.log("Release guard: contact details confirmed.");
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
