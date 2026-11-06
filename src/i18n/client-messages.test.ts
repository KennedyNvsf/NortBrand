import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import en from "../../messages/en.json";

import { CLIENT_MESSAGE_PATHS, pickMessages } from "./client-messages";

const SRC = join(__dirname, "..");

function clientFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return clientFiles(path);
    if (!/\.tsx?$/.test(entry.name) || /\.test\.tsx?$/.test(entry.name)) {
      return [];
    }
    const source = readFileSync(path, "utf8");
    return /^["']use client["']/m.test(source) ? [path] : [];
  });
}

/* Every `useTranslations("…")` namespace used in a client component. */
function clientNamespaces(): { file: string; namespace: string }[] {
  return clientFiles(SRC).flatMap((file) =>
    [...readFileSync(file, "utf8").matchAll(/useTranslations\(([^)]*)\)/g)].map(
      (match) => ({
        file: file.slice(SRC.length + 1),
        namespace: (match[1] ?? "").trim().replace(/^["']|["']$/g, ""),
      }),
    ),
  );
}

const covered = (namespace: string) =>
  CLIENT_MESSAGE_PATHS.some(
    (path) => namespace === path || namespace.startsWith(`${path}.`),
  );

describe("client messages", () => {
  it("covers every namespace a client component uses", () => {
    const used = clientNamespaces();
    expect(used.length).toBeGreaterThan(0);
    // An empty namespace (useTranslations()) would need the whole catalogue.
    expect(used.filter((u) => u.namespace === "")).toEqual([]);
    expect(used.filter((u) => !covered(u.namespace))).toEqual([]);
  });

  it("names only paths that exist in en.json", () => {
    const picked = pickMessages(en);
    for (const path of CLIENT_MESSAGE_PATHS) {
      const value = path
        .split(".")
        .reduce<unknown>(
          (node, part) =>
            typeof node === "object" && node !== null
              ? (node as Record<string, unknown>)[part]
              : undefined,
          picked,
        );
      expect(value, path).toBeTypeOf("object");
    }
  });

  it("keeps the nesting and leaves the rest out", () => {
    const picked = pickMessages(
      { A: { x: "1" }, B: { form: { y: "2" }, hero: { z: "3" } }, C: "4" },
      ["A", "B.form", "Missing.path"],
    );
    expect(picked).toEqual({ A: { x: "1" }, B: { form: { y: "2" } } });
  });
});
