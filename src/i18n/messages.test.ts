import { describe, expect, it } from "vitest";

import en from "../../messages/en.json";
import pt from "../../messages/pt.json";

import { flattenKeys, type MessageTree } from "./pseudo";

function valueAt(tree: MessageTree, key: string): string | undefined {
  let node: string | MessageTree | undefined = tree;
  for (const part of key.split(".")) {
    node = typeof node === "object" ? node[part] : undefined;
  }
  return typeof node === "string" ? node : undefined;
}

/*
 * What a translation must carry over unchanged: ICU argument names ({year},
 * {count, plural, …}) and rich-text tags (<green>, </red>). The words inside
 * plural branches are translated, so only an argument counts: a name directly
 * followed by `}` or `,`. Branch text that opens with a word ({Faltam # dias}) and
 * branch keywords such as `one` or `other` don't.
 */
const ICU_KEYWORDS = new Set([
  "plural",
  "select",
  "selectordinal",
  "zero",
  "one",
  "two",
  "few",
  "many",
  "other",
]);

function messageTokens(message: string): { args: string[]; tags: string[] } {
  const args = [...message.matchAll(/\{\s*([A-Za-z_]\w*)\s*[,}]/g)]
    .map((match) => match[1] ?? "")
    .filter((name) => !ICU_KEYWORDS.has(name));
  const tags = [...message.matchAll(/<\/?[A-Za-z]\w*\s*\/?>/g)].map((match) =>
    match[0].replace(/\s/g, ""),
  );
  return { args: [...new Set(args)].sort(), tags: tags.sort() };
}

describe("messages", () => {
  it("en.json and pt.json have exactly the same keys", () => {
    const enKeys = flattenKeys(en);
    const ptKeys = new Set(flattenKeys(pt));

    expect({
      missingInPt: enKeys.filter((key) => !ptKeys.has(key)),
      extraInPt: [...ptKeys].filter((key) => !enKeys.includes(key)),
    }).toEqual({ missingInPt: [], extraInPt: [] });
  });

  it("every Portuguese string keeps the English placeholders and rich-text tags", () => {
    const mismatches = flattenKeys(en).flatMap((key) => {
      const source = messageTokens(valueAt(en, key) ?? "");
      const translation = messageTokens(valueAt(pt, key) ?? "");
      return JSON.stringify(source) === JSON.stringify(translation)
        ? []
        : [{ key, en: source, pt: translation }];
    });

    expect(mismatches).toEqual([]);
  });
});
