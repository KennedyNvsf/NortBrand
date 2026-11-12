// Prints the audit results (test-results/a11y-audit/*.json) as the per-page table in
// docs/accessibility-audit.md § 3, then every failure in detail. Usage:
//   node tests/audit/summary.mjs [chromium|webkit]
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const DIR = path.join("test-results", "a11y-audit");
const browser = process.argv[2] ?? "chromium";
const COLUMNS = [
  ["axe", "axe"],
  ["structure", "One H1, one `main`"],
  ["langTitle", "`lang`, title"],
  ["seo", "Canonical, `hreflang`"],
  ["overflow", "No overflow"],
  ["reducedMotion", "Reduced motion"],
  ["touch", "44 px targets"],
  ["keyboard", "Keyboard"],
  ["images", "Alt, heading order"],
];

const results = readdirSync(DIR)
  .filter((file) => file.startsWith(`${browser}-`) && file.endsWith(".json"))
  .map((file) => JSON.parse(readFileSync(path.join(DIR, file), "utf8")));

const order = [
  "Home",
  "Services",
  "About",
  "Contact",
  "Privacy Policy",
  "Terms of Use",
  "Newsletter confirm",
  "Newsletter unsubscribe",
  "Blog",
  "404 (unknown page)",
  "404 (unknown post)",
  "Post 1",
  "Post 2",
  "Post 3",
];
results.sort(
  (a, b) =>
    order.indexOf(a.page) - order.indexOf(b.page) ||
    a.locale.localeCompare(b.locale),
);

const cell = (result, key) => {
  const checks = Object.values(result.widths)
    .map((width) => width[key])
    .filter(Boolean);
  if (checks.length === 0) return "—";
  return checks.every((check) => check.pass) ? "✓" : "✗";
};

console.log(
  `| Page | Locale | Status | ${COLUMNS.map(([, title]) => title).join(" | ")} |`,
);
console.log(`| --- | --- | --- | ${COLUMNS.map(() => "---").join(" | ")} |`);
for (const result of results) {
  console.log(
    `| ${result.page} | ${result.locale.toUpperCase()} | ${result.status} | ${COLUMNS.map(([key]) => cell(result, key)).join(" | ")} |`,
  );
}

console.log(`\n${results.length} pages, ${browser}.`);
const failures = results.flatMap((result) =>
  Object.entries(result.widths).flatMap(([width, checks]) =>
    Object.entries(checks)
      .filter(([, check]) => !check.pass)
      .map(
        ([key, check]) =>
          `${result.page} (${result.locale}) @${width} ${key}: ${check.detail ?? ""}`,
      ),
  ),
);
console.log(
  failures.length ? `Failures:\n${failures.join("\n")}` : "No failures.",
);

const stops = results.flatMap((result) =>
  Object.entries(result.widths)
    .filter(([, checks]) => checks.keyboard)
    .map(([width, checks]) => [
      width,
      Number.parseInt(checks.keyboard.detail, 10),
    ]),
);
for (const width of new Set(stops.map(([width]) => width))) {
  const counts = stops.filter(([w]) => w === width).map(([, n]) => n);
  console.log(
    `Keyboard stops at ${width}: ${Math.min(...counts)}–${Math.max(...counts)}`,
  );
}
