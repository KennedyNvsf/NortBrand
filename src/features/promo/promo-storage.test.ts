// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  dismissPromo,
  isPromoDismissed,
  PROMO_STORAGE_KEY,
} from "./promo-storage";

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe("promo storage", () => {
  it("is not dismissed on a first visit", () => {
    expect(isPromoDismissed("offer-a")).toBe(false);
  });

  it("remembers a dismissed offer", () => {
    dismissPromo("offer-a");
    expect(window.localStorage.getItem(PROMO_STORAGE_KEY)).toBe("offer-a");
    expect(isPromoDismissed("offer-a")).toBe(true);
  });

  it("shows a new offer to a visitor who dismissed an older one", () => {
    dismissPromo("offer-a");
    expect(isPromoDismissed("offer-b")).toBe(false);
  });

  it("counts the offer as dismissed when storage can't be read", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    expect(isPromoDismissed("offer-a")).toBe(true);
  });

  it("ignores a failed write", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    expect(() => {
      dismissPromo("offer-a");
    }).not.toThrow();
  });
});
