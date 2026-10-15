import { describe, expect, it } from "vitest";

import { clientIp, hashIp } from "./ip-hash";

describe("clientIp", () => {
  it("takes the first x-forwarded-for address", () => {
    const headers = new Headers({
      "x-forwarded-for": " 203.0.113.7 , 10.0.0.1",
    });
    expect(clientIp(headers)).toBe("203.0.113.7");
  });

  it("falls back to x-real-ip, then to a shared bucket", () => {
    expect(clientIp(new Headers({ "x-real-ip": "203.0.113.8" }))).toBe(
      "203.0.113.8",
    );
    expect(clientIp(new Headers())).toBe("unknown");
  });
});

describe("hashIp", () => {
  const salt = "s".repeat(32);

  it("returns 64 hex characters, never the IP itself", () => {
    const hash = hashIp("203.0.113.7", salt);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain("203.0.113.7");
  });

  it("is stable for one salt and changes with the salt", () => {
    expect(hashIp("203.0.113.7", salt)).toBe(hashIp("203.0.113.7", salt));
    expect(hashIp("203.0.113.7", salt)).not.toBe(
      hashIp("203.0.113.7", "t".repeat(32)),
    );
  });
});
