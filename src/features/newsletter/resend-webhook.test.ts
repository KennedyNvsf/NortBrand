import { describe, expect, it, vi } from "vitest";

import { checkUnsubscribeToken } from "./links";
import {
  syncResendUnsubscribe,
  type ResendWebhookDependencies,
} from "./resend-webhook";

const SECRET = "n".repeat(32);

function deps(result: { status: "unsubscribed" | "invalid" | "failed" }) {
  return {
    tokenSecret: SECRET,
    unsubscribe: vi
      .fn<ResendWebhookDependencies["unsubscribe"]>()
      .mockResolvedValue(result),
  };
}

/** The link the webhook passed to `unsubscribe`; fails the test if it never called it. */
function passedLink(dependencies: ReturnType<typeof deps>) {
  const link = dependencies.unsubscribe.mock.calls[0]?.[0];
  if (!link) throw new Error("unsubscribe was not called");
  return link;
}

const unsubscribedEvent = (email: string) => ({
  type: "contact.updated",
  created_at: "2026-10-25T12:00:00.000Z",
  data: { id: "c1", email, unsubscribed: true, segment_ids: ["segment-1"] },
});

describe("syncResendUnsubscribe", () => {
  it("unsubscribes the address with its own valid unsubscribe token", async () => {
    const dependencies = deps({ status: "unsubscribed" });
    const result = await syncResendUnsubscribe(
      unsubscribedEvent("ana@example.com"),
      dependencies,
    );

    expect(result).toEqual({ status: "unsubscribed" });
    expect(dependencies.unsubscribe).toHaveBeenCalledTimes(1);
    const link = passedLink(dependencies);
    expect(link.email).toBe("ana@example.com");
    expect(checkUnsubscribeToken(SECRET, link)).toBe(true);
  });

  it("normalises the address the way the links do before signing", async () => {
    const dependencies = deps({ status: "unsubscribed" });
    await syncResendUnsubscribe(
      unsubscribedEvent("  Ana@Example.COM "),
      dependencies,
    );
    const link = passedLink(dependencies);
    expect(link.email).toBe("ana@example.com");
    expect(checkUnsubscribeToken(SECRET, link)).toBe(true);
  });

  it("passes a failure through, so the route can ask Resend to retry", async () => {
    expect(
      await syncResendUnsubscribe(
        unsubscribedEvent("ana@example.com"),
        deps({ status: "failed" }),
      ),
    ).toEqual({ status: "failed" });
  });

  it.each([
    [
      "a resubscribe",
      {
        ...unsubscribedEvent("a@b.co"),
        data: { email: "a@b.co", unsubscribed: false },
      },
    ],
    [
      "another event type",
      { ...unsubscribedEvent("a@b.co"), type: "contact.deleted" },
    ],
    ["an email event", { type: "email.delivered", data: { email_id: "e1" } }],
    ["a payload without data", { type: "contact.updated" }],
    ["something that is not an object", "contact.updated"],
  ])("ignores %s and touches nothing", async (_name, event) => {
    const dependencies = deps({ status: "unsubscribed" });
    expect(await syncResendUnsubscribe(event, dependencies)).toEqual({
      status: "ignored",
    });
    expect(dependencies.unsubscribe).not.toHaveBeenCalled();
  });
});
