import { describe, expect, it } from "vitest";

import { isPromoActive, promo } from "./promo";

describe("isPromoActive", () => {
  it("is active before the end date", () => {
    expect(isPromoActive(new Date("2026-11-30T09:00:00Z"))).toBe(true);
  });

  it("is active until the last second of 31 December in Lisbon", () => {
    expect(isPromoActive(new Date("2026-12-31T23:59:59Z"))).toBe(true);
  });

  it("is inactive from 1 January", () => {
    expect(isPromoActive(new Date("2027-01-01T00:00:00Z"))).toBe(false);
  });

  it("reads the end date from the offer it is given", () => {
    const ended = { ...promo, endsAt: "2026-01-01T00:00:00Z" };
    expect(isPromoActive(new Date("2026-06-01T00:00:00Z"), ended)).toBe(false);
  });

  it("has a valid end instant and a delay", () => {
    expect(Number.isNaN(Date.parse(promo.endsAt))).toBe(false);
    expect(promo.delayMs).toBeGreaterThan(0);
  });
});
