import { describe, expect, it } from "vitest";

import en from "../../../messages/en.json";
import pt from "../../../messages/pt.json";

import {
  consultationErrorKeys,
  consultationSchema,
  toFieldErrors,
  type ConsultationInput,
} from "./schema";

const valid: ConsultationInput = {
  name: "Ana Silva",
  email: "ana@example.com",
  phone: "+351 912 345 678",
  service: "web-design",
  message: "We need a new studio website.",
  locale: "pt",
};

function errorsFor(input: Record<string, unknown>) {
  const result = consultationSchema.safeParse(input);
  if (result.success) return {};
  return toFieldErrors(result.error);
}

describe("consultationSchema", () => {
  it("normalises a valid request the way the database stores it", () => {
    const result = consultationSchema.parse({
      ...valid,
      name: "  Ana Silva ",
      email: " Ana@Example.COM ",
      phone: "   ",
      message: "  We need a new studio website.  ",
    });
    expect(result).toEqual({
      ...valid,
      email: "ana@example.com",
      phone: undefined,
      message: "We need a new studio website.",
    });
  });

  it("accepts a request without a phone", () => {
    const { phone: _phone, ...withoutPhone } = valid;
    expect(consultationSchema.safeParse(withoutPhone).success).toBe(true);
  });

  it.each([
    [{ name: "   " }, { name: "nameRequired" }],
    [{ name: "a".repeat(121) }, { name: "nameTooLong" }],
    [{ email: "jo@company" }, { email: "emailInvalid" }],
    [{ email: `${"a".repeat(250)}@x.pt` }, { email: "emailInvalid" }],
    [{ phone: "call me" }, { phone: "phoneInvalid" }],
    [{ phone: "12345" }, { phone: "phoneInvalid" }],
    [{ service: "" }, { service: "serviceRequired" }],
    [{ service: "branding" }, { service: "serviceRequired" }],
    [{ message: "  " }, { message: "messageRequired" }],
    [{ message: "Too short" }, { message: "messageTooShort" }],
    [{ message: "a".repeat(5001) }, { message: "messageTooLong" }],
    [{ name: 42 }, { name: "nameRequired" }],
  ])("reports %o as %o", (change, expected) => {
    expect(errorsFor({ ...valid, ...change })).toEqual(expected);
  });

  it("reports one key per field, for every invalid field", () => {
    expect(errorsFor({ ...valid, name: "", email: "x", message: "" })).toEqual({
      name: "nameRequired",
      email: "emailInvalid",
      message: "messageRequired",
    });
  });

  it("has copy for every error key in both locales", () => {
    for (const key of consultationErrorKeys) {
      expect(en.Contact.form.errors[key]).toBeTruthy();
      expect(pt.Contact.form.errors[key]).toBeTruthy();
    }
  });
});
