import { describe, expect, it, vi } from "vitest";

import { setTeamRole } from "./roles";

const ADMIN = {
  status: "signed_in",
  userId: "00000000-0000-4000-a000-000000000001",
  name: "Ana Costa",
  role: "admin",
} as const;
const TARGET = "00000000-0000-4000-a000-000000000002";

describe("setTeamRole", () => {
  it("saves an admin's change", async () => {
    const save = vi.fn(() => Promise.resolve("ok" as const));
    expect(
      await setTeamRole(
        { userId: TARGET, role: "admin" },
        { viewer: () => Promise.resolve(ADMIN), save, reportFailure: vi.fn() },
      ),
    ).toEqual({ status: "saved" });
    expect(save).toHaveBeenCalledWith(TARGET, "admin");
  });

  it("refuses members before touching the database", async () => {
    const save = vi.fn();
    expect(
      await setTeamRole(
        { userId: TARGET, role: "admin" },
        {
          viewer: () => Promise.resolve({ ...ADMIN, role: "member" }),
          save,
          reportFailure: vi.fn(),
        },
      ),
    ).toEqual({ status: "refused", error: "forbidden" });
    expect(save).not.toHaveBeenCalled();
  });

  it("names the last-admin refusal and rejects unknown roles", async () => {
    const deps = {
      viewer: () => Promise.resolve(ADMIN),
      save: () =>
        Promise.resolve({ error: { code: "PT409", message: "last_admin" } }),
      reportFailure: vi.fn(),
    };
    expect(
      await setTeamRole({ userId: ADMIN.userId, role: "member" }, deps),
    ).toEqual({
      status: "refused",
      error: "lastAdmin",
    });
    expect(await setTeamRole({ userId: TARGET, role: "owner" }, deps)).toEqual({
      status: "refused",
      error: "notFound",
    });
  });
});
