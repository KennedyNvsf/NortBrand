"use server";

import { isFakeBackendEnabled } from "@/lib/e2e-backend";
import { getPortalSupabase } from "@/lib/supabase/auth";

import { reportPortalFailure } from "../../auth/server";
import { getTeamViewer } from "../access";
import {
  fakeDeleteFile,
  fakeInspect,
  fakeRegister,
  fakeRemoveObject,
  fakeSignUpload,
  fakeUpdateFile,
} from "./e2e-store";
import {
  deleteFile,
  finishUpload,
  prepareUpload,
  renameFile,
  shareFile,
  type FileResult,
  type PrepareResult,
} from "./files-edit";
import { SNIFF_BYTES } from "./magic";

/*
 * Team file actions (#140). Inputs are untrusted and validated in files-edit.ts; every
 * Storage and table call runs under the teammate's own session (the Storage rules and
 * RLS decide). The service-role key is never used here (ADR-009). Only codes are logged.
 */

const BUCKET = "portal-files";
const report = reportPortalFailure("portal-team-admin");
const base = { viewer: getTeamViewer, reportFailure: report };

async function storage() {
  return (await getPortalSupabase()).storage.from(BUCKET);
}

export async function prepareUploadAction(
  input: unknown,
): Promise<PrepareResult> {
  return prepareUpload(input, {
    ...base,
    newId: () => crypto.randomUUID(),
    signUpload: async (path) => {
      if (isFakeBackendEnabled()) return fakeSignUpload(path);
      const { data, error } = await (
        await storage()
      ).createSignedUploadUrl(path);
      return error
        ? { error: { code: error.name } }
        : { uploadUrl: data.signedUrl };
    },
  });
}

/** The object's first bytes and true size, read through a 60-second signed URL. */
async function inspect(
  path: string,
): Promise<{ head: Uint8Array; size: number } | null> {
  if (isFakeBackendEnabled()) return fakeInspect(path);
  const { data, error } = await (await storage()).createSignedUrl(path, 60);
  if (error) return null;
  const response = await fetch(data.signedUrl, {
    headers: { Range: `bytes=0-${String(SNIFF_BYTES - 1)}` },
    cache: "no-store",
  });
  if (!response.ok) return null;
  const head = new Uint8Array(await response.arrayBuffer()).slice(
    0,
    SNIFF_BYTES,
  );
  const total = response.headers.get("content-range")?.split("/")[1];
  const size = Number(
    total ?? response.headers.get("content-length") ?? head.byteLength,
  );
  return Number.isFinite(size) ? { head, size } : null;
}

async function removeObject(path: string): Promise<void> {
  if (isFakeBackendEnabled()) {
    fakeRemoveObject(path);
    return;
  }
  const { error } = await (await storage()).remove([path]);
  if (error) throw new Error(error.name);
}

export async function finishUploadAction(input: unknown): Promise<FileResult> {
  return finishUpload(input, {
    ...base,
    inspect,
    removeObject,
    register: async (file) => {
      if (isFakeBackendEnabled()) {
        const viewer = await getTeamViewer();
        return fakeRegister({
          ...file,
          uploaderName:
            viewer.status === "signed_in" ? viewer.name : "NortBrand",
        });
      }
      const { error } = await (
        await getPortalSupabase()
      ).rpc("portal_register_file", {
        p_project_id: file.projectId,
        p_file_id: file.fileId,
        p_name: file.name,
        p_size_bytes: file.size,
        p_content_type: file.contentType,
      });
      return error ? { error: { code: error.code } } : "ok";
    },
  });
}

async function updateRow(
  projectId: string,
  fileId: string,
  change: { shared?: boolean; name?: string },
): Promise<"ok" | "not_found" | { error: { code: string | undefined } }> {
  if (isFakeBackendEnabled()) return fakeUpdateFile(fileId, change);
  const { data, error } = await (
    await getPortalSupabase()
  )
    .from("project_files")
    .update(change)
    .eq("id", fileId)
    .eq("project_id", projectId)
    .select("id");
  if (error) return { error: { code: error.code } };
  return data.length > 0 ? "ok" : "not_found";
}

export async function shareFileAction(input: unknown): Promise<FileResult> {
  return shareFile(input, {
    ...base,
    save: ({ projectId, fileId, shared }) =>
      updateRow(projectId, fileId, { shared }),
  });
}

export async function renameFileAction(input: unknown): Promise<FileResult> {
  return renameFile(input, {
    ...base,
    save: ({ projectId, fileId, name }) =>
      updateRow(projectId, fileId, { name }),
  });
}

export async function deleteFileAction(input: unknown): Promise<FileResult> {
  return deleteFile(input, {
    ...base,
    removeRow: async ({ projectId, fileId }) => {
      if (isFakeBackendEnabled()) return fakeDeleteFile(fileId);
      const { data, error } = await (
        await getPortalSupabase()
      )
        .from("project_files")
        .delete()
        .eq("id", fileId)
        .eq("project_id", projectId)
        .select("id");
      if (error) return { error: { code: error.code } };
      return data.length > 0 ? "ok" : "not_found";
    },
    removeObject,
  });
}
