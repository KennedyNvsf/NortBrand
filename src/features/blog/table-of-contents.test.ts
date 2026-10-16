import { describe, expect, it } from "vitest";

import { headingIds, slugify, tableOfContents } from "./table-of-contents";

const block = (key: string, style: string, text: string) => ({
  _type: "block",
  _key: key,
  style,
  children: [{ _type: "span", text }],
});

describe("table of contents", () => {
  const body = [
    block("a", "normal", "Lead paragraph"),
    block("b", "h2", "Start with what the business needs"),
    block("c", "h3", "A detail"),
    block("d", "h2", "Medir e depois melhorar"),
    block("e", "h2", "Start with what the business needs"),
    { _type: "image", _key: "f" },
  ];

  it("lists h2 sections only, with ids from their text", () => {
    expect(tableOfContents(body)).toEqual([
      {
        id: "start-with-what-the-business-needs",
        text: "Start with what the business needs",
      },
      { id: "medir-e-depois-melhorar", text: "Medir e depois melhorar" },
      {
        id: "start-with-what-the-business-needs-2",
        text: "Start with what the business needs",
      },
    ]);
  });

  it("gives h3 headings ids too, so they can be linked", () => {
    expect(headingIds(body).get("c")).toBe("a-detail");
  });

  it("makes ids safe for any heading text", () => {
    expect(slugify("Conteúdo & Marca: o guia")).toBe("conteudo-marca-o-guia");
    expect(slugify("!!!")).toBe("section");
    expect(tableOfContents(null)).toEqual([]);
  });
});
