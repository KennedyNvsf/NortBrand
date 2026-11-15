import { describe, expect, it, vi } from "vitest";

import { digestIsDue, isAuthorizedCron, runDigest } from "./digest";

const SECRET = "c".repeat(40);

// 18:30 in Lisbon: winter (UTC+0) and summer (UTC+1).
const WINTER_EVENING = new Date("2026-11-15T18:30:00Z");
const SUMMER_EVENING = new Date("2027-07-15T17:30:00Z");
const WINTER_AFTERNOON = new Date("2026-11-15T17:30:00Z");

const row = {
  client_email: "joao@client.example",
  locale: "pt",
  project_name: "Café website",
  public_id: "NB-9901",
  updates: [
    {
      author: "Rui Matos",
      body: "The home page is live on staging.",
      created_at: "2026-11-15T10:20:00Z",
      highlight: false,
      needs_client: false,
    },
  ],
};

describe("isAuthorizedCron", () => {
  it("accepts only the exact bearer secret", () => {
    expect(isAuthorizedCron(`Bearer ${SECRET}`, SECRET)).toBe(true);
    expect(isAuthorizedCron(null, SECRET)).toBe(false);
    expect(isAuthorizedCron(`Bearer ${SECRET}x`, SECRET)).toBe(false);
    expect(isAuthorizedCron(SECRET, SECRET)).toBe(false);
    expect(isAuthorizedCron(`Bearer ${SECRET}`, undefined)).toBe(false);
  });
});

describe("digestIsDue", () => {
  it("is due from 18:00 Lisbon time, summer and winter", () => {
    expect(digestIsDue(WINTER_EVENING)).toBe(true);
    expect(digestIsDue(SUMMER_EVENING)).toBe(true);
    expect(digestIsDue(WINTER_AFTERNOON)).toBe(false);
    expect(digestIsDue(new Date("2027-07-15T16:30:00Z"))).toBe(false);
  });
});

describe("runDigest", () => {
  it("does nothing before 18:00 (the earlier cron run in winter)", async () => {
    const claim = vi.fn(() => Promise.resolve([row]));
    const result = await runDigest({
      now: WINTER_AFTERNOON,
      claim,
      send: vi.fn(),
      reportFailure: vi.fn(),
    });
    expect(result).toEqual({ status: "not_due" });
    expect(claim).not.toHaveBeenCalled();
  });

  it("sends one email per claimed client and counts failures without retrying", async () => {
    const send = vi
      .fn()
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: false, code: "rate_limit_exceeded" });
    const reportFailure = vi.fn();
    const result = await runDigest({
      now: WINTER_EVENING,
      claim: () =>
        Promise.resolve([row, { ...row, client_email: "ana@client.example" }]),
      send,
      reportFailure,
    });
    expect(result).toEqual({ status: "done", claimed: 2, sent: 1, failed: 1 });
    expect(send).toHaveBeenCalledTimes(2);
    expect(reportFailure).toHaveBeenCalledWith(
      "send_digest",
      "rate_limit_exceeded",
    );
  });

  it("skips a malformed row and reports the claim failing", async () => {
    const reportFailure = vi.fn();
    expect(
      await runDigest({
        now: WINTER_EVENING,
        claim: () => Promise.resolve([{ ...row, updates: [] }]),
        send: vi.fn(),
        reportFailure,
      }),
    ).toEqual({ status: "done", claimed: 1, sent: 0, failed: 1 });
    expect(
      await runDigest({
        now: WINTER_EVENING,
        claim: () => Promise.resolve({ error: { code: "42501" } }),
        send: vi.fn(),
        reportFailure,
      }),
    ).toEqual({ status: "failed" });
    expect(reportFailure).toHaveBeenCalledWith("claim_digests", "42501");
  });
});
