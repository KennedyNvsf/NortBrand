import { z } from "zod";

import type { TeamViewer } from "../team-admin";

/*
 * Archive, restore and delete a client project (#165; lead's decisions 2026-11-22).
 * Free of Next.js and Supabase so it's tested with fakes; lifecycle-actions.ts supplies
 * the real dependencies. Admins only, checked here and again in SQL.
 *
 *   archive / restore  portal_set_project_status (clients lose / regain access; the
 *                      team can't change an archived project, RLS)
 *   delete             list the project's Storage objects → portal_delete_project (the
 *                      typed Project ID, every row by cascade, the clients to drop)
 *                      → remove the Storage objects → delete those clients' accounts
 *
 * Once the project row is gone there is no undo, so a failed Storage or account cleanup
 * is reported (codes only) and returned as leftovers, never turned into a failure.
 */

export const statusSchema = z.object({
  projectId: z.uuid(),
  status: z.enum(["active", "closed"]),
});

export const deleteSchema = z.object({
  projectId: z.uuid(),
  confirm: z.string().trim().min(1).max(16),
});

export type StatusResult =
  | { status: "saved" }
  | { status: "refused"; error: "forbidden" | "notFound" | "failed" };

export type DeleteResult =
  | {
      status: "deleted";
      /** Cleanup that didn't finish; the project itself is gone either way. */
      leftovers: { files: boolean; accounts: number };
    }
  | {
      status: "refused";
      error: "forbidden" | "notFound" | "mismatch" | "failed";
    };

type DbError = { error: { code: string | undefined; message?: string } };

function isDbError(value: unknown): value is DbError {
  return typeof value === "object" && value !== null && "error" in value;
}

function isAdmin(viewer: TeamViewer): boolean {
  return viewer.status === "signed_in" && viewer.role === "admin";
}

export async function setProjectStatus(
  input: unknown,
  deps: {
    viewer: () => Promise<TeamViewer>;
    save: (
      projectId: string,
      status: "active" | "closed",
    ) => Promise<"ok" | DbError>;
    reportFailure: (where: string, code: string | undefined) => void;
  },
): Promise<StatusResult> {
  if (!isAdmin(await deps.viewer())) {
    return { status: "refused", error: "forbidden" };
  }
  const parsed = statusSchema.safeParse(input);
  if (!parsed.success) return { status: "refused", error: "notFound" };

  const result = await deps.save(parsed.data.projectId, parsed.data.status);
  if (result === "ok") return { status: "saved" };
  const { code } = result.error;
  if (code === "42501") return { status: "refused", error: "forbidden" };
  if (code === "P0002") return { status: "refused", error: "notFound" };
  deps.reportFailure("set_project_status", code);
  return { status: "refused", error: "failed" };
}

export async function deleteProject(
  input: unknown,
  deps: {
    viewer: () => Promise<TeamViewer>;
    /** The project's object paths in Storage (projects/<id>/…), read before deleting. */
    listFiles: (projectId: string) => Promise<string[] | DbError>;
    remove: (projectId: string, confirm: string) => Promise<string[] | DbError>;
    removeFiles: (paths: string[]) => Promise<"ok" | DbError>;
    deleteAccount: (userId: string) => Promise<boolean>;
    reportFailure: (where: string, code: string | undefined) => void;
  },
): Promise<DeleteResult> {
  if (!isAdmin(await deps.viewer())) {
    return { status: "refused", error: "forbidden" };
  }
  const parsed = deleteSchema.safeParse(input);
  if (!parsed.success) return { status: "refused", error: "mismatch" };
  const { projectId, confirm } = parsed.data;

  // Listed first: a failed listing only means the cleanup can't run, so it doesn't
  // block the delete (the files are then reported as left over).
  const listed = await deps.listFiles(projectId);
  if (isDbError(listed)) deps.reportFailure("list_files", listed.error.code);

  const removed = await deps.remove(projectId, confirm);
  if (isDbError(removed)) {
    const { code, message } = removed.error;
    if (code === "42501") return { status: "refused", error: "forbidden" };
    if (code === "P0002") return { status: "refused", error: "notFound" };
    if (code === "22023" && message?.includes("confirm_mismatch")) {
      return { status: "refused", error: "mismatch" };
    }
    deps.reportFailure("delete_project", code);
    return { status: "refused", error: "failed" };
  }

  let filesLeft = isDbError(listed);
  if (!isDbError(listed) && listed.length > 0) {
    const cleaned = await deps.removeFiles(listed);
    if (isDbError(cleaned)) {
      deps.reportFailure("remove_files", cleaned.error.code);
      filesLeft = true;
    }
  }

  let accountsLeft = 0;
  for (const userId of removed) {
    if (!(await deps.deleteAccount(userId))) {
      deps.reportFailure("delete_account", undefined);
      accountsLeft += 1;
    }
  }

  return {
    status: "deleted",
    leftovers: { files: filesLeft, accounts: accountsLeft },
  };
}
