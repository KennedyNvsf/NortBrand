/*
 * Fails if the Supabase service-role key could reach a browser (ADR-009, #132).
 * Run after `pnpm build`: it scans every file Next.js serves to browsers (.next/static)
 * for the key's variable name and, when the key is set in this environment, its value.
 * CI runs it after every build (docs/guides/ci.md).
 *
 *   pnpm check:bundles
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const STATIC_DIR = join(process.cwd(), ".next", "static");

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

let all: string[];
try {
  all = files(STATIC_DIR);
} catch {
  console.error("No .next/static: run `pnpm build` first.");
  process.exit(1);
}

const needles = ["SUPABASE_SERVICE_ROLE_KEY"];
const value = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (value && value.length >= 20) needles.push(value);

const leaks = all.filter((path) => {
  if (!/\.(js|mjs|css|html|json|map|txt)$/.test(path)) return false;
  const content = readFileSync(path, "utf8");
  return needles.some((needle) => content.includes(needle));
});

if (leaks.length > 0) {
  console.error("The service-role key (or its name) is in client bundles:");
  for (const path of leaks) console.error(`  ${path}`);
  process.exit(1);
}

console.log(
  `Client bundles are clean: ${String(all.length)} files, no service-role key${value ? " (name and value checked)" : " (name checked)"}.`,
);
