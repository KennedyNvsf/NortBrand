import { describe, expect, it, vi } from "vitest";

import { subscribeToNewsletter, type SubscribeDependencies } from "./subscribe";

const IP_HASH = "a".repeat(64);
const ISSUED_AT = 1_700_000_000;

function setup(
  subscribe: SubscribeDependencies["subscribe"] = () =>
    Promise.resolve({ issuedAt: ISSUED_AT }),
) {
  const deps = {
    ipHash: vi.fn(() => IP_HASH),
    subscribe: vi.fn(subscribe),
    reportFailure: vi.fn(),
    onSubscribed: vi.fn(),
  };
  return deps;
}

describe("subscribeToNewsletter", () => {
  it("stores a pending signup, normalised, and schedules the confirmation email", async () => {
    const deps = setup();
    const result = await subscribeToNewsletter(
      { email: "  Ana@Example.COM ", locale: "pt", website: "" },
      deps,
    );

    expect(result).toEqual({ status: "success" });
    const subscription = { email: "ana@example.com", locale: "pt" };
    expect(deps.subscribe).toHaveBeenCalledWith(subscription, IP_HASH);
    expect(deps.onSubscribed).toHaveBeenCalledWith(subscription, ISSUED_AT);
  });

  it("answers an already subscribed address exactly like a new one", async () => {
    // subscribe_newsletter returns an issue time either way; nothing else is known.
    const fresh = await subscribeToNewsletter(
      { email: "new@example.com", locale: "en" },
      setup(),
    );
    const existing = await subscribeToNewsletter(
      { email: "ana@example.com", locale: "en" },
      setup(),
    );
    expect(existing).toEqual(fresh);
  });

  it("gives bots that fill the honeypot a fake success and stores nothing", async () => {
    const deps = setup();
    const result = await subscribeToNewsletter(
      { email: "bot@example.com", locale: "en", website: "https://spam" },
      deps,
    );
    expect(result).toEqual({ status: "success" });
    expect(deps.subscribe).not.toHaveBeenCalled();
    expect(deps.onSubscribed).not.toHaveBeenCalled();
  });

  it.each([
    ["an invalid address", "not-an-email"],
    ["an empty field", ""],
    ["an address longer than 254 characters", `${"a".repeat(250)}@example.com`],
    ["a value that is not a string", 42],
  ])("rejects %s with emailInvalid", async (_, email) => {
    const deps = setup();
    const result = await subscribeToNewsletter({ email, locale: "en" }, deps);
    expect(result).toEqual({
      status: "validation",
      fieldErrors: { email: "emailInvalid" },
    });
    expect(deps.subscribe).not.toHaveBeenCalled();
  });

  it("fails on a malformed request", async () => {
    const deps = setup();
    expect(
      await subscribeToNewsletter(
        { email: "ana@example.com", locale: "fr" },
        deps,
      ),
    ).toEqual({ status: "failed" });
    expect(await subscribeToNewsletter("ana@example.com", deps)).toEqual({
      status: "failed",
    });
    expect(deps.subscribe).not.toHaveBeenCalled();
  });

  it("says when the rate limit is reached, without reporting it", async () => {
    const deps = setup(() => Promise.resolve({ error: { code: "PT429" } }));
    const result = await subscribeToNewsletter(
      { email: "ana@example.com", locale: "en" },
      deps,
    );
    expect(result).toEqual({ status: "rate-limited" });
    expect(deps.reportFailure).not.toHaveBeenCalled();
    expect(deps.onSubscribed).not.toHaveBeenCalled();
  });

  it("reports a database error by code and sends no email", async () => {
    const deps = setup(() => Promise.resolve({ error: { code: "23514" } }));
    const result = await subscribeToNewsletter(
      { email: "ana@example.com", locale: "en" },
      deps,
    );
    expect(result).toEqual({ status: "failed" });
    expect(deps.reportFailure).toHaveBeenCalledWith("23514");
    expect(deps.onSubscribed).not.toHaveBeenCalled();
  });
});
