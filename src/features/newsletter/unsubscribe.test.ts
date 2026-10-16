import { describe, expect, it, vi } from "vitest";

import { unsubscribeToken } from "./links";
import { unsubscribe, type UnsubscribeDependencies } from "./unsubscribe";

const secret = "test-secret-0123456789abcdef0123456789";
const email = "ana@example.com";
const link = { email, token: unsubscribeToken(secret, email) };

function setup(
  run: UnsubscribeDependencies["unsubscribe"] = () =>
    Promise.resolve({ unsubscribed: true }),
) {
  return {
    tokenSecret: secret,
    unsubscribe: vi.fn(run),
    reportFailure: vi.fn(),
    onUnsubscribed: vi.fn(),
  };
}

describe("unsubscribe", () => {
  it("unsubscribes with a genuine link and removes the Resend contact", async () => {
    const deps = setup();
    expect(await unsubscribe(link, deps)).toEqual({ status: "unsubscribed" });
    expect(deps.unsubscribe).toHaveBeenCalledWith(link);
    expect(deps.onUnsubscribed).toHaveBeenCalledWith(link);
  });

  it.each([
    ["a tampered token", { token: `x${link.token.slice(1)}` }],
    ["another address", { email: "bo@example.com" }],
    ["a missing token", { token: undefined }],
    ["an invalid address", { email: "nope" }],
  ])("rejects %s without asking the database", async (_, change) => {
    const deps = setup();
    expect(await unsubscribe({ ...link, ...change }, deps)).toEqual({
      status: "invalid",
    });
    expect(deps.unsubscribe).not.toHaveBeenCalled();
  });

  it("reports a database error by code", async () => {
    const deps = setup(() => Promise.resolve({ error: { code: "P0001" } }));
    expect(await unsubscribe(link, deps)).toEqual({ status: "failed" });
    expect(deps.reportFailure).toHaveBeenCalledWith("P0001");
    expect(deps.onUnsubscribed).not.toHaveBeenCalled();
  });

  it("reports a token the database rejects: the secrets differ", async () => {
    const deps = setup(() => Promise.resolve({ unsubscribed: false }));
    expect(await unsubscribe(link, deps)).toEqual({ status: "failed" });
    expect(deps.reportFailure).toHaveBeenCalledWith("token_rejected");
    expect(deps.onUnsubscribed).not.toHaveBeenCalled();
  });
});
