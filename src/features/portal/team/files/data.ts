import { isFakeBackendEnabled } from "@/lib/e2e-backend";
import { getPortalSupabase } from "@/lib/supabase/auth";

import { fakeTeamFiles } from "./e2e-store";

/*
 * The team's files on a project (#140; Figma TM-08): every file, shared or team-only.
 * Server-only, under the teammate's session (RLS: the project's team). Newest first.
 */

export type TeamFile = {
  id: string;
  name: string;
  sizeBytes: number;
  contentType: string;
  shared: boolean;
  uploaderName: string | null;
  createdAt: string;
};

export async function getTeamFiles(projectId: string): Promise<TeamFile[]> {
  if (isFakeBackendEnabled()) {
    return fakeTeamFiles(projectId).map(
      ({ projectId: _project, ...file }) => file,
    );
  }
  const { data, error } = await (
    await getPortalSupabase()
  )
    .from("project_files")
    .select(
      "id, name, size_bytes, content_type, shared, created_at, uploader:team_members!project_files_uploaded_by_fkey(name)",
    )
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(`Files failed (${error.code})`);
  return data.map((row) => ({
    id: row.id,
    name: row.name,
    sizeBytes: row.size_bytes,
    contentType: row.content_type,
    shared: row.shared,
    uploaderName: row.uploader?.name ?? null,
    createdAt: row.created_at,
  }));
}
