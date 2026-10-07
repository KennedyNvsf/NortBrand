import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Logo } from "./logo";

describe("Logo", () => {
  it("is an image named NortBrand by default", () => {
    const html = renderToStaticMarkup(<Logo />);
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="NortBrand"');
    expect(html).not.toContain("aria-hidden");
  });

  it("accepts a custom accessible name", () => {
    const html = renderToStaticMarkup(<Logo label="NortBrand home" />);
    expect(html).toContain('aria-label="NortBrand home"');
  });

  it("is hidden from assistive tech when decorative", () => {
    const html = renderToStaticMarkup(<Logo decorative />);
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toContain("role=");
    expect(html).not.toContain("aria-label");
  });

  it("uses tokens and currentColor, never hard-coded colours", () => {
    const html = renderToStaticMarkup(<Logo />);
    expect(html).toContain('fill="currentColor"');
    expect(html).toContain("stroke-action-primary");
    expect(html).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });

  it("merges size classes from the caller", () => {
    const html = renderToStaticMarkup(<Logo className="w-36" />);
    expect(html).toMatch(/class="[^"]*\bw-36\b/);
    expect(html).not.toMatch(/\bw-26\b/);
  });
});
