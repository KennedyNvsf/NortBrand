import { describe, expect, it } from "vitest";

import {
  listingQuery,
  PAGE_SIZE,
  pageRange,
  parseListingParams,
  searchPattern,
} from "./listing-params";

describe("parseListingParams", () => {
  it("defaults to everything, newest first, page 1", () => {
    expect(parseListingParams({})).toEqual({
      q: "",
      category: "",
      sort: "latest",
      page: 1,
    });
  });

  it("keeps valid values", () => {
    expect(
      parseListingParams({
        q: "  brand ",
        category: "branding",
        sort: "oldest",
        page: "2",
      }),
    ).toEqual({ q: "brand", category: "branding", sort: "oldest", page: 2 });
  });

  it("falls back on anything malformed instead of failing", () => {
    expect(
      parseListingParams({
        q: "x".repeat(81),
        category: "Robert); DROP",
        sort: "random",
        page: "-3",
      }),
    ).toEqual({ q: "", category: "", sort: "latest", page: 1 });
    expect(parseListingParams({ page: "2.5" }).page).toBe(1);
    expect(parseListingParams({ page: "99999" }).page).toBe(1);
  });

  it("takes the first value of a repeated key", () => {
    expect(
      parseListingParams({ category: ["design", "growth"] }).category,
    ).toBe("design");
  });
});

describe("searchPattern", () => {
  it("matches the start of each word", () => {
    expect(searchPattern("bra ref")).toEqual(["bra*", "ref*"]);
    expect(searchPattern("")).toBe("");
  });

  it("removes GROQ wildcards a visitor typed", () => {
    expect(searchPattern("*")).toBe("");
    expect(searchPattern("se*o")).toEqual(["se*", "o*"]);
  });

  it("uses at most eight words", () => {
    expect(searchPattern("a b c d e f g h i j")).toHaveLength(8);
  });
});

describe("pageRange", () => {
  it("slices eight posts per page", () => {
    expect(pageRange(1)).toEqual({ start: 0, end: PAGE_SIZE });
    expect(pageRange(3)).toEqual({ start: 16, end: 24 });
  });
});

describe("listingQuery", () => {
  const base = parseListingParams({});

  it("leaves defaults out of the URL", () => {
    expect(listingQuery(base, {})).toEqual({});
  });

  it("keeps the other filters and resets the page on a change", () => {
    const current = parseListingParams({
      q: "brand",
      category: "design",
      page: "3",
    });
    expect(listingQuery(current, { sort: "oldest" })).toEqual({
      q: "brand",
      category: "design",
      sort: "oldest",
    });
    expect(listingQuery(current, { category: "" })).toEqual({ q: "brand" });
  });

  it("changes only the page for pagination links", () => {
    const current = parseListingParams({ category: "design" });
    expect(listingQuery(current, { page: 2 })).toEqual({
      category: "design",
      page: "2",
    });
  });
});
