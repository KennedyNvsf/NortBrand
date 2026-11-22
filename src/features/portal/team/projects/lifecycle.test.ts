import { describe, expect, it, vi } from "vitest";

import type { TeamViewer } from "../team-admin";
import { deleteProject, setProjectStatus } from "./lifecycle";

const ADMIN: TeamViewer = {
  status: "signed_in",
  userId: "00000000-0000-4000-a000-000000000001",
  name: "Ana Costa",
  role: "admin",
};
const MEMBER: TeamViewer = { ...ADMIN, role: "member" };
const PROJECT = "00000000-0000-4000-b000-000000000001";

describe("setProjectStatus", () => {
  const deps = (
    save = vi.fn(() => Promise.resolve<"ok">("ok")),
    viewer = ADMIN,
  ) => ({
    viewer: () => Promise.resolve(viewer),
    save,
    reportFailure: vi.fn(),
  });

  it("archives and restores for an admin", async () => {
    const d = deps();
    expect(
      await setProjectStatus({ projectId: PROJECT, status: "closed" }, d),
    ).toEqual({ status: "saved" });
    expect(d.save).toHaveBeenCalledWith(PROJECT, "closed");
  });

  it("refuses a member before saving", async () => {
    const d = deps(undefined, MEMBER);
    expect(
      await setProjectStatus({ projectId: PROJECT, status: "closed" }, d),
    ).toEqual({ status: "refused", error: "forbidden" });
    expect(d.save).not.toHaveBeenCalled();
  });

  it("refuses a status other than active or closed", async () => {
    expect(
      await setProjectStatus({ projectId: PROJECT, status: "gone" }, deps()),
    ).toEqual({ status: "refused", error: "notFound" });
  });
});

describe("deleteProject", () => {
  const deps = (overrides: Record<string, unknown> = {}) => ({
    viewer: () => Promise.resolve(ADMIN),
    listFiles: vi.fn(() =>
      Promise.resolve([`projects/${PROJECT}/a`, `projects/${PROJECT}/b`]),
    ),
    remove: vi.fn(() => Promise.resolve(["client-1"])),
    removeFiles: vi.fn(() => Promise.resolve<"ok">("ok")),
    deleteAccount: vi.fn(() => Promise.resolve(true)),
    reportFailure: vi.fn(),
    ...overrides,
  });

  it("deletes the project, then its files and the orphaned clients' accounts", async () => {
    const d = deps();
    expect(
      await deleteProject({ projectId: PROJECT, confirm: "nb-1234" }, d),
    ).toEqual({ status: "deleted", leftovers: { files: false, accounts: 0 } });
    expect(d.remove).toHaveBeenCalledWith(PROJECT, "nb-1234");
    expect(d.removeFiles).toHaveBeenCalledWith([
      `projects/${PROJECT}/a`,
      `projects/${PROJECT}/b`,
    ]);
    expect(d.deleteAccount).toHaveBeenCalledWith("client-1");
  });

  it("refuses a member before anything happens", async () => {
    const d = deps({ viewer: () => Promise.resolve(MEMBER) });
    expect(
      await deleteProject({ projectId: PROJECT, confirm: "NB-1234" }, d),
    ).toEqual({ status: "refused", error: "forbidden" });
    expect(d.remove).not.toHaveBeenCalled();
  });

  it("a wrong Project ID deletes nothing and cleans nothing", async () => {
    const d = deps({
      remove: vi.fn(() =>
        Promise.resolve({
          error: { code: "22023", message: "confirm_mismatch" },
        }),
      ),
    });
    expect(
      await deleteProject({ projectId: PROJECT, confirm: "NB-9999" }, d),
    ).toEqual({ status: "refused", error: "mismatch" });
    expect(d.removeFiles).not.toHaveBeenCalled();
    expect(d.deleteAccount).not.toHaveBeenCalled();
  });

  it("reports cleanup that didn't finish without undoing the delete", async () => {
    const d = deps({
      removeFiles: vi.fn(() =>
        Promise.resolve({ error: { code: "StorageError" } }),
      ),
      deleteAccount: vi.fn(() => Promise.resolve(false)),
    });
    expect(
      await deleteProject({ projectId: PROJECT, confirm: "NB-1234" }, d),
    ).toEqual({ status: "deleted", leftovers: { files: true, accounts: 1 } });
    expect(d.reportFailure).toHaveBeenCalledWith(
      "remove_files",
      "StorageError",
    );
    expect(d.reportFailure).toHaveBeenCalledWith("delete_account", undefined);
  });

  it("a failed listing doesn't block the delete; the files count as left over", async () => {
    const d = deps({
      listFiles: vi.fn(() =>
        Promise.resolve({ error: { code: "StorageError" } }),
      ),
    });
    expect(
      await deleteProject({ projectId: PROJECT, confirm: "NB-1234" }, d),
    ).toEqual({ status: "deleted", leftovers: { files: true, accounts: 0 } });
    expect(d.removeFiles).not.toHaveBeenCalled();
  });

  it("maps a missing project and an unexpected error", async () => {
    const missing = deps({
      remove: vi.fn(() => Promise.resolve({ error: { code: "P0002" } })),
    });
    expect(
      await deleteProject({ projectId: PROJECT, confirm: "NB-1234" }, missing),
    ).toEqual({ status: "refused", error: "notFound" });
    const broken = deps({
      remove: vi.fn(() => Promise.resolve({ error: { code: "XX000" } })),
    });
    expect(
      await deleteProject({ projectId: PROJECT, confirm: "NB-1234" }, broken),
    ).toEqual({ status: "refused", error: "failed" });
    expect(broken.reportFailure).toHaveBeenCalledWith(
      "delete_project",
      "XX000",
    );
  });
});
