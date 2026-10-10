import { describe, expect, it } from "vitest";

import en from "../../messages/en.json";
import { draftLegalDocuments, legalDocuments } from "./legal";

describe("legal documents", () => {
  it("have copy for every section and list item, and nothing extra", () => {
    for (const [name, document] of Object.entries(legalDocuments)) {
      const copy: Record<
        string,
        { title: string; body: string; items?: Record<string, string> }
      > =
        name === "privacy"
          ? en.Legal.privacy.sections
          : en.Legal.terms.sections;
      expect(Object.keys(copy)).toEqual(document.sections.map((s) => s.key));

      for (const section of document.sections) {
        const entry = copy[section.key];
        expect(entry?.title).toBeTypeOf("string");
        expect(entry?.body).toBeTypeOf("string");
        if ("items" in section) {
          expect(Object.keys(entry?.items ?? {})).toEqual([...section.items]);
        }
      }
    }
  });

  it("use unique section anchors per document", () => {
    for (const document of Object.values(legalDocuments)) {
      const ids = document.sections.map((s) => s.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("never type the contact email into the copy", () => {
    expect(JSON.stringify(en.Legal)).not.toContain("@");
  });

  it("reports draft documents so the release check can fail on them", () => {
    expect(draftLegalDocuments()).toEqual(["privacy", "terms"]);
    expect(draftLegalDocuments({ privacy: { status: "reviewed" } })).toEqual(
      [],
    );
  });
});
