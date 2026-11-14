import { describe, expect, it, vi } from "vitest";

import { maskEmail } from "./schema";
import {
  MIN_RESPONSE_MS,
  requestCode,
  verifyCode,
  type RequestCodeDeps,
  type VerifyCodeDeps,
} from "./sign-in";

const validRequest = {
  email: " Ana@Atlantico.PT ",
  projectId: "nb-4821",
  locale: "pt",
};

function requestDeps(overrides: Partial<RequestCodeDeps> = {}) {
  let clock = 0;
  const deps: RequestCodeDeps = {
    begin: vi.fn(() => Promise.resolve("ok" as const)),
    sendCode: vi.fn(() => Promise.resolve({ ok: true as const })),
    sleep: vi.fn((ms: number) => {
      clock += ms;
      return Promise.resolve();
    }),
    now: () => clock,
    reportFailure: vi.fn(),
    ...overrides,
  };
  return deps;
}

function verifyDeps(overrides: Partial<VerifyCodeDeps> = {}) {
  const deps: VerifyCodeDeps = {
    codeState: vi.fn(() => Promise.resolve("active" as const)),
    verify: vi.fn(() => Promise.resolve("ok" as const)),
    registerWrongCode: vi.fn(() => Promise.resolve(2)),
    complete: vi.fn(() =>
      Promise.resolve("00000000-0000-4000-b000-000000000001"),
    ),
    signOut: vi.fn(() => Promise.resolve()),
    startSession: vi.fn(() => Promise.resolve()),
    reportFailure: vi.fn(),
    ...overrides,
  };
  return deps;
}

describe("requestCode", () => {
  it("normalises the input and sends a code", async () => {
    const deps = requestDeps();
    const result = await requestCode(validRequest, deps);
    expect(result).toEqual({
      status: "code_sent",
      email: "ana@atlantico.pt",
      projectId: "NB-4821",
      maskedEmail: "a•••@atlantico.pt",
    });
    expect(deps.begin).toHaveBeenCalledWith({
      email: "ana@atlantico.pt",
      projectId: "NB-4821",
      locale: "pt",
    });
  });

  it("reports invalid fields without touching the database", async () => {
    const deps = requestDeps();
    const result = await requestCode(
      { email: "nope", projectId: "4821", locale: "en" },
      deps,
    );
    expect(result).toEqual({
      status: "invalid",
      fieldErrors: { email: "emailInvalid", projectId: "projectIdInvalid" },
    });
    expect(deps.begin).not.toHaveBeenCalled();
  });

  it("sends nothing on no_match and still takes the minimum time", async () => {
    const deps = requestDeps({
      begin: vi.fn(() => Promise.resolve("no_match" as const)),
    });
    const result = await requestCode(validRequest, deps);
    expect(result).toEqual({ status: "no_match" });
    expect(deps.sendCode).not.toHaveBeenCalled();
    expect(deps.sleep).toHaveBeenCalledWith(MIN_RESPONSE_MS);
  });

  it("pads a match to the same minimum time", async () => {
    const deps = requestDeps();
    await requestCode(validRequest, deps);
    expect(deps.sleep).toHaveBeenCalledWith(MIN_RESPONSE_MS);
  });

  it("returns locked without sending a code", async () => {
    const deps = requestDeps({
      begin: vi.fn(() => Promise.resolve("locked" as const)),
    });
    expect(await requestCode(validRequest, deps)).toEqual({ status: "locked" });
    expect(deps.sendCode).not.toHaveBeenCalled();
  });

  it("maps PT429 and a mail rate limit to rate_limited", async () => {
    const limited = requestDeps({
      begin: vi.fn(() => Promise.resolve({ error: { code: "PT429" } })),
    });
    expect(await requestCode(validRequest, limited)).toEqual({
      status: "rate_limited",
    });

    const mailLimited = requestDeps({
      sendCode: vi.fn(() =>
        Promise.resolve({ ok: false as const, rateLimited: true }),
      ),
    });
    expect(await requestCode(validRequest, mailLimited)).toEqual({
      status: "rate_limited",
    });
  });

  it("reports other failures by code only", async () => {
    const deps = requestDeps({
      begin: vi.fn(() => Promise.resolve({ error: { code: "XX000" } })),
    });
    expect(await requestCode(validRequest, deps)).toEqual({ status: "failed" });
    expect(deps.reportFailure).toHaveBeenCalledWith("begin", "XX000");
  });
});

describe("verifyCode", () => {
  const validCode = { ...validRequest, code: "482190" };

  it("signs in, then starts the 30-day session", async () => {
    const deps = verifyDeps();
    expect(await verifyCode(validCode, deps)).toEqual({
      status: "signed_in",
      projectId: "NB-4821",
    });
    expect(deps.startSession).toHaveBeenCalledOnce();
  });

  it("rejects a malformed code without asking Supabase", async () => {
    const deps = verifyDeps();
    expect(await verifyCode({ ...validCode, code: "12ab" }, deps)).toEqual({
      status: "invalid",
      fieldErrors: { code: "codeInvalid" },
    });
    expect(deps.verify).not.toHaveBeenCalled();
  });

  it("does not verify a locked or expired code", async () => {
    for (const state of ["locked", "expired"] as const) {
      const deps = verifyDeps({
        codeState: vi.fn(() => Promise.resolve(state)),
      });
      expect(await verifyCode(validCode, deps)).toEqual({ status: state });
      expect(deps.verify).not.toHaveBeenCalled();
    }
  });

  it("counts a wrong code and reports the tries left", async () => {
    const deps = verifyDeps({
      verify: vi.fn(() => Promise.resolve("mismatch" as const)),
    });
    expect(await verifyCode(validCode, deps)).toEqual({
      status: "wrong_code",
      triesLeft: 2,
    });
  });

  it("locks on the last wrong code", async () => {
    const deps = verifyDeps({
      verify: vi.fn(() => Promise.resolve("mismatch" as const)),
      registerWrongCode: vi.fn(() => Promise.resolve(0)),
    });
    expect(await verifyCode(validCode, deps)).toEqual({ status: "locked" });
  });

  it("signs out a verified user who is not this project's client", async () => {
    const deps = verifyDeps({ complete: vi.fn(() => Promise.resolve(null)) });
    expect(await verifyCode(validCode, deps)).toEqual({ status: "no_match" });
    expect(deps.signOut).toHaveBeenCalledOnce();
    expect(deps.startSession).not.toHaveBeenCalled();
  });
});

describe("maskEmail", () => {
  it("keeps the first letter and the domain", () => {
    expect(maskEmail("joao@atlantico.pt")).toBe("j•••@atlantico.pt");
    expect(maskEmail("bad")).toBe("•••");
  });
});
