import { describe, expect, it } from "vitest";

import {
  buildPseudoMessages,
  findPseudoKeys,
  flattenKeys,
  isPseudo,
  pseudoLocalize,
} from "./pseudo";

describe("pseudoLocalize", () => {
  it("wraps the source in [[ ]] and pads it about 30%", () => {
    const source = "Book a Consultation";
    const pseudo = pseudoLocalize(source);

    expect(pseudo.startsWith(`[[${source} `)).toBe(true);
    expect(pseudo.endsWith("]]")).toBe(true);
    const padding = pseudo.length - source.length;
    expect(padding).toBeGreaterThanOrEqual(Math.round(source.length * 0.3));
  });

  it("keeps ICU arguments, plurals and rich-text tags verbatim", () => {
    const sources = [
      "Hello {name}",
      "{count, plural, one {# result} other {# results}}",
      "Read our <link>privacy policy</link>",
      "It''s {when, date, short}",
    ];
    for (const source of sources) {
      expect(pseudoLocalize(source)).toContain(source);
    }
  });

  it("pads with breakable runs so text can still wrap", () => {
    const pseudo = pseudoLocalize("x".repeat(40));
    expect(pseudo).not.toMatch(/~{5,}/);
    expect(pseudo).toMatch(/~ ~/);
  });

  it("pads even a one-character string", () => {
    expect(pseudoLocalize("a")).toBe("[[a ~]]");
  });
});

describe("isPseudo", () => {
  it("recognises only fully wrapped strings", () => {
    expect(isPseudo(pseudoLocalize("Close"))).toBe(true);
    expect(isPseudo("Fechar")).toBe(false);
    expect(isPseudo("See [[notes]] below")).toBe(false);
  });
});

describe("buildPseudoMessages", () => {
  const en = {
    Common: { close: "Close", sending: "Sending…" },
    Home: { title: "Minimalism, but functional." },
  };

  it("mirrors the English keys in order", () => {
    const pt = buildPseudoMessages(en, undefined);
    expect(flattenKeys(pt)).toEqual(flattenKeys(en));
    expect(findPseudoKeys(pt)).toEqual(flattenKeys(en));
  });

  it("keeps real translations and drops keys English no longer has", () => {
    const pt = buildPseudoMessages(en, {
      Common: { close: "Fechar", sending: pseudoLocalize("Sending…") },
      Stale: { gone: "Removido" },
    });

    expect(pt).toEqual({
      Common: { close: "Fechar", sending: pseudoLocalize("Sending…") },
      Home: { title: pseudoLocalize("Minimalism, but functional.") },
    });
  });

  it("replaces real translations with --reset", () => {
    const pt = buildPseudoMessages(
      en,
      { Common: { close: "Fechar" } },
      { reset: true },
    );
    expect(findPseudoKeys(pt)).toEqual(flattenKeys(en));
  });

  it("regenerates pseudo strings when the English source changes", () => {
    const pt = buildPseudoMessages(
      { Common: { close: "Close dialog" } },
      { Common: { close: pseudoLocalize("Close") } },
    );
    expect(pt).toEqual({ Common: { close: pseudoLocalize("Close dialog") } });
  });

  it("replaces a string with a group when the English shape changes", () => {
    const pt = buildPseudoMessages(
      { Common: { close: { label: "Close" } } },
      { Common: { close: "Fechar" } },
    );
    expect(pt).toEqual({
      Common: { close: { label: pseudoLocalize("Close") } },
    });
  });
});
