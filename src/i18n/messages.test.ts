import { describe, expect, it } from "vitest";

import en from "../../messages/en.json";
import pt from "../../messages/pt.json";

import { flattenKeys } from "./pseudo";

describe("messages", () => {
  it("en.json and pt.json have exactly the same keys", () => {
    const enKeys = flattenKeys(en);
    const ptKeys = new Set(flattenKeys(pt));

    expect({
      missingInPt: enKeys.filter((key) => !ptKeys.has(key)),
      extraInPt: [...ptKeys].filter((key) => !enKeys.includes(key)),
    }).toEqual({ missingInPt: [], extraInPt: [] });
  });
});
