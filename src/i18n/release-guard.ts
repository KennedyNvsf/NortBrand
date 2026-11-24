import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { findPseudoKeys, type MessageTree } from "./pseudo.ts";

/*
 * Release guard (CLAUDE.md). Pseudo strings left in any messages file fail a release
 * build (VERCEL_ENV=production or RELEASE_BUILD=1, or `pnpm check:release`) and only
 * warn otherwise. Imported by next.config.ts and scripts/check-release.mts, so it must
 * stay free of Next.js and path-alias imports, and use explicit `.ts` extensions so
 * Node can run it directly (type stripping).
 */

export type PseudoReport = { file: string; keys: string[] }[];

export function scanMessages(messagesDir: string): PseudoReport {
  return readdirSync(messagesDir)
    .filter((file) => file.endsWith(".json"))
    .sort()
    .map((file) => ({
      file,
      keys: findPseudoKeys(
        JSON.parse(
          readFileSync(path.join(messagesDir, file), "utf8"),
        ) as MessageTree,
      ),
    }))
    .filter(({ keys }) => keys.length > 0);
}

export function isReleaseBuild(
  env: Readonly<Record<string, string | undefined>>,
): boolean {
  return env.VERCEL_ENV === "production" || env.RELEASE_BUILD === "1";
}

export function formatReport(report: PseudoReport, limit = 10): string {
  return report
    .map(({ file, keys }) => {
      const shown = keys.slice(0, limit).map((key) => `    ${key}`);
      const more =
        keys.length > limit ? [`    … and ${keys.length - limit} more`] : [];
      return [
        `  messages/${file}: ${keys.length} pseudo string(s)`,
        ...shown,
        ...more,
      ].join("\n");
    })
    .join("\n");
}

/**
 * Throws in strict mode when pseudo strings remain; otherwise prints a warning.
 * Returns the report so callers can decide what else to print.
 */
export function runReleaseGuard(
  messagesDir: string,
  { strict }: { strict: boolean },
): PseudoReport {
  const report = scanMessages(messagesDir);
  if (report.length === 0) return report;

  const details = formatReport(report);
  if (strict) {
    throw new Error(
      `Release guard: placeholder translations remain.\n${details}\nReplace them with the final translations before releasing.`,
    );
  }
  console.warn(
    `⚠ Release guard: placeholder translations remain (allowed outside release builds).\n${details}`,
  );
  return report;
}

/**
 * Contact details still marked `placeholder` in src/content/site.ts (#79), passed in as
 * `unconfirmedSiteDetails()` so this file stays free of content imports. Same rule as
 * the translations: strict builds throw, other builds warn.
 */
export function runSiteDetailsGuard(
  unconfirmed: readonly string[],
  { strict }: { strict: boolean },
): void {
  if (unconfirmed.length === 0) return;

  const list = unconfirmed.map((detail) => `    ${detail}`).join("\n");
  if (strict) {
    throw new Error(
      `Release guard: unconfirmed contact details in src/content/site.ts.\n${list}\nConfirm them (placeholder: false) before releasing.`,
    );
  }
  console.warn(
    `⚠ Release guard: unconfirmed contact details in src/content/site.ts (allowed outside release builds).\n${list}`,
  );
}
