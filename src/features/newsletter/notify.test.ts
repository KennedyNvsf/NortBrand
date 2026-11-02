import { describe, expect, it, vi } from "vitest";

import type { OutgoingEmail, SendResult } from "@/lib/resend";

import {
  addToSegment,
  removeFromSegment,
  sendConfirmationEmail,
  type SegmentDependencies,
} from "./notify";

const subscription = { email: "ana@example.com", locale: "pt" } as const;
const rendered = {
  subject: "Confirm",
  html: "<p>Confirm</p>",
  text: "Confirm",
};

function emailDeps() {
  return {
    confirmUrl: vi.fn(() => "https://nortbrand.pt/pt/newsletter/confirm?x"),
    render: vi.fn(() => Promise.resolve(rendered)),
    send: vi.fn<(email: OutgoingEmail) => Promise<SendResult>>(() =>
      Promise.resolve({ ok: true }),
    ),
    reportFailure: vi.fn(),
  };
}

describe("sendConfirmationEmail", () => {
  it("renders the link in the visitor's locale and sends it to them", async () => {
    const deps = emailDeps();
    await sendConfirmationEmail(subscription, 1_700_000_000, deps);

    expect(deps.confirmUrl).toHaveBeenCalledWith(subscription, 1_700_000_000);
    expect(deps.render).toHaveBeenCalledWith(
      "ana@example.com",
      "pt",
      "https://nortbrand.pt/pt/newsletter/confirm?x",
    );
    expect(deps.send).toHaveBeenCalledWith({
      ...rendered,
      to: "ana@example.com",
    });
    expect(deps.reportFailure).not.toHaveBeenCalled();
  });

  it("reports a failed send by its code", async () => {
    const deps = emailDeps();
    deps.send.mockResolvedValueOnce({ ok: false, code: "rate_limit_exceeded" });
    await sendConfirmationEmail(subscription, 1, deps);
    expect(deps.reportFailure).toHaveBeenCalledWith(
      "confirmation_email",
      "rate_limit_exceeded",
    );
  });

  it("reports a render failure and sends nothing", async () => {
    const deps = emailDeps();
    deps.render.mockRejectedValueOnce(new Error("boom"));
    await sendConfirmationEmail(subscription, 1, deps);
    expect(deps.send).not.toHaveBeenCalled();
    expect(deps.reportFailure).toHaveBeenCalledWith(
      "confirmation_email",
      "render_failed",
    );
  });
});

function segmentDeps() {
  return {
    unsubscribeUrl: (email: string, locale: string) =>
      `https://u/${locale}/${email}`,
    upsert: vi.fn<SegmentDependencies["upsert"]>(() =>
      Promise.resolve({ ok: true }),
    ),
    remove: vi.fn<SegmentDependencies["remove"]>(() =>
      Promise.resolve({ ok: true }),
    ),
    reportFailure: vi.fn<SegmentDependencies["reportFailure"]>(),
  };
}

describe("addToSegment", () => {
  it("sets the locale and the signed unsubscribe link on the contact", async () => {
    const deps = segmentDeps();
    await addToSegment("ana@example.com", "pt", deps);
    expect(deps.upsert).toHaveBeenCalledWith("ana@example.com", {
      locale: "pt",
      unsubscribe_url: "https://u/pt/ana@example.com",
    });
    expect(deps.reportFailure).not.toHaveBeenCalled();
  });

  it("reports a Resend failure by its code", async () => {
    const deps = segmentDeps();
    deps.upsert.mockResolvedValueOnce({ ok: false, code: "validation_error" });
    await addToSegment("ana@example.com", "en", deps);
    expect(deps.reportFailure).toHaveBeenCalledWith(
      "segment_add",
      "validation_error",
    );
  });
});

describe("removeFromSegment", () => {
  it("removes the contact and reports a failure by its code", async () => {
    const deps = segmentDeps();
    await removeFromSegment("ana@example.com", deps);
    expect(deps.remove).toHaveBeenCalledWith("ana@example.com");
    expect(deps.reportFailure).not.toHaveBeenCalled();

    deps.remove.mockResolvedValueOnce({
      ok: false,
      code: "internal_server_error",
    });
    await removeFromSegment("ana@example.com", deps);
    expect(deps.reportFailure).toHaveBeenCalledWith(
      "segment_remove",
      "internal_server_error",
    );
  });
});
