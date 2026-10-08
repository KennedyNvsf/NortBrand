import { describe, expect, it } from "vitest";

import { isActiveRoute, isOverlayRoute, navItems } from "./navigation";

describe("isActiveRoute", () => {
  it("matches the page itself", () => {
    expect(isActiveRoute("/services", "/services")).toBe(true);
  });

  it("keeps a section active on its sub-pages", () => {
    expect(isActiveRoute("/blog/brand-refresh", "/blog")).toBe(true);
  });

  it("does not match a different page that shares a prefix", () => {
    expect(isActiveRoute("/blogroll", "/blog")).toBe(false);
  });

  it("marks nothing active on the home page", () => {
    expect(navItems.some(({ href }) => isActiveRoute("/", href))).toBe(false);
  });
});

describe("isOverlayRoute", () => {
  it("is only the Services page", () => {
    expect(isOverlayRoute("/services")).toBe(true);
    expect(isOverlayRoute("/")).toBe(false);
    expect(isOverlayRoute("/services/web-design")).toBe(false);
  });
});
