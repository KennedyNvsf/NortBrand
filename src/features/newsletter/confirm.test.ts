import { describe, expect, it, vi } from "vitest";

import { confirmSubscription, type ConfirmDependencies } from "./confirm";
import { CONFIRM_TTL_SECONDS, confirmToken } from "./links";

const secret = "test-secret-0123456789abcdef0123456789";
const email = "ana@example.com";
const issuedAt = 1_700_000_000;

const link = {
  email,
  issued: String(issuedAt),
  token: confirmToken(secret, email, issuedAt),
  locale: "pt",
};

function setup(
  confirm: ConfirmDependencies["confirm"] = () =>
    Promise.resolve({ confirmed: true }),
  now = issuedAt + 60,
) {
  return {
    now: () => now,
    tokenSecret: secret,
    confirm: vi.fn(confirm),
    reportFailure: vi.fn(),
    onConfirmed: vi.fn(),
  };
}

describe("confirmSubscription", () => {
  it("confirms a genuine link and adds the address to the segment", async () => {
    const deps = setup();
    expect(await confirmSubscription(link, deps)).toEqual({
      status: "confirmed",
    });
    const parsed = { ...link, issued: issuedAt };
    expect(deps.confirm).toHaveBeenCalledWith(parsed);
    expect(deps.onConfirmed).toHaveBeenCalledWith(parsed);
  });

  it("matches the token however the address is capitalised in the URL", async () => {
    const deps = setup();
    const result = await confirmSubscription(
      { ...link, email: "ANA@example.com" },
      deps,
    );
    expect(result).toEqual({ status: "confirmed" });
  });

  it("calls a link older than seven days expired, without asking the database", async () => {
    const deps = setup(undefined, issuedAt + CONFIRM_TTL_SECONDS + 1);
    expect(await confirmSubscription(link, deps)).toEqual({
      status: "expired",
    });
    expect(deps.confirm).not.toHaveBeenCalled();
  });

  it.each([
    ["a tampered token", { token: `x${link.token.slice(1)}` }],
    ["another address", { email: "bo@example.com" }],
    ["a later issue time", { issued: String(issuedAt + 1) }],
    ["a missing token", { token: undefined }],
    ["a non-numeric issue time", { issued: "soon" }],
    ["an unknown locale", { locale: "fr" }],
  ])("rejects %s without asking the database", async (_, change) => {
    const deps = setup();
    expect(await confirmSubscription({ ...link, ...change }, deps)).toEqual({
      status: "invalid",
    });
    expect(deps.confirm).not.toHaveBeenCalled();
    expect(deps.onConfirmed).not.toHaveBeenCalled();
  });

  it("rejects a reused or replaced link the database refuses", async () => {
    const deps = setup(() => Promise.resolve({ confirmed: false }));
    expect(await confirmSubscription(link, deps)).toEqual({
      status: "invalid",
    });
    expect(deps.onConfirmed).not.toHaveBeenCalled();
    expect(deps.reportFailure).not.toHaveBeenCalled();
  });

  it("reports a database error by code", async () => {
    const deps = setup(() => Promise.resolve({ error: { code: "P0001" } }));
    expect(await confirmSubscription(link, deps)).toEqual({
      status: "failed",
    });
    expect(deps.reportFailure).toHaveBeenCalledWith("P0001");
    expect(deps.onConfirmed).not.toHaveBeenCalled();
  });
});
