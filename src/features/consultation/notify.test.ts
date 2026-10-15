import { describe, expect, it, vi } from "vitest";

import { sendConsultationEmails, type NotifyDependencies } from "./notify";
import type { ConsultationRequest } from "./schema";

const request: ConsultationRequest = {
  name: "Ana Silva",
  email: "ana@example.com",
  phone: "+351 912 345 678",
  service: "web-design",
  message: "We need a new studio website.",
  locale: "pt",
};
const requestId = "00000000-0000-0000-0000-000000000001";
const receivedAt = new Date("2026-10-15T20:46:00Z");

function makeDeps(
  overrides: Partial<Omit<NotifyDependencies, "reportFailure">> = {},
) {
  return {
    notifyTo: "team@example.com",
    studioEmail: "hello@nortbrand.com",
    renderAlert: vi.fn(() =>
      Promise.resolve({
        subject: "alert",
        html: "<p>alert</p>",
        text: "alert",
      }),
    ),
    renderConfirmation: vi.fn(() =>
      Promise.resolve({
        subject: "thanks",
        html: "<p>thanks</p>",
        text: "thanks",
      }),
    ),
    send: vi.fn<NotifyDependencies["send"]>(() =>
      Promise.resolve({ ok: true }),
    ),
    markNotified: vi.fn<NotifyDependencies["markNotified"]>(() =>
      Promise.resolve(true),
    ),
    reportFailure: vi.fn<NotifyDependencies["reportFailure"]>(),
    ...overrides,
  };
}

/** Reports carry a step and a code only: never a name, email, phone or message. */
function expectNoPersonalData(deps: ReturnType<typeof makeDeps>) {
  const reported = JSON.stringify(deps.reportFailure.mock.calls);
  for (const value of [
    request.name,
    request.email,
    request.phone,
    request.message,
  ]) {
    expect(reported).not.toContain(value);
  }
}

describe("sendConsultationEmails", () => {
  it("sends the alert to the team and the confirmation to the visitor, then marks the request notified", async () => {
    const deps = makeDeps();
    await sendConsultationEmails(request, requestId, receivedAt, deps);

    expect(deps.renderAlert).toHaveBeenCalledWith(
      request,
      requestId,
      receivedAt,
    );
    expect(deps.send).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: "alert",
        to: "team@example.com",
        replyTo: "ana@example.com",
      }),
    );
    expect(deps.send).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: "thanks",
        to: "ana@example.com",
        replyTo: "hello@nortbrand.com",
      }),
    );
    expect(deps.markNotified).toHaveBeenCalledExactlyOnceWith(requestId);
    expect(deps.reportFailure).not.toHaveBeenCalled();
  });

  it("leaves notified_at unset and reports the code when the alert fails", async () => {
    const deps = makeDeps({
      send: vi.fn<NotifyDependencies["send"]>(({ to }) =>
        Promise.resolve(
          to === "team@example.com"
            ? { ok: false, code: "validation_error" }
            : { ok: true },
        ),
      ),
    });
    await sendConsultationEmails(request, requestId, receivedAt, deps);

    expect(deps.markNotified).not.toHaveBeenCalled();
    expect(deps.reportFailure).toHaveBeenCalledExactlyOnceWith(
      "alert",
      "validation_error",
    );
    expectNoPersonalData(deps);
  });

  it("still marks the alert as sent when only the confirmation fails", async () => {
    const deps = makeDeps({
      send: vi.fn<NotifyDependencies["send"]>(({ to }) =>
        Promise.resolve(
          to === "ana@example.com"
            ? { ok: false, code: "send_threw" }
            : { ok: true },
        ),
      ),
    });
    await sendConsultationEmails(request, requestId, receivedAt, deps);

    expect(deps.markNotified).toHaveBeenCalledExactlyOnceWith(requestId);
    expect(deps.reportFailure).toHaveBeenCalledExactlyOnceWith(
      "confirmation",
      "send_threw",
    );
    expectNoPersonalData(deps);
  });

  it("reports a template that fails to render, without throwing", async () => {
    const deps = makeDeps({
      renderAlert: vi.fn(() => Promise.reject(new Error(request.email))),
      renderConfirmation: vi.fn(() => Promise.reject(new Error(request.name))),
    });
    await expect(
      sendConsultationEmails(request, requestId, receivedAt, deps),
    ).resolves.toBeUndefined();

    expect(deps.send).not.toHaveBeenCalled();
    expect(deps.markNotified).not.toHaveBeenCalled();
    expect(deps.reportFailure).toHaveBeenCalledWith("alert", "render_failed");
    expect(deps.reportFailure).toHaveBeenCalledWith(
      "confirmation",
      "render_failed",
    );
    expectNoPersonalData(deps);
  });

  it.each([
    ["is not updated", () => Promise.resolve(false), "not_updated"],
    ["throws", () => Promise.reject(new Error("network")), "threw"],
  ])(
    "reports when marking the request notified %s",
    async (_case, markNotified, code) => {
      const deps = makeDeps({ markNotified: vi.fn(markNotified) });
      await sendConsultationEmails(request, requestId, receivedAt, deps);

      expect(deps.reportFailure).toHaveBeenCalledExactlyOnceWith(
        "mark_notified",
        code,
      );
    },
  );
});
