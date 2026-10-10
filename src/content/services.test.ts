import { describe, expect, it } from "vitest";
import { z } from "zod";

import en from "../../messages/en.json";
import { includedKeys, serviceSlugs, services } from "./services";

describe("services", () => {
  it("lists every slug once, in slug order", () => {
    expect(services.map(({ slug }) => slug)).toEqual([...serviceSlugs]);
  });

  it("exports slugs the consultation form can validate against", () => {
    const service = z.enum(serviceSlugs);
    expect(service.safeParse("web-design").success).toBe(true);
    expect(service.safeParse("seo").success).toBe(false);
  });

  it("has Services page copy for every service", () => {
    for (const { key } of services) {
      const item = en.Services.items[key];
      expect(item.title).toMatch(/<greenUnderline>.+<\/greenUnderline>/);
      expect(item.details.length).toBeGreaterThan(0);
      expect(Object.keys(item.included)).toEqual([...includedKeys]);
    }
  });
});
