import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { motionTokens } from "./motion";

/*
 * CSS transitions read the motion tokens from globals.css, Motion animations from
 * motion.ts. Both must describe the same animation language.
 */
const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

function cssVariable(name: string) {
  const match = new RegExp(`--${name}:\\s*([^;]+);`).exec(css);
  if (!match?.[1]) throw new Error(`--${name} is not defined in globals.css`);
  return match[1].trim();
}

describe("motion tokens", () => {
  it.each(Object.entries(motionTokens.duration))(
    "--duration-%s matches motion.ts",
    (name, seconds) => {
      expect(cssVariable(`duration-${name}`)).toBe(`${seconds * 1000}ms`);
    },
  );

  it.each(Object.entries(motionTokens.ease))(
    "--ease-%s matches motion.ts",
    (name, curve) => {
      expect(cssVariable(`ease-${name}`)).toBe(
        `cubic-bezier(${curve.join(", ")})`,
      );
    },
  );
});
