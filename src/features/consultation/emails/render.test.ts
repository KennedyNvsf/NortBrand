import { describe, expect, it } from "vitest";

import pt from "../../../../messages/pt.json";

import type { ConsultationRequest } from "../schema";
import {
  formatLisbonTime,
  renderConsultationAlert,
  renderConsultationConfirmation,
} from "./render";

const request: ConsultationRequest = {
  name: "Ana Silva",
  email: "ana@example.com",
  phone: "+351 912 345 678",
  service: "web-design",
  message: "We need a new studio website.\nTwo languages, a booking form.",
  locale: "en",
};
const requestId = "00000000-0000-0000-0000-000000000001";
// 20:46 UTC is 21:46 in Lisbon (WEST, UTC+1, until the last Sunday of October).
const receivedAt = new Date("2026-10-15T20:46:00Z");

function expectSafeEmail(html: string) {
  // No images at all, so nothing can load remotely or track an open.
  expect(html).not.toMatch(/<img\b/i);
  expect(html).not.toMatch(/\bsrc=/i);
  expect(html).not.toMatch(/<script\b/i);
}

describe("formatLisbonTime", () => {
  it("shows Lisbon wall-clock time, across the daylight-saving change", () => {
    expect(formatLisbonTime(receivedAt)).toContain("21:46");
    // 26 October 2026 is after the change back to WET (UTC+0).
    expect(formatLisbonTime(new Date("2026-10-26T09:00:00Z"))).toContain(
      "09:00",
    );
  });
});

describe("renderConsultationAlert", () => {
  it("contains every field, the Lisbon time and the reference", async () => {
    const email = await renderConsultationAlert(request, requestId, receivedAt);

    expect(email.subject).toBe(
      "New consultation request: Ana Silva · UX/UI & Brand Design",
    );
    for (const value of [
      "Ana Silva",
      "ana@example.com",
      "+351 912 345 678",
      "UX/UI & Brand Design",
      "English",
      "Thursday, 15 October 2026 at 21:46 (Lisbon time)",
      requestId,
      "Two languages, a booking form.",
    ]) {
      expect(email.text).toContain(value);
      // The HTML escapes "&" (in "UX/UI & Brand Design").
      expect(email.html).toContain(value.replaceAll("&", "&amp;"));
    }
    expect(email.html).toContain('href="mailto:ana@example.com"');
    expect(email.html).toContain('href="tel:+351912345678"');
    expect(email.html).toContain('lang="en"');
    expectSafeEmail(email.html);
  });

  it("says when no phone was given", async () => {
    const email = await renderConsultationAlert(
      { ...request, phone: undefined },
      requestId,
      receivedAt,
    );
    expect(email.text).toContain("Not given");
  });

  it("escapes what the visitor typed and keeps the subject on one line", async () => {
    const email = await renderConsultationAlert(
      {
        ...request,
        name: "Ana\nBcc: x@example.com",
        message:
          '<script>alert("x")</script> <a href="https://evil.example">x</a>',
      },
      requestId,
      receivedAt,
    );

    expect(email.subject).not.toMatch(/[\r\n]/);
    expect(email.html).toContain("&lt;script&gt;");
    expect(email.html).not.toContain('href="https://evil.example"');
    expectSafeEmail(email.html);
  });

  it("matches the snapshot", async () => {
    const email = await renderConsultationAlert(request, requestId, receivedAt);
    expect({ subject: email.subject, text: email.text }).toMatchSnapshot();
  });
});

describe("renderConsultationConfirmation", () => {
  it("is in English for an English request and promises a reply within one business day", async () => {
    const email = await renderConsultationConfirmation(request);

    expect(email.subject).toBe("We’ve received your request");
    // The plain-text version uppercases headings, so the greeting is checked in HTML.
    expect(email.html).toContain("Hi Ana Silva,");
    expect(email.text).toContain("within one business day");
    expect(email.text).toContain("UX/UI & Brand Design");
    expect(email.html).toContain('lang="en"');
    expectSafeEmail(email.html);
  });

  it("is in Portuguese for a Portuguese request", async () => {
    const email = await renderConsultationConfirmation({
      ...request,
      locale: "pt",
    });

    // Read from pt.json, so a revised translation doesn't break the test.
    const copy = pt.Emails.consultationConfirmation;
    expect(email.html).toContain('lang="pt"');
    expect(email.subject).toBe(copy.subject);
    expect(email.html).toContain(copy.greeting.replace("{name}", "Ana Silva"));
    expect(email.text).not.toContain("within one business day");
    expectSafeEmail(email.html);
  });

  it("leaves the phone out when none was given", async () => {
    const email = await renderConsultationConfirmation({
      ...request,
      phone: undefined,
    });
    expect(email.text).not.toContain("Phone");
  });

  it.each(["en", "pt"] as const)(
    "matches the snapshot (%s)",
    async (locale) => {
      const email = await renderConsultationConfirmation({
        ...request,
        locale,
      });
      expect({ subject: email.subject, text: email.text }).toMatchSnapshot();
    },
  );
});
