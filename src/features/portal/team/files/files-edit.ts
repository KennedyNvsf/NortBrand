import { z } from "zod";

import type { TeamViewer } from "../team-admin";
import {
  ALLOWED_TYPES,
  MAX_FILE_BYTES,
  detectFileType,
  type AllowedType,
} from "./magic";

/*
 * Team file uploads and file management (#140; Figma TM-08), free of Next.js and
 * Supabase; actions.ts supplies the real dependencies. Every step runs under the
 * teammate's session, so the Storage rules and RLS decide.
 *
 * Upload, in two steps (Vercel functions take at most 4.5 MB, files up to 50 MB):
 *   prepare  name, declared size and type checked → a fresh file id → a signed upload
 *            URL for projects/<project>/<file id> (Storage refuses other folders)
 *   (browser PUTs the file straight to Storage)
 *   finish   the server reads the object's first bytes and its true size; a file that
 *            isn't really an allowed type, or is over 50 MB, is deleted and refused;
 *            otherwise it's registered, team-only.
 * Share, unshare, rename and delete act on the project_files row; delete also removes
 * the object (row first, so the client loses access at once).
 */

type DbError = { error: { code: string | undefined } };

function isDbError(value: unknown): value is DbError {
  return typeof value === "object" && value !== null && "error" in value;
}

const fileName = z
  .string()
  .trim()
  .min(1, "nameInvalid")
  .max(200, "nameInvalid");

export const prepareSchema = z.object({
  projectId: z.uuid(),
  name: fileName,
  size: z.number().int().min(1, "empty").max(MAX_FILE_BYTES, "tooLarge"),
  contentType: z.enum(ALLOWED_TYPES, "typeNotAllowed"),
});

export const finishSchema = z.object({
  projectId: z.uuid(),
  fileId: z.uuid(),
  name: fileName,
});

export const shareSchema = z.object({
  projectId: z.uuid(),
  fileId: z.uuid(),
  shared: z.boolean(),
});

export const renameSchema = z.object({
  projectId: z.uuid(),
  fileId: z.uuid(),
  name: fileName,
});

export const deleteSchema = z.object({ projectId: z.uuid(), fileId: z.uuid() });

export type FileError =
  | "nameInvalid"
  | "empty"
  | "tooLarge"
  | "typeNotAllowed"
  | "notFound"
  | "forbidden"
  | "failed";

export type PrepareResult =
  | { status: "ready"; fileId: string; uploadUrl: string }
  | { status: "refused"; error: FileError };

export type FileResult =
  { status: "saved" } | { status: "refused"; error: FileError };

export const filePath = (projectId: string, fileId: string) =>
  `projects/${projectId}/${fileId}`;

type Base = {
  viewer: () => Promise<TeamViewer>;
  reportFailure: (where: string, code: string | undefined) => void;
};

function firstError(issues: { message: string }[]): FileError {
  const message = issues[0]?.message;
  return message === "nameInvalid" ||
    message === "empty" ||
    message === "tooLarge" ||
    message === "typeNotAllowed"
    ? message
    : "failed";
}

function refused(where: string, error: DbError, deps: Base): FileResult {
  switch (error.error.code) {
    case "42501":
    case "403":
      return { status: "refused", error: "forbidden" };
    case "P0002":
    case "404":
      return { status: "refused", error: "notFound" };
    case "22023":
      return { status: "refused", error: "typeNotAllowed" };
    default:
      deps.reportFailure(where, error.error.code);
      return { status: "refused", error: "failed" };
  }
}

const signedIn = async (deps: Base) =>
  (await deps.viewer()).status === "signed_in";

export async function prepareUpload(
  input: unknown,
  deps: Base & {
    newId: () => string;
    signUpload: (path: string) => Promise<{ uploadUrl: string } | DbError>;
  },
): Promise<PrepareResult> {
  if (!(await signedIn(deps))) return { status: "refused", error: "forbidden" };
  const parsed = prepareSchema.safeParse(input);
  if (!parsed.success)
    return { status: "refused", error: firstError(parsed.error.issues) };
  const fileId = deps.newId();
  const signed = await deps.signUpload(filePath(parsed.data.projectId, fileId));
  if (isDbError(signed)) {
    const result = refused("sign_upload", signed, deps);
    return result.status === "refused"
      ? result
      : { status: "refused", error: "failed" };
  }
  return { status: "ready", fileId, uploadUrl: signed.uploadUrl };
}

export async function finishUpload(
  input: unknown,
  deps: Base & {
    /** The object's first bytes and its true size, or null when it isn't there. */
    inspect: (
      path: string,
    ) => Promise<{ head: Uint8Array; size: number } | null>;
    removeObject: (path: string) => Promise<void>;
    register: (file: {
      projectId: string;
      fileId: string;
      name: string;
      size: number;
      contentType: AllowedType;
    }) => Promise<"ok" | DbError>;
  },
): Promise<FileResult> {
  if (!(await signedIn(deps))) return { status: "refused", error: "forbidden" };
  const parsed = finishSchema.safeParse(input);
  if (!parsed.success)
    return { status: "refused", error: firstError(parsed.error.issues) };
  const { projectId, fileId, name } = parsed.data;
  const path = filePath(projectId, fileId);

  const object = await deps.inspect(path);
  if (!object) return { status: "refused", error: "notFound" };

  const type = detectFileType(object.head);
  const problem: FileError | null =
    object.size > MAX_FILE_BYTES
      ? "tooLarge"
      : type === null
        ? "typeNotAllowed"
        : null;
  if (problem || type === null) {
    await deps.removeObject(path);
    return { status: "refused", error: problem ?? "typeNotAllowed" };
  }

  const registered = await deps.register({
    projectId,
    fileId,
    name,
    size: object.size,
    contentType: type,
  });
  if (isDbError(registered)) {
    await deps.removeObject(path);
    return refused("register_file", registered, deps);
  }
  return { status: "saved" };
}

async function simple<T>(
  schema: z.ZodType<T>,
  input: unknown,
  where: string,
  deps: Base,
  run: (data: T) => Promise<"ok" | "not_found" | DbError>,
): Promise<FileResult> {
  if (!(await signedIn(deps))) return { status: "refused", error: "forbidden" };
  const parsed = schema.safeParse(input);
  if (!parsed.success)
    return { status: "refused", error: firstError(parsed.error.issues) };
  const result = await run(parsed.data);
  if (result === "not_found") return { status: "refused", error: "notFound" };
  if (isDbError(result)) return refused(where, result, deps);
  return { status: "saved" };
}

export function shareFile(
  input: unknown,
  deps: Base & {
    save: (
      data: z.infer<typeof shareSchema>,
    ) => Promise<"ok" | "not_found" | DbError>;
  },
) {
  return simple(shareSchema, input, "share_file", deps, deps.save);
}

export function renameFile(
  input: unknown,
  deps: Base & {
    save: (
      data: z.infer<typeof renameSchema>,
    ) => Promise<"ok" | "not_found" | DbError>;
  },
) {
  return simple(renameSchema, input, "rename_file", deps, deps.save);
}

export function deleteFile(
  input: unknown,
  deps: Base & {
    removeRow: (
      data: z.infer<typeof deleteSchema>,
    ) => Promise<"ok" | "not_found" | DbError>;
    removeObject: (path: string) => Promise<void>;
  },
) {
  return simple(deleteSchema, input, "delete_file", deps, async (data) => {
    const removed = await deps.removeRow(data);
    if (removed !== "ok") return removed;
    try {
      await deps.removeObject(filePath(data.projectId, data.fileId));
    } catch {
      // The client already can't reach it (no row); the object is an orphan to clean up.
      deps.reportFailure("delete_object", undefined);
    }
    return "ok";
  });
}
