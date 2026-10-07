import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { pseudoLocalize } from "./pseudo";
import { isReleaseBuild, runReleaseGuard, scanMessages } from "./release-guard";

let dir: string;

function writeMessages(file: string, messages: object) {
  writeFileSync(path.join(dir, file), JSON.stringify(messages));
}

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "messages-"));
  writeMessages("en.json", { Common: { close: "Close" } });
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  vi.restoreAllMocks();
});

describe("isReleaseBuild", () => {
  it("is strict on Vercel production or RELEASE_BUILD=1 only", () => {
    expect(isReleaseBuild({ VERCEL_ENV: "production" })).toBe(true);
    expect(isReleaseBuild({ RELEASE_BUILD: "1" })).toBe(true);
    expect(isReleaseBuild({ VERCEL_ENV: "preview" })).toBe(false);
    expect(isReleaseBuild({ RELEASE_BUILD: "0" })).toBe(false);
    expect(isReleaseBuild({})).toBe(false);
  });
});

describe("runReleaseGuard", () => {
  it("passes silently when no pseudo strings remain", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    writeMessages("pt.json", { Common: { close: "Fechar" } });

    expect(runReleaseGuard(dir, { strict: true })).toEqual([]);
    expect(warn).not.toHaveBeenCalled();
  });

  it("lists every pseudo key per file", () => {
    writeMessages("pt.json", {
      Common: { close: pseudoLocalize("Close"), open: "Abrir" },
      Home: { title: pseudoLocalize("Title") },
    });

    expect(scanMessages(dir)).toEqual([
      { file: "pt.json", keys: ["Common.close", "Home.title"] },
    ]);
  });

  it("throws in strict mode", () => {
    writeMessages("pt.json", { Common: { close: pseudoLocalize("Close") } });
    expect(() => runReleaseGuard(dir, { strict: true })).toThrow(
      /Common\.close/,
    );
  });

  it("only warns outside release builds", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    writeMessages("pt.json", { Common: { close: pseudoLocalize("Close") } });

    expect(runReleaseGuard(dir, { strict: false })).toHaveLength(1);
    expect(warn).toHaveBeenCalledOnce();
  });
});
