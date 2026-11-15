import { isFakeBackendEnabled } from "@/lib/e2e-backend";
import { getPortalSupabase } from "@/lib/supabase/auth";

import { fakeFindUpdate, fakeLiveUpdates } from "./e2e-store";

/*
 * The team's updates feed (#139; Figma TM-10). Server-only, under the teammate's session
 * (RLS). Live posts only: a deleted post is gone from the client's feed and from this
 * one; the row stays in the table for the record. Newest first, at most 100.
 */

export type TeamFeedUpdate = {
  id: string;
  body: string;
  authorName: string | null;
  createdAt: string;
  editedAt: string | null;
  highlight: boolean;
  needsClient: boolean;
  ticketIds: string[];
};

export async function getTeamUpdates(
  projectId: string,
): Promise<TeamFeedUpdate[]> {
  if (isFakeBackendEnabled()) {
    return fakeLiveUpdates().map(
      ({ deletedAt: _deleted, ...update }) => update,
    );
  }
  const { data, error } = await (
    await getPortalSupabase()
  )
    .from("updates")
    .select(
      "id, body, created_at, edited_at, highlight, needs_client, author:team_members!updates_author_id_fkey(name), update_tickets(ticket_id)",
    )
    .eq("project_id", projectId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(`Updates failed (${error.code})`);
  return data.map((row) => ({
    id: row.id,
    body: row.body,
    authorName: row.author.name,
    createdAt: row.created_at,
    editedAt: row.edited_at,
    highlight: row.highlight,
    needsClient: row.needs_client,
    ticketIds: row.update_tickets.map((link) => link.ticket_id),
  }));
}

/** Whether a live post currently asks the client for something; null if it's gone. */
export async function updateNeedsClient(
  updateId: string,
): Promise<boolean | null> {
  if (isFakeBackendEnabled())
    return fakeFindUpdate(updateId)?.needsClient ?? null;
  const { data } = await (
    await getPortalSupabase()
  )
    .from("updates")
    .select("needs_client")
    .eq("id", updateId)
    .is("deleted_at", null)
    .maybeSingle();
  return data ? data.needs_client : null;
}
