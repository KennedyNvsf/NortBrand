import type { ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({
  // A plain stand-in for next/image, so the markup can be read in a unit test.
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ alt, src }: ComponentProps<"img">) => <img alt={alt} src={src} />,
}));
vi.mock("@/env", () => ({
  publicEnv: {
    NEXT_PUBLIC_SANITY_PROJECT_ID: "p4bc960d",
    NEXT_PUBLIC_SANITY_DATASET: "development",
  },
}));

const { PostBody } = await import("./post-body");

type Item = { _type: string; _key: string; [field: string]: unknown };
const render = (body: Item[]) => renderToStaticMarkup(<PostBody body={body} />);

const span = (text: string, marks: string[] = []) => ({
  _type: "span",
  _key: text,
  text,
  marks,
});

describe("PostBody", () => {
  it("renders headings with the table of contents ids", () => {
    const html = render([
      {
        _type: "block",
        _key: "h",
        style: "h2",
        markDefs: [],
        children: [span("Measure, then improve")],
      },
    ]);
    expect(html).toContain('<h2 id="measure-then-improve"');
  });

  it("escapes text and never renders raw HTML", () => {
    const html = render([
      {
        _type: "block",
        _key: "p",
        style: "normal",
        markDefs: [],
        children: [span("<script>alert(1)</script>")],
      },
      { _type: "html", _key: "x", html: "<iframe src='x'></iframe>" },
    ]);
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<iframe");
    expect(html).toContain("&lt;script&gt;");
  });

  it("marks external links noopener and keeps site links relative", () => {
    const html = render([
      {
        _type: "block",
        _key: "l",
        style: "normal",
        markDefs: [
          { _type: "link", _key: "ext", href: "https://example.com" },
          { _type: "link", _key: "int", href: "/en/contact" },
        ],
        children: [span("out", ["ext"]), span("in", ["int"])],
      },
    ]);
    expect(html).toContain(
      'href="https://example.com" rel="noopener noreferrer"',
    );
    expect(html).toMatch(/href="\/en\/contact" class=/);
  });

  it("renders body images with their alt text and caption", () => {
    const html = render([
      {
        _type: "image",
        _key: "i",
        asset: { _ref: "image-abc123-1600x900-jpg" },
        alt: "A designer sketching layouts",
        caption: "Early sketches",
      },
    ]);
    expect(html).toContain('alt="A designer sketching layouts"');
    expect(html).toContain(
      "cdn.sanity.io/images/p4bc960d/development/abc123-1600x900.jpg",
    );
    expect(html).toContain("<figcaption");
  });

  it("renders nothing for an empty body", () => {
    expect(render([])).toBe("");
  });
});
