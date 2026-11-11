/**
 * Prints a Markdown table of Lighthouse scores from `lhci upload --target=filesystem`
 * (.lighthouseci/reports/manifest.json). CI appends it to the run summary (#83).
 * Locally, after collect and upload: `node scripts/lighthouse-summary.mts`.
 */
import { readFileSync } from "node:fs";

import { z } from "zod";

const MANIFEST = ".lighthouseci/reports/manifest.json";

const CATEGORIES = [
  ["performance", "Performance"],
  ["accessibility", "Accessibility"],
  ["best-practices", "Best practices"],
  ["seo", "SEO"],
] as const;

// Only the fields this table reads; lhci writes more.
const manifestSchema = z.array(
  z.object({
    url: z.string(),
    isRepresentativeRun: z.boolean(),
    summary: z.record(z.string(), z.number().nullable()),
  }),
);

function readRuns(): z.infer<typeof manifestSchema> | null {
  let raw: string;
  try {
    raw = readFileSync(MANIFEST, "utf8");
  } catch {
    // No manifest: collect failed before measuring a page. Say so in the summary and
    // exit cleanly, so the collect step's error stays the one people read.
    return null;
  }
  return manifestSchema.parse(JSON.parse(raw));
}

const score = (value: number | null | undefined) =>
  typeof value === "number" ? String(Math.round(value * 100)) : "–";

const runs = readRuns();
if (!runs || runs.length === 0) {
  console.log(
    "### Lighthouse\n\nNo results: the collect step failed. See its log.",
  );
} else {
  const lines = [
    "### Lighthouse (mobile)",
    "",
    `| Page | ${CATEGORIES.map(([, label]) => label).join(" | ")} |`,
    `| --- | ${CATEGORIES.map(() => "---:").join(" | ")} |`,
  ];
  for (const run of runs.filter((r) => r.isRepresentativeRun)) {
    const cells = CATEGORIES.map(([key]) => score(run.summary[key]));
    lines.push(`| \`${new URL(run.url).pathname}\` | ${cells.join(" | ")} |`);
  }
  lines.push(
    "",
    "Full reports: this run's `lighthouse-reports` artifact. Budgets: `lighthouserc.json`.",
  );
  console.log(lines.join("\n"));
}
