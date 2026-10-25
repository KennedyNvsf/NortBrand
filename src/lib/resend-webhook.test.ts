import { createHmac, randomBytes } from "node:crypto";

import { beforeEach, describe, expect, it, vi } from "vitest";

const SECRET = `whsec_${randomBytes(24).toString("base64")}`;

vi.mock("@/env", () => ({
  getServerEnv: () => ({
    RESEND_API_KEY: "re_test",
    RESEND_WEBHOOK_SECRET: SECRET,
  }),
}));

const { verifyResendWebhook } = await import("./resend-webhook");

const payload = JSON.stringify({
  type: "contact.updated",
  created_at: "2026-10-25T12:00:00.000Z",
  data: { email: "ana@example.com", unsubscribed: true },
});

/** Signs like Resend (Svix): base64 HMAC-SHA256 of `id.timestamp.body`, key from whsec_. */
function signedHeaders(
  body: string,
  options: { secret?: string; timestamp?: number } = {},
): Headers {
  const id = "msg_test";
  const timestamp = String(options.timestamp ?? Math.floor(Date.now() / 1000));
  const key = Buffer.from(
    (options.secret ?? SECRET).replace(/^whsec_/, ""),
    "base64",
  );
  const signature = createHmac("sha256", key)
    .update(`${id}.${timestamp}.${body}`)
    .digest("base64");
  return new Headers({
    "svix-id": id,
    "svix-timestamp": timestamp,
    "svix-signature": `v1,${signature}`,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("verifyResendWebhook", () => {
  it("returns the event for a correctly signed request", () => {
    expect(verifyResendWebhook(payload, signedHeaders(payload))).toMatchObject({
      type: "contact.updated",
      data: { email: "ana@example.com", unsubscribed: true },
    });
  });

  it("rejects a body changed after signing", () => {
    const tampered = payload.replace("ana@", "eve@");
    expect(verifyResendWebhook(tampered, signedHeaders(payload))).toBeNull();
  });

  it("rejects a signature made with another secret", () => {
    const other = `whsec_${randomBytes(24).toString("base64")}`;
    expect(
      verifyResendWebhook(payload, signedHeaders(payload, { secret: other })),
    ).toBeNull();
  });

  it("rejects a stale timestamp, so a captured request cannot be replayed", () => {
    const anHourAgo = Math.floor(Date.now() / 1000) - 60 * 60;
    expect(
      verifyResendWebhook(
        payload,
        signedHeaders(payload, { timestamp: anHourAgo }),
      ),
    ).toBeNull();
  });

  it("rejects a request without the signature headers", () => {
    expect(verifyResendWebhook(payload, new Headers())).toBeNull();
    const headers = signedHeaders(payload);
    headers.delete("svix-signature");
    expect(verifyResendWebhook(payload, headers)).toBeNull();
  });
});
