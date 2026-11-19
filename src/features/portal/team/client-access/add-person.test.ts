import { describe, expect, it, vi } from "vitest";

import { addPerson, type AddPersonDeps } from "./add-person";

const PROJECT = "00000000-0000-4000-b000-000000000001";
const ADMIN = {
  status: "signed_in",
  userId: "00000000-0000-4000-a000-000000000001",
  name: "Ana Costa",
  role: "admin",
} as const;
const INPUT = {
  projectId: PROJECT,
  email: "Marta@Atlantico.pt",
  name: "Marta Reis",
  locale: "pt",
};

function deps(overrides: Partial<AddPersonDeps> = {}): AddPersonDeps {
  return {
    viewer: () => Promise.resolve(ADMIN),
    findAccount: () => Promise.resolve({ userId: null, isTeammate: false }),
    createAuthUser: () =>
      Promise.resolve({
        ok: true,
        userId: "00000000-0000-4000-a000-0000000000a1",
      }),
    deleteAuthUser: vi.fn(() => Promise.resolve()),
    addClient: vi.fn(() => Promise.resolve("ok" as const)),
    sendWelcome: vi.fn(() => Promise.resolve(true)),
    logInviteSent: vi.fn(() => Promise.resolve()),
    reportFailure: vi.fn(),
    ...overrides,
  };
}

describe("addPerson", () => {
  it("creates the account, adds the person, emails and logs the invite", async () => {
    const d = deps();
    expect(await addPerson(INPUT, d)).toEqual({
      status: "added",
      emailed: true,
    });
    expect(d.addClient).toHaveBeenCalledWith(
      {
        projectId: PROJECT,
        email: "marta@atlantico.pt",
        name: "Marta Reis",
        locale: "pt",
      },
      "00000000-0000-4000-a000-0000000000a1",
    );
    expect(d.logInviteSent).toHaveBeenCalled();
  });

  it("reuses an existing account and never creates a second one", async () => {
    const createAuthUser = vi.fn();
    const d = deps({
      findAccount: () =>
        Promise.resolve({
          userId: "00000000-0000-4000-a000-0000000000b2",
          isTeammate: false,
        }),
      createAuthUser,
    });
    await addPerson(INPUT, d);
    expect(createAuthUser).not.toHaveBeenCalled();
    expect(d.addClient).toHaveBeenCalledWith(
      expect.anything(),
      "00000000-0000-4000-a000-0000000000b2",
    );
  });

  it("deletes the new account when the person can't be added", async () => {
    const d = deps({
      addClient: () =>
        Promise.resolve({ error: { code: "PT409", message: "already_added" } }),
    });
    expect(await addPerson(INPUT, d)).toEqual({
      status: "refused",
      error: "alreadyAdded",
    });
    expect(d.deleteAuthUser).toHaveBeenCalledWith(
      "00000000-0000-4000-a000-0000000000a1",
    );
  });

  it("refuses teammates, bad emails and members before touching anything", async () => {
    const createAuthUser = vi.fn();
    expect(
      await addPerson(
        INPUT,
        deps({
          findAccount: () =>
            Promise.resolve({ userId: null, isTeammate: true }),
          createAuthUser,
        }),
      ),
    ).toEqual({ status: "refused", error: "isTeammate" });
    expect(
      await addPerson({ ...INPUT, email: "marta@" }, deps({ createAuthUser })),
    ).toEqual({
      status: "refused",
      error: "emailInvalid",
    });
    expect(
      await addPerson(
        INPUT,
        deps({
          viewer: () => Promise.resolve({ ...ADMIN, role: "member" }),
          createAuthUser,
        }),
      ),
    ).toEqual({ status: "refused", error: "forbidden" });
    expect(createAuthUser).not.toHaveBeenCalled();
  });

  it("keeps the person when the welcome email fails, and says so", async () => {
    const d = deps({ sendWelcome: () => Promise.resolve(false) });
    expect(await addPerson(INPUT, d)).toEqual({
      status: "added",
      emailed: false,
    });
    expect(d.logInviteSent).not.toHaveBeenCalled();
  });
});
