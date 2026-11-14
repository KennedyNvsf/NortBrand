import { describe, expect, it, vi } from "vitest";

import {
  inviteTeammate,
  removeTeammate,
  type InviteDeps,
  type RemoveDeps,
  type TeamViewer,
} from "./team-admin";

const ADMIN_ID = "10000000-0000-4000-a000-000000000001";
const ADMIN: TeamViewer = {
  status: "signed_in",
  userId: ADMIN_ID,
  name: "Ana Costa",
  role: "admin",
};
const MEMBER: TeamViewer = {
  ...ADMIN,
  userId: "10000000-0000-4000-a000-000000000002",
  role: "member",
};
const NEW_USER = "10000000-0000-4000-a000-000000000009";
const INVITE = {
  name: " Rui Matos ",
  email: "Rui@Example.com ",
  role: "member",
};

function inviteDeps(overrides: Partial<InviteDeps> = {}): InviteDeps {
  return {
    viewer: () => Promise.resolve(ADMIN),
    checkInvite: vi.fn(() =>
      Promise.resolve({ status: "ok" as const, userId: null }),
    ),
    createAuthUser: vi.fn(() =>
      Promise.resolve({ ok: true as const, userId: NEW_USER }),
    ),
    deleteAuthUser: vi.fn(() => Promise.resolve()),
    unblockAuthUser: vi.fn(() => Promise.resolve(true)),
    addMember: vi.fn(() => Promise.resolve("ok" as const)),
    reportFailure: vi.fn(),
    ...overrides,
  };
}

function removeDeps(overrides: Partial<RemoveDeps> = {}): RemoveDeps {
  return {
    viewer: () => Promise.resolve(ADMIN),
    removeMember: vi.fn(() => Promise.resolve("ok" as const)),
    blockAuthUser: vi.fn(() => Promise.resolve(true)),
    reportFailure: vi.fn(),
    ...overrides,
  };
}

describe("inviteTeammate", () => {
  it("refuses a member before touching anything", async () => {
    const deps = inviteDeps({ viewer: () => Promise.resolve(MEMBER) });
    expect(await inviteTeammate(INVITE, deps)).toEqual({ status: "forbidden" });
    expect(deps.checkInvite).not.toHaveBeenCalled();
    expect(deps.createAuthUser).not.toHaveBeenCalled();
  });

  it("refuses a visitor who isn't signed in", async () => {
    const deps = inviteDeps({
      viewer: () => Promise.resolve({ status: "anonymous" }),
    });
    expect(await inviteTeammate(INVITE, deps)).toEqual({ status: "forbidden" });
  });

  it("validates the fields", async () => {
    const deps = inviteDeps();
    expect(
      await inviteTeammate({ name: "", email: "nope", role: "owner" }, deps),
    ).toEqual({
      status: "invalid",
      fieldErrors: {
        name: "nameInvalid",
        email: "emailInvalid",
        role: "roleInvalid",
      },
    });
    expect(deps.checkInvite).not.toHaveBeenCalled();
  });

  it("creates the auth user and adds the teammate, normalised", async () => {
    const deps = inviteDeps();
    expect(await inviteTeammate(INVITE, deps)).toEqual({ status: "invited" });
    expect(deps.checkInvite).toHaveBeenCalledWith("rui@example.com");
    expect(deps.createAuthUser).toHaveBeenCalledWith("rui@example.com");
    expect(deps.addMember).toHaveBeenCalledWith(
      NEW_USER,
      "Rui Matos",
      "member",
    );
  });

  it("reuses and unblocks an existing auth user (a returning teammate)", async () => {
    const deps = inviteDeps({
      checkInvite: vi.fn(() =>
        Promise.resolve({ status: "ok" as const, userId: NEW_USER }),
      ),
    });
    expect(await inviteTeammate(INVITE, deps)).toEqual({ status: "invited" });
    expect(deps.createAuthUser).not.toHaveBeenCalled();
    expect(deps.unblockAuthUser).toHaveBeenCalledWith(NEW_USER);
  });

  it("passes on the domain and duplicate answers", async () => {
    for (const status of ["domain_not_allowed", "already_member"] as const) {
      const deps = inviteDeps({
        checkInvite: () => Promise.resolve({ status }),
      });
      expect(await inviteTeammate(INVITE, deps)).toEqual({ status });
      expect(deps.createAuthUser).not.toHaveBeenCalled();
    }
  });

  it("maps a SQL role refusal to forbidden", async () => {
    const deps = inviteDeps({
      checkInvite: () => Promise.resolve({ error: { code: "42501" } }),
    });
    expect(await inviteTeammate(INVITE, deps)).toEqual({ status: "forbidden" });
  });

  it("deletes the user it created when adding fails", async () => {
    const deps = inviteDeps({
      addMember: () => Promise.resolve({ error: { code: "PT422" } }),
    });
    expect(await inviteTeammate(INVITE, deps)).toEqual({
      status: "domain_not_allowed",
    });
    expect(deps.deleteAuthUser).toHaveBeenCalledWith(NEW_USER);
  });

  it("never deletes a user it didn't create", async () => {
    const deps = inviteDeps({
      checkInvite: () =>
        Promise.resolve({ status: "ok" as const, userId: NEW_USER }),
      addMember: () => Promise.resolve({ error: { code: "XX000" } }),
    });
    expect(await inviteTeammate(INVITE, deps)).toEqual({ status: "failed" });
    expect(deps.deleteAuthUser).not.toHaveBeenCalled();
    expect(deps.reportFailure).toHaveBeenCalledWith("add_member", "XX000");
  });
});

describe("removeTeammate", () => {
  const target = { userId: "10000000-0000-4000-a000-000000000003" };

  it("refuses a member before touching anything", async () => {
    const deps = removeDeps({ viewer: () => Promise.resolve(MEMBER) });
    expect(await removeTeammate(target, deps)).toEqual({ status: "forbidden" });
    expect(deps.removeMember).not.toHaveBeenCalled();
    expect(deps.blockAuthUser).not.toHaveBeenCalled();
  });

  it("refuses removing yourself", async () => {
    const deps = removeDeps();
    expect(await removeTeammate({ userId: ADMIN_ID }, deps)).toEqual({
      status: "cannot_remove_self",
    });
    expect(deps.removeMember).not.toHaveBeenCalled();
  });

  it("removes, then blocks sign-in", async () => {
    const deps = removeDeps();
    expect(await removeTeammate(target, deps)).toEqual({ status: "removed" });
    expect(deps.removeMember).toHaveBeenCalledWith(target.userId);
    expect(deps.blockAuthUser).toHaveBeenCalledWith(target.userId);
  });

  it("maps the SQL refusals", async () => {
    const cases = [
      ["42501", "forbidden"],
      ["PT403", "cannot_remove_self"],
      ["PT409", "project_lead"],
      ["P0002", "not_found"],
      ["XX000", "failed"],
    ] as const;
    for (const [code, status] of cases) {
      const deps = removeDeps({
        removeMember: () => Promise.resolve({ error: { code } }),
      });
      expect(await removeTeammate(target, deps)).toEqual({ status });
      expect(deps.blockAuthUser).not.toHaveBeenCalled();
    }
  });

  it("still reports removed when blocking fails (the database already refuses them)", async () => {
    const deps = removeDeps({ blockAuthUser: () => Promise.resolve(false) });
    expect(await removeTeammate(target, deps)).toEqual({ status: "removed" });
    expect(deps.reportFailure).toHaveBeenCalledWith(
      "block_auth_user",
      undefined,
    );
  });

  it("treats a malformed id as not found", async () => {
    expect(await removeTeammate({ userId: "nope" }, removeDeps())).toEqual({
      status: "not_found",
    });
  });
});
