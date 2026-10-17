import { describe, expect, it } from "vitest";

import { postPaths, readingMinutes, translatedLocales } from "./post";

const paragraph = (words: number) => ({
  _type: "block",
  children: [{ text: Array.from({ length: words }, () => "word").join(" ") }],
});

describe("readingMinutes", () => {
  it("rounds up at 200 words a minute and counts text blocks only", () => {
    expect(readingMinutes([paragraph(200)])).toBe(1);
    expect(readingMinutes([paragraph(201)])).toBe(2);
    expect(
      readingMinutes([paragraph(300), { _type: "image" }, paragraph(300)]),
    ).toBe(3);
  });

  it("is at least one minute, even for an empty body", () => {
    expect(readingMinutes([])).toBe(1);
    expect(readingMinutes(null)).toBe(1);
  });
});

describe("postPaths", () => {
  it("links each language to its translation", () => {
    expect(
      postPaths("en", "brand-refresh", [
        { language: "en", slug: "brand-refresh" },
        { language: "pt", slug: "renovar-a-marca" },
      ]),
    ).toEqual({ en: "/blog/brand-refresh", pt: "/blog/renovar-a-marca" });
  });

  it("falls back to the other language's listing without a translation", () => {
    expect(postPaths("en", "only-english", null)).toEqual({
      en: "/blog/only-english",
      pt: "/blog",
    });
    expect(postPaths("pt", "so-pt", [null])).toEqual({
      en: "/blog",
      pt: "/blog/so-pt",
    });
  });
});

describe("translatedLocales", () => {
  it("lists the post's own language and its real translations only", () => {
    expect(translatedLocales("en", null)).toEqual(["en"]);
    expect(
      translatedLocales("pt", [
        { language: "en", slug: "a" },
        { language: "pt", slug: "b" },
      ]),
    ).toEqual(["en", "pt"]);
  });
});
