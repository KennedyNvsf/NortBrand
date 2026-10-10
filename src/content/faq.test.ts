import { describe, expect, it } from "vitest";

import en from "../../messages/en.json";
import { faqKeys } from "./faq";

describe("faq", () => {
  it("has a question and an answer for every key, and nothing extra", () => {
    expect(Object.keys(en.Contact.faq.items)).toEqual([...faqKeys]);
    for (const key of faqKeys) {
      const { question, answer } = en.Contact.faq.items[key];
      expect(question.length).toBeGreaterThan(0);
      expect(answer.length).toBeGreaterThan(0);
    }
  });
});
