import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { icons } from "@/lib/icons";

import { Badge } from "./badge";
import { FieldError } from "./field-error";

describe("Badge", () => {
  it("defaults to neutral", () => {
    const html = renderToStaticMarkup(<Badge>New</Badge>);
    expect(html).toContain('data-variant="neutral"');
    expect(html).toContain("bg-border-default");
  });

  it("uses red/600 text for the accent variant (contrast override)", () => {
    const html = renderToStaticMarkup(<Badge variant="accent">New</Badge>);
    expect(html).toContain("text-text-accent");
    expect(html).not.toContain("text-action-primary ");
  });

  it("can style a filter-chip button through asChild", () => {
    const html = renderToStaticMarkup(
      <Badge asChild variant="selected">
        <button type="button" aria-pressed="true">
          All
        </button>
      </Badge>,
    );
    expect(html).toMatch(/^<button [^>]*aria-pressed="true"/);
    expect(html).toContain("bg-text-primary");
  });
});

describe("FieldError", () => {
  it("pairs a decorative icon with the message text", () => {
    const html = renderToStaticMarkup(
      <FieldError id="service-error">Please choose a service</FieldError>,
    );
    expect(html).toContain('id="service-error"');
    expect(html).toMatch(/<svg[^>]*aria-hidden="true"/);
    expect(html).toContain("Please choose a service");
  });
});

describe("icons", () => {
  it("maps every Figma icon in the set", () => {
    expect(Object.keys(icons).sort()).toEqual(
      [
        "arrow-right",
        "calendar",
        "check",
        "chevron-down",
        "close",
        "code",
        "gear",
        "layout",
        "mail",
        "menu",
        "pencil",
        "phone",
        "share",
      ].sort(),
    );
  });
});
