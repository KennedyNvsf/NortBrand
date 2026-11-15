import { z } from "zod";

import type { TeamViewer } from "../team-admin";

/*
 * Posting, editing and deleting project updates (#139; Figma TM-03, TM-10), free of
 * Next.js and Supabase; actions.ts supplies the real dependencies. Writes run under the
 * teammate's session (RLS, portal_post_update / _edit_ / _delete_).
 *
 * "Needs you" posts email the client straight away (they never wait for the digest):
 * on posting, and on an edit that newly asks the client for something. The email goes
 * after the post is saved; a failed email never undoes it, and the result says so.
 * Everything else reaches the client in the daily digest.
 */

type DbError = { error: { code: string | undefined } };

function isDbError(value: unknown): value is DbError {
  return typeof value === "object" && value !== null && "error" in value;
}

const fields = {
  body: z.string().trim().min(1, "bodyRequired").max(4000, "bodyTooLong"),
  highlight: z.boolean(),
  needsClient: z.boolean(),
  ticketIds: z
    .array(z.uuid())
    .max(10, "tooManyLinks")
    .transform((ids) => [...new Set(ids)]),
};

export const postSchema = z.object({ projectId: z.uuid(), ...fields });
export const editSchema = z.object({
  projectId: z.uuid(),
  updateId: z.uuid(),
  ...fields,
});
export const deleteSchema = z.object({
  projectId: z.uuid(),
  updateId: z.uuid(),
});

export type UpdateResult =
  | { status: "saved"; notified: number; notifyFailed: boolean }
  | { status: "invalid"; error: string }
  | { status: "not_found" }
  | { status: "forbidden" }
  | { status: "failed" };

export type UpdateDeps = {
  viewer: () => Promise<TeamViewer>;
  /** Emails every client the "Needs you" post; resolves to how many were sent. */
  notifyNeedsYou: (body: string) => Promise<number>;
  reportFailure: (where: string, code: string | undefined) => void;
};

function refused(
  where: string,
  error: DbError,
  deps: UpdateDeps,
): UpdateResult {
  switch (error.error.code) {
    case "42501":
      return { status: "forbidden" };
    case "P0002":
      return { status: "not_found" };
    case "23503":
      return { status: "invalid", error: "linkInvalid" };
    default:
      deps.reportFailure(where, error.error.code);
      return { status: "failed" };
  }
}

async function notify(
  send: boolean,
  body: string,
  deps: UpdateDeps,
): Promise<UpdateResult> {
  if (!send) return { status: "saved", notified: 0, notifyFailed: false };
  try {
    return {
      status: "saved",
      notified: await deps.notifyNeedsYou(body),
      notifyFailed: false,
    };
  } catch {
    deps.reportFailure("notify_needs_you", undefined);
    return { status: "saved", notified: 0, notifyFailed: true };
  }
}

async function signedIn(deps: UpdateDeps) {
  return (await deps.viewer()).status === "signed_in";
}

function invalid(issues: { message: string }[]): UpdateResult {
  return { status: "invalid", error: issues[0]?.message ?? "invalid" };
}

export async function postUpdate(
  input: unknown,
  deps: UpdateDeps & {
    save: (data: z.infer<typeof postSchema>) => Promise<string | DbError>;
  },
): Promise<UpdateResult> {
  if (!(await signedIn(deps))) return { status: "forbidden" };
  const parsed = postSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues);
  const saved = await deps.save(parsed.data);
  if (isDbError(saved)) return refused("post_update", saved, deps);
  return notify(parsed.data.needsClient, parsed.data.body, deps);
}

export async function editUpdate(
  input: unknown,
  deps: UpdateDeps & {
    /** Whether the post asked the client for something before this edit. */
    wasNeedsClient: (updateId: string) => Promise<boolean | null>;
    save: (data: z.infer<typeof editSchema>) => Promise<"ok" | DbError>;
  },
): Promise<UpdateResult> {
  if (!(await signedIn(deps))) return { status: "forbidden" };
  const parsed = editSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues);
  const before = await deps.wasNeedsClient(parsed.data.updateId);
  if (before === null) return { status: "not_found" };
  const saved = await deps.save(parsed.data);
  if (isDbError(saved)) return refused("edit_update", saved, deps);
  return notify(parsed.data.needsClient && !before, parsed.data.body, deps);
}

export async function deleteUpdate(
  input: unknown,
  deps: UpdateDeps & {
    remove: (data: z.infer<typeof deleteSchema>) => Promise<"ok" | DbError>;
  },
): Promise<UpdateResult> {
  if (!(await signedIn(deps))) return { status: "forbidden" };
  const parsed = deleteSchema.safeParse(input);
  if (!parsed.success) return { status: "not_found" };
  const removed = await deps.remove(parsed.data);
  if (isDbError(removed)) return refused("delete_update", removed, deps);
  return { status: "saved", notified: 0, notifyFailed: false };
}
