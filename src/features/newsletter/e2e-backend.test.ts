import { describe, expect, it } from "vitest";

import { fakeConfirm, fakeSubscribe, fakeUnsubscribe } from "./e2e-backend";

const link = {
  issued: 1_700_000_000,
  token: "t".repeat(43),
  locale: "en",
} as const;

describe("newsletter fake backend", () => {
  it("picks each outcome from the start of the address", async () => {
    expect(
      await fakeSubscribe({ email: "e2e-failed@x.pt", locale: "en" }),
    ).toEqual({
      error: { code: "XX000" },
    });
    expect(
      await fakeSubscribe({ email: "e2e-rate-limited@x.pt", locale: "en" }),
    ).toEqual({ error: { code: "PT429" } });
    expect(
      await fakeSubscribe({ email: "ana@x.pt", locale: "en" }),
    ).toHaveProperty("issuedAt");

    expect(await fakeConfirm({ ...link, email: "e2e-used@x.pt" })).toEqual({
      confirmed: false,
    });
    expect(await fakeConfirm({ ...link, email: "ana@x.pt" })).toEqual({
      confirmed: true,
    });
    expect(
      await fakeUnsubscribe({ email: "e2e-failed@x.pt", token: link.token }),
    ).toEqual({ error: { code: "XX000" } });
  });

  it("matches the marker exactly, not anywhere in the address", async () => {
    expect(
      await fakeSubscribe({ email: "ana.e2e-failed@x.pt", locale: "en" }),
    ).toHaveProperty("issuedAt");
  });
});
