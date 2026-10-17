import { describe, expect, it } from "vitest";

import { formatPostDate } from "./format";

describe("formatPostDate", () => {
  it("formats in the page's language on Lisbon time", () => {
    expect(formatPostDate("en", "2026-09-29T09:00:00.000Z", "day")).toBe(
      "Sep 29, 2026",
    );
    expect(formatPostDate("en", "2026-09-29T09:00:00.000Z", "month")).toBe(
      "Sep 2026",
    );
    expect(formatPostDate("pt", "2026-09-29T09:00:00.000Z", "day")).toBe(
      "29 de setembro de 2026",
    );
    expect(formatPostDate("pt", "2026-09-29T09:00:00.000Z", "month")).toBe(
      "setembro de 2026",
    );
  });

  it("uses the Lisbon date, not UTC", () => {
    // 23:30 UTC on 30 Sep is 00:30 on 1 Oct in Lisbon (WEST, UTC+1).
    expect(formatPostDate("en", "2026-09-30T23:30:00.000Z", "day")).toBe(
      "Oct 1, 2026",
    );
  });
});
