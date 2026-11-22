import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  createSessionMarker,
  isValidSessionMarker,
  toSessionDays,
} from "./session-marker";

const secret = "a".repeat(32);
const user = "20000000-0000-4000-a000-000000000011";
const now = Date.UTC(2026, 10, 14, 10, 0, 0);
const DAY = 86_400_000;

describe("portal session marker", () => {
  it("accepts a fresh marker for the same user", () => {
    const marker = createSessionMarker(secret, user, now);
    expect(isValidSessionMarker(marker, secret, user, now + 1000)).toBe(true);
  });

  it("expires after 30 days by default", () => {
    const marker = createSessionMarker(secret, user, now);
    expect(isValidSessionMarker(marker, secret, user, now + 30 * DAY)).toBe(
      true,
    );
    expect(isValidSessionMarker(marker, secret, user, now + 30 * DAY + 1)).toBe(
      false,
    );
  });

  it("lasts the length it was issued with (Settings › Stay signed in for)", () => {
    const week = createSessionMarker(secret, user, now, 7);
    expect(isValidSessionMarker(week, secret, user, now + 7 * DAY)).toBe(true);
    expect(isValidSessionMarker(week, secret, user, now + 7 * DAY + 1)).toBe(
      false,
    );
    const long = createSessionMarker(secret, user, now, 90);
    expect(isValidSessionMarker(long, secret, user, now + 60 * DAY)).toBe(true);
  });

  it("can't be stretched by editing its length", () => {
    const marker = createSessionMarker(secret, user, now, 7);
    const [issued, , signature] = marker.split(".");
    const stretched = `${issued ?? ""}.90.${signature ?? ""}`;
    expect(isValidSessionMarker(stretched, secret, user, now + 1000)).toBe(
      false,
    );
  });

  it("still accepts a marker from before #159 (no length) for 30 days", () => {
    const signature = createHmac("sha256", secret)
      .update(`portal-session|${user}|${String(now)}`)
      .digest("base64url");
    const legacy = `${String(now)}.${signature}`;
    expect(isValidSessionMarker(legacy, secret, user, now + 29 * DAY)).toBe(
      true,
    );
    expect(isValidSessionMarker(legacy, secret, user, now + 31 * DAY)).toBe(
      false,
    );
  });

  it("is bound to the user it was issued for", () => {
    const marker = createSessionMarker(secret, user, now);
    expect(isValidSessionMarker(marker, secret, "someone-else", now)).toBe(
      false,
    );
  });

  it("rejects a moved issue date, another secret, junk and a missing value", () => {
    const marker = createSessionMarker(secret, user, now);
    const [, days, signature] = marker.split(".");
    expect(
      isValidSessionMarker(
        `${String(now + 5000)}.${days ?? ""}.${signature ?? ""}`,
        secret,
        user,
        now + 6000,
      ),
    ).toBe(false);
    expect(isValidSessionMarker(marker, "b".repeat(32), user, now)).toBe(false);
    expect(isValidSessionMarker("junk", secret, user, now)).toBe(false);
    expect(isValidSessionMarker(`${marker}.extra`, secret, user, now)).toBe(
      false,
    );
    expect(isValidSessionMarker(undefined, secret, user, now)).toBe(false);
  });

  it("rejects a marker issued in the future", () => {
    const marker = createSessionMarker(secret, user, now + 60_000);
    expect(isValidSessionMarker(marker, secret, user, now)).toBe(false);
  });

  it("falls back to 30 days for a missing or out-of-range length", () => {
    expect(toSessionDays(7)).toBe(7);
    expect(toSessionDays(undefined)).toBe(30);
    expect(toSessionDays(0)).toBe(30);
    expect(toSessionDays(91)).toBe(30);
    expect(toSessionDays(2.5)).toBe(30);
  });
});
