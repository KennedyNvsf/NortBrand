import { describe, expect, it, vi } from "vitest";

import {
  createProject,
  type CreateProjectDeps,
  type NewProject,
} from "./create-project";
import { DEFAULT_STAGE_TEMPLATE } from "./templates";

const ADMIN = {
  status: "signed_in",
  userId: "00000000-0000-4000-a000-000000000001",
  name: "Ana Costa",
  role: "admin",
} as const;

const input = {
  name: " Tasca do Largo · Website ",
  clientName: "Tasca do Largo",
  leadId: "00000000-0000-4000-a000-000000000001",
  startsOn: "2026-11-17",
  launchesOn: "2027-04-14",
  template: "standard",
  emails: [
    "Ines@TascaDoLargo.pt",
    "pedro@tascadolargo.pt",
    "ines@tascadolargo.pt",
  ],
  locale: "pt",
  suggestedId: "NB-4826",
  sendWelcome: true,
};

function deps(overrides: Partial<CreateProjectDeps> = {}) {
  const saved: NewProject[] = [];
  const base: CreateProjectDeps = {
    viewer: () => Promise.resolve(ADMIN),
    stageTemplate: () => Promise.resolve(DEFAULT_STAGE_TEMPLATE),
    findAccounts: (emails) =>
      Promise.resolve(
        emails.map((email) => ({
          email,
          userId: email.startsWith("ines") ? "user-ines" : null,
          isTeammate: false,
        })),
      ),
    createAuthUser: vi.fn((email: string) =>
      Promise.resolve({ ok: true as const, userId: `new-${email}` }),
    ),
    deleteAuthUser: vi.fn(() => Promise.resolve()),
    createProject: vi.fn((project: NewProject) => {
      saved.push(project);
      return Promise.resolve({
        projectId: "project-1",
        publicId: project.suggestedId ?? "NB-1111",
      });
    }),
    sendWelcome: vi.fn(() => Promise.resolve(true)),
    logInviteSent: vi.fn(() => Promise.resolve("ok" as const)),
    reportFailure: vi.fn(),
  };
  return { deps: { ...base, ...overrides }, saved };
}

describe("createProject", () => {
  it("creates the project with template stages and invites each client once", async () => {
    const { deps: d, saved } = deps();
    const result = await createProject(input, d);

    expect(result).toEqual({
      status: "created",
      projectId: "project-1",
      publicId: "NB-4826",
      sent: 2,
      failed: [],
    });
    expect(saved).toHaveLength(1);
    const project = saved[0];
    expect(project?.name).toBe("Tasca do Largo · Website");
    expect(project?.stages.map((stage) => stage.name)).toEqual([
      "Discovery",
      "Design",
      "Development",
      "Review",
      "Launch",
      "Support",
    ]);
    // Emails are normalised and de-duplicated; existing accounts are reused.
    expect(project?.clients).toEqual([
      { email: "ines@tascadolargo.pt", locale: "pt", userId: "user-ines" },
      {
        email: "pedro@tascadolargo.pt",
        locale: "pt",
        userId: "new-pedro@tascadolargo.pt",
      },
    ]);
    expect(d.createAuthUser).toHaveBeenCalledTimes(1);
    expect(d.logInviteSent).toHaveBeenCalledTimes(2);
  });

  it("refuses members", async () => {
    const { deps: d } = deps({
      viewer: () => Promise.resolve({ ...ADMIN, role: "member" }),
    });
    expect(await createProject(input, d)).toEqual({ status: "forbidden" });
    expect(d.createProject).not.toHaveBeenCalled();
  });

  it("checks the emails before inviting anyone", async () => {
    const { deps: d } = deps();
    const result = await createProject(
      { ...input, emails: ["ines@tascadolargo", "pedro@tascadolargo.pt"] },
      d,
    );
    expect(result).toEqual({
      status: "invalid",
      fieldErrors: { emails: "emailInvalid" },
    });
    expect(d.createAuthUser).not.toHaveBeenCalled();
    expect(d.createProject).not.toHaveBeenCalled();
  });

  it("refuses dates too close for the template", async () => {
    const { deps: d } = deps();
    const result = await createProject(
      { ...input, launchesOn: "2026-11-20" },
      d,
    );
    expect(result).toEqual({
      status: "invalid",
      fieldErrors: { launchesOn: "launchTooSoon" },
    });
  });

  it("refuses a teammate's email as a client", async () => {
    const { deps: d } = deps({
      findAccounts: (emails) =>
        Promise.resolve(
          emails.map((email) => ({
            email,
            userId: "x",
            isTeammate: email.startsWith("pedro"),
          })),
        ),
    });
    expect(await createProject(input, d)).toEqual({
      status: "teammate_email",
      emails: ["pedro@tascadolargo.pt"],
    });
    expect(d.createProject).not.toHaveBeenCalled();
  });

  it("deletes the accounts it created when the transaction fails", async () => {
    const { deps: d } = deps({
      createProject: () => Promise.resolve({ error: { code: "XX000" } }),
    });
    expect(await createProject(input, d)).toEqual({ status: "failed" });
    expect(d.deleteAuthUser).toHaveBeenCalledWith("new-pedro@tascadolargo.pt");
    expect(d.deleteAuthUser).toHaveBeenCalledTimes(1);
    expect(d.sendWelcome).not.toHaveBeenCalled();
    expect(d.reportFailure).toHaveBeenCalledWith("create_project", "XX000");
  });

  it("retries once with a fresh Project ID on a collision", async () => {
    const createProjectFake = vi
      .fn<CreateProjectDeps["createProject"]>()
      .mockResolvedValueOnce({ error: { code: "23505" } })
      .mockResolvedValueOnce({ projectId: "project-2", publicId: "NB-2222" });
    const { deps: d } = deps({ createProject: createProjectFake });
    const result = await createProject(input, d);
    expect(result).toMatchObject({ status: "created", publicId: "NB-2222" });
    expect(createProjectFake.mock.calls[1]?.[0].suggestedId).toBeNull();
  });

  it("keeps the project and reports a failed welcome email", async () => {
    const { deps: d } = deps({
      sendWelcome: (welcome) =>
        Promise.resolve(!welcome.email.startsWith("pedro")),
    });
    expect(await createProject(input, d)).toEqual({
      status: "created",
      projectId: "project-1",
      publicId: "NB-4826",
      sent: 1,
      failed: ["pedro@tascadolargo.pt"],
    });
    expect(d.deleteAuthUser).not.toHaveBeenCalled();
    expect(d.logInviteSent).toHaveBeenCalledTimes(1);
  });

  it("sends nothing when the welcome email is switched off", async () => {
    const { deps: d } = deps();
    const result = await createProject({ ...input, sendWelcome: false }, d);
    expect(result).toMatchObject({ status: "created", sent: 0, failed: [] });
    expect(d.sendWelcome).not.toHaveBeenCalled();
  });

  it("deletes earlier accounts when creating a later one fails", async () => {
    const { deps: d } = deps({
      findAccounts: (emails) =>
        Promise.resolve(
          emails.map((email) => ({ email, userId: null, isTeammate: false })),
        ),
      createAuthUser: vi
        .fn<CreateProjectDeps["createAuthUser"]>()
        .mockResolvedValueOnce({ ok: true, userId: "first" })
        .mockResolvedValueOnce({ ok: false, code: "email_exists" }),
    });
    expect(await createProject(input, d)).toEqual({ status: "failed" });
    expect(d.deleteAuthUser).toHaveBeenCalledWith("first");
    expect(d.createProject).not.toHaveBeenCalled();
  });
});
