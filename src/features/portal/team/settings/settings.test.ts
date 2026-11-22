import { describe, expect, it, vi } from "vitest";

import { DEFAULT_STAGE_TEMPLATE } from "../projects/templates";
import type { TeamViewer } from "../team-admin";
import { checkSettings, templateProblem, toTemplate, withValue } from "./rules";
import { saveSettings, type ValidSettings } from "./settings";

const ADMIN: TeamViewer = {
  status: "signed_in",
  userId: "00000000-0000-4000-a000-000000000001",
  name: "Ana Costa",
  role: "admin",
};

const input = {
  updatedAt: "2026-11-22T10:00:00.000Z",
  codeMaxTries: 3,
  lockoutMinutes: 15,
  sessionDays: 30,
  dailyDigest: true,
  notifyFirstClientSignIn: true,
  allowedTeamDomain: "",
  stages: DEFAULT_STAGE_TEMPLATE.map((stage) => ({ ...stage })),
};

function deps(
  save: (
    settings: ValidSettings,
  ) => Promise<
    { updatedAt: string } | { error: { code: string; message?: string } }
  > = () => Promise.resolve({ updatedAt: "2026-11-22T11:00:00.000Z" }),
  viewer: TeamViewer = ADMIN,
) {
  return {
    viewer: () => Promise.resolve(viewer),
    save: vi.fn(save),
    reportFailure: vi.fn(),
  };
}

describe("saveSettings", () => {
  it("saves every value for an admin, with the domain normalised", async () => {
    const d = deps();
    const result = await saveSettings(
      { ...input, allowedTeamDomain: " @Studio.PT ", sessionDays: 7 },
      d,
    );
    expect(result).toEqual({
      status: "saved",
      updatedAt: "2026-11-22T11:00:00.000Z",
    });
    expect(d.save).toHaveBeenCalledWith(
      expect.objectContaining({
        allowedTeamDomain: "studio.pt",
        sessionDays: 7,
      }),
    );
  });

  it("stores an empty domain as off (null)", async () => {
    const d = deps();
    await saveSettings(input, d);
    expect(d.save).toHaveBeenCalledWith(
      expect.objectContaining({ allowedTeamDomain: null }),
    );
  });

  it("refuses a member before saving anything", async () => {
    const d = deps(undefined, { ...ADMIN, role: "member" });
    expect(await saveSettings(input, d)).toEqual({ status: "forbidden" });
    expect(d.save).not.toHaveBeenCalled();
  });

  it("names the invalid fields", async () => {
    const d = deps();
    const result = await saveSettings(
      {
        ...input,
        allowedTeamDomain: "not a domain",
        stages: [
          { name: " ", kind: "work", weeks: 2 },
          { name: "Build", kind: "work", weeks: 60 },
          { name: "Launch", kind: "launch" },
          { name: "Care", kind: "after" },
        ],
      },
      d,
    );
    expect(result).toEqual({
      status: "invalid",
      fieldErrors: {
        allowedTeamDomain: "domainInvalid",
        stages: {
          0: { name: "stageNameInvalid" },
          1: { weeks: "weeksInvalid" },
        },
      },
    });
    expect(d.save).not.toHaveBeenCalled();
  });

  it("refuses a template in the wrong order or with repeated names", async () => {
    const wrongOrder = await saveSettings(
      {
        ...input,
        stages: [
          { name: "Build", kind: "work", weeks: 2 },
          { name: "Care", kind: "after" },
          { name: "Launch", kind: "launch" },
        ],
      },
      deps(),
    );
    expect(wrongOrder).toEqual({
      status: "invalid",
      fieldErrors: { template: "templateInvalid" },
    });
    const repeated = await saveSettings(
      {
        ...input,
        stages: [
          { name: "Build", kind: "work", weeks: 2 },
          { name: "build", kind: "work", weeks: 1 },
          { name: "Launch", kind: "launch" },
          { name: "Care", kind: "after" },
        ],
      },
      deps(),
    );
    expect(repeated).toEqual({
      status: "invalid",
      fieldErrors: { template: "stageNamesRepeat" },
    });
  });

  it("refuses values a select never offers", async () => {
    const result = await saveSettings({ ...input, codeMaxTries: 11 }, deps());
    expect(result.status).toBe("invalid");
  });

  it("maps the database's answers", async () => {
    const stale = deps(() =>
      Promise.resolve({ error: { code: "PT409", message: "stale_settings" } }),
    );
    expect(await saveSettings(input, stale)).toEqual({ status: "stale" });

    const forbidden = deps(() => Promise.resolve({ error: { code: "42501" } }));
    expect(await saveSettings(input, forbidden)).toEqual({
      status: "forbidden",
    });

    const broken = deps(() => Promise.resolve({ error: { code: "XX000" } }));
    expect(await saveSettings(input, broken)).toEqual({ status: "failed" });
    expect(broken.reportFailure).toHaveBeenCalledWith("save_settings", "XX000");
  });
});

describe("settings rules", () => {
  it("accepts the default template", () => {
    expect(templateProblem(DEFAULT_STAGE_TEMPLATE)).toBeNull();
  });

  it("needs a working stage, then Launch, then Care", () => {
    expect(
      templateProblem([
        { name: "Launch", kind: "launch" },
        { name: "Care", kind: "after" },
      ]),
    ).toBe("templateInvalid");
  });

  it("checks the form like the server does", () => {
    expect(
      checkSettings({ allowedTeamDomain: "studio.pt", stages: input.stages }),
    ).toEqual({});
    expect(
      checkSettings({
        allowedTeamDomain: "@@",
        stages: [
          { name: "Build", kind: "work", weeks: Number.NaN },
          { name: "Launch", kind: "launch" },
          { name: "Care", kind: "after" },
        ],
      }),
    ).toEqual({
      allowedTeamDomain: "domainInvalid",
      stages: { 0: { weeks: "weeksInvalid" } },
    });
  });

  it("keeps a stored value that isn't one of the choices", () => {
    expect(withValue([5, 15, 30], 20)).toEqual([5, 15, 20, 30]);
    expect(withValue([5, 15, 30], 15)).toEqual([5, 15, 30]);
  });
});

describe("toTemplate", () => {
  it("turns stored rows into the template", () => {
    expect(
      toTemplate([
        { name: "Build", kind: "work", weeks: 4 },
        { name: "Launch", kind: "launch", weeks: null },
        { name: "Care", kind: "after", weeks: null },
      ]),
    ).toEqual([
      { name: "Build", kind: "work", weeks: 4 },
      { name: "Launch", kind: "launch" },
      { name: "Care", kind: "after" },
    ]);
  });

  it("is null for rows that don't make a valid template", () => {
    expect(toTemplate([])).toBeNull();
    expect(
      toTemplate([
        { name: "Build", kind: "work", weeks: null },
        { name: "Launch", kind: "launch", weeks: null },
        { name: "Care", kind: "after", weeks: null },
      ]),
    ).toBeNull();
  });
});
