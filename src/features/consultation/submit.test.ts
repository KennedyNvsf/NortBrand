import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createFormToken, MIN_FILL_MS } from "./form-token";
import { submitConsultation, type SubmitDependencies } from "./submit";

const secret = "test-secret-0123456789abcdef0123456789";
const now = 1_760_000_000_000;
const ipHash = "a".repeat(64);

const request = {
  name: "Ana Silva",
  email: "Ana@Example.com",
  phone: "",
  service: "web-design",
  message: "We need a new studio website.",
  locale: "pt",
};

function makeDeps(
  insertResult: Awaited<ReturnType<SubmitDependencies["insert"]>> = {
    id: "00000000-0000-0000-0000-000000000001",
  },
) {
  return {
    now: () => now,
    tokenSecret: secret,
    ipHash: vi.fn(() => ipHash),
    insert: vi.fn<SubmitDependencies["insert"]>(() =>
      Promise.resolve(insertResult),
    ),
    reportFailure: vi.fn<SubmitDependencies["reportFailure"]>(),
    onCreated: vi.fn<SubmitDependencies["onCreated"]>(),
  };
}

/** A token issued long enough ago to pass the fill-time check. */
const humanToken = createFormToken(secret, now - MIN_FILL_MS - 1);

let consoleSpies: ReturnType<typeof vi.spyOn>[] = [];
beforeEach(() => {
  consoleSpies = (["log", "info", "warn", "error"] as const).map((method) =>
    vi.spyOn(console, method).mockImplementation(() => undefined),
  );
});
afterEach(() => {
  // No branch may write to the console: it could quote personal data.
  for (const spy of consoleSpies) expect(spy).not.toHaveBeenCalled();
  vi.restoreAllMocks();
});

describe("submitConsultation", () => {
  it("inserts a valid request, normalised, with the hashed IP", async () => {
    const deps = makeDeps();
    const result = await submitConsultation(
      { ...request, website: "", formToken: humanToken },
      deps,
    );

    expect(result).toEqual({ status: "success" });
    expect(deps.insert).toHaveBeenCalledWith(
      {
        name: "Ana Silva",
        email: "ana@example.com",
        phone: undefined,
        service: "web-design",
        message: "We need a new studio website.",
        locale: "pt",
      },
      ipHash,
    );
    expect(deps.onCreated).toHaveBeenCalledExactlyOnceWith(
      "00000000-0000-0000-0000-000000000001",
      expect.objectContaining({ email: "ana@example.com", locale: "pt" }),
    );
  });

  it("returns field errors and inserts nothing for invalid input", async () => {
    const deps = makeDeps();
    const result = await submitConsultation(
      { ...request, email: "jo@company", service: "", formToken: humanToken },
      deps,
    );

    expect(result).toEqual({
      status: "validation",
      fieldErrors: { email: "emailInvalid", service: "serviceRequired" },
    });
    expect(deps.insert).not.toHaveBeenCalled();
  });

  it.each([
    ["the honeypot is filled", { website: "https://spam.example" }],
    ["the form token is missing", { formToken: undefined }],
    ["the form token is forged", { formToken: `${now - 60_000}.forged` }],
    ["the form token is malformed", { formToken: "yesterday" }],
    [
      "the form was filled too fast",
      { formToken: createFormToken(secret, now - MIN_FILL_MS + 1) },
    ],
    [
      "the form token is from the future",
      { formToken: createFormToken(secret, now + 60_000) },
    ],
    [
      "the form token was signed with another secret",
      { formToken: createFormToken(`${secret}x`, now - 60_000) },
    ],
  ])("looks successful but inserts nothing when %s", async (_case, change) => {
    const deps = makeDeps();
    const result = await submitConsultation(
      { ...request, formToken: humanToken, ...change },
      deps,
    );

    expect(result).toEqual({ status: "success" });
    expect(deps.insert).not.toHaveBeenCalled();
    expect(deps.ipHash).not.toHaveBeenCalled();
    expect(deps.onCreated).not.toHaveBeenCalled();
  });

  it("checks for bots before validating, so bots never see field errors", async () => {
    const deps = makeDeps();
    const result = await submitConsultation(
      { email: "not-an-email", website: "bot" },
      deps,
    );
    expect(result).toEqual({ status: "success" });
  });

  it("returns rate-limited when the database refuses with PT429", async () => {
    const deps = makeDeps({ error: { code: "PT429" } });
    const result = await submitConsultation(
      { ...request, formToken: humanToken },
      deps,
    );

    expect(result).toEqual({ status: "rate-limited" });
    expect(deps.reportFailure).not.toHaveBeenCalled();
    expect(deps.onCreated).not.toHaveBeenCalled();
  });

  it("sends no email and reports only the error code when the insert fails", async () => {
    const deps = makeDeps({ error: { code: "23514" } });
    const result = await submitConsultation(
      { ...request, formToken: humanToken },
      deps,
    );

    expect(result).toEqual({ status: "failed" });
    expect(deps.reportFailure).toHaveBeenCalledExactlyOnceWith("23514");
    expect(deps.onCreated).not.toHaveBeenCalled();
  });

  it.each([null, "a string", 42, ["array"]])(
    "returns failed for a non-object payload (%o)",
    async (input) => {
      const deps = makeDeps();
      expect(await submitConsultation(input, deps)).toEqual({
        status: "failed",
      });
      expect(deps.insert).not.toHaveBeenCalled();
    },
  );
});
