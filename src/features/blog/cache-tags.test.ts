import { describe, expect, it } from "vitest";

import { BLOG_TAGS, tagsFor } from "./cache-tags";

describe("tagsFor", () => {
  it("refreshes the listing and the posts for every blog document", () => {
    for (const type of ["post", "author", "category", "translation.metadata"]) {
      expect(tagsFor(type)).toEqual([BLOG_TAGS.list, BLOG_TAGS.posts]);
    }
  });

  it("ignores anything else", () => {
    expect(tagsFor("sanity.imageAsset")).toEqual([]);
    expect(tagsFor("")).toEqual([]);
  });
});
