import { describe, expect, it, vi } from "vitest";

import {
  completeStage,
  setHealth,
  setLaunch,
  setStageDates,
  type PlanDeps,
} from "./plan-edit";

const VIEWER = {
  status: "signed_in",
  userId: "00000000-0000-4000-a000-000000000001",
  name: "Ana Costa",
  role: "member",
} as const;
const PROJECT = "00000000-0000-4000-b000-000000000001";
const STAGE = "00000000-0000-4000-a000-0000000000c2";

function deps(overrides: Partial<PlanDeps> = {}): PlanDeps {
  return {
    viewer: () => Promise.resolve(VIEWER),
    notify: vi.fn(() => Promise.resolve(2)),
    reportFailure: vi.fn(),
    ...overrides,
  };
}

describe("setHealth", () => {
  it("saves, posts the update and emails the client", async () => {
    const d = deps();
    const save = vi.fn(() => Promise.resolve("update-1"));
    const result = await setHealth(
      {
        projectId: PROJECT,
        health: "waiting_on_client",
        update: " We need the photos. ",
        notify: true,
      },
      { ...d, save },
    );
    expect(result).toEqual({
      status: "saved",
      posted: true,
      notified: 2,
      notifyFailed: false,
    });
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({ update: "We need the photos." }),
    );
    expect(d.notify).toHaveBeenCalledWith("We need the photos.");
  });

  it("keeps the change when the email fails, and says so", async () => {
    const d = deps({ notify: () => Promise.reject(new Error("down")) });
    const result = await setHealth(
      {
        projectId: PROJECT,
        health: "at_risk",
        update: "Heads up.",
        notify: true,
      },
      { ...d, save: () => Promise.resolve("update-2") },
    );
    expect(result).toEqual({
      status: "saved",
      posted: true,
      notified: 0,
      notifyFailed: true,
    });
    expect(d.reportFailure).toHaveBeenCalledWith("notify_client", undefined);
  });

  it("emails nobody without an update or with notify off", async () => {
    const d = deps();
    await setHealth(
      { projectId: PROJECT, health: "on_track", update: null, notify: true },
      { ...d, save: () => Promise.resolve(null) },
    );
    await setHealth(
      {
        projectId: PROJECT,
        health: "on_track",
        update: "Quiet change",
        notify: false,
      },
      { ...d, save: () => Promise.resolve("update-3") },
    );
    expect(d.notify).not.toHaveBeenCalled();
  });

  it("refuses an unknown health and signed-out callers", async () => {
    const save = vi.fn(() => Promise.resolve(null));
    expect(
      await setHealth(
        { projectId: PROJECT, health: "great", update: null, notify: false },
        { ...deps(), save },
      ),
    ).toEqual({ status: "invalid", error: "healthInvalid" });
    expect(
      await setHealth(
        { projectId: PROJECT, health: "on_track", update: null, notify: false },
        {
          ...deps({ viewer: () => Promise.resolve({ status: "signed_out" }) }),
          save,
        },
      ),
    ).toEqual({ status: "forbidden" });
    expect(save).not.toHaveBeenCalled();
  });
});

describe("stage changes", () => {
  it("maps a locked stage and a stage that isn't current", async () => {
    expect(
      await setStageDates(
        { stageId: STAGE, startsOn: "2026-10-01", endsOn: "2026-10-10" },
        {
          ...deps(),
          save: () => Promise.resolve({ error: { code: "PT409" } }),
        },
      ),
    ).toEqual({ status: "locked" });
    expect(
      await completeStage(
        { stageId: STAGE, moveOpen: true, update: null, notify: false },
        {
          ...deps(),
          save: () => Promise.resolve({ error: { code: "PT409" } }),
        },
      ),
    ).toEqual({ status: "not_current" });
  });

  it("refuses an end before the start before saving", async () => {
    const save = vi.fn(() => Promise.resolve("ok" as const));
    expect(
      await setStageDates(
        { stageId: STAGE, startsOn: "2026-10-10", endsOn: "2026-10-01" },
        { ...deps(), save },
      ),
    ).toEqual({ status: "invalid", error: "endBeforeStart" });
    expect(save).not.toHaveBeenCalled();
  });

  it("maps a launch before the start", async () => {
    expect(
      await setLaunch(
        {
          projectId: PROJECT,
          launchesOn: "2026-09-01",
          update: null,
          notify: false,
        },
        {
          ...deps(),
          save: () => Promise.resolve({ error: { code: "23514" } }),
        },
      ),
    ).toEqual({ status: "invalid", error: "dateInvalid" });
  });
});
