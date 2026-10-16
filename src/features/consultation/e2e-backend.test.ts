import { describe, expect, it } from "vitest";

import { isFakeBackendEnabled } from "@/lib/e2e-backend";

import { fakeInsert } from "./e2e-backend";
import type { ConsultationRequest } from "./schema";

const request: ConsultationRequest = {
  name: "Ana",
  email: "ana@example.com",
  service: "web-design",
  message: "We need a new website.",
  locale: "en",
};

describe("isFakeBackendEnabled", () => {
  it("is on only when Playwright asks for it", () => {
    expect(isFakeBackendEnabled({ E2E_FAKE_BACKEND: "1" })).toBe(true);
    expect(isFakeBackendEnabled({})).toBe(false);
    expect(isFakeBackendEnabled({ E2E_FAKE_BACKEND: "true" })).toBe(false);
  });

  it("is refused on Vercel production, whatever the variable says", () => {
    expect(
      isFakeBackendEnabled({ E2E_FAKE_BACKEND: "1", VERCEL_ENV: "production" }),
    ).toBe(false);
    expect(
      isFakeBackendEnabled({ E2E_FAKE_BACKEND: "1", VERCEL_ENV: "preview" }),
    ).toBe(true);
  });
});

describe("fakeInsert", () => {
  it.each([
    ["e2e:failed", { error: { code: "XX000" } }],
    ["e2e:rate-limited", { error: { code: "PT429" } }],
  ])("returns an error for %s", async (marker, expected) => {
    expect(await fakeInsert({ ...request, name: `Ana ${marker}` })).toEqual(
      expected,
    );
  });

  it("succeeds otherwise", async () => {
    expect(await fakeInsert(request)).toHaveProperty("id");
  });
});
