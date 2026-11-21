"use server";

import { isFakeBackendEnabled } from "@/lib/e2e-backend";
import { getPortalSupabase } from "@/lib/supabase/auth";

import { reportPortalFailure } from "../../auth/server";
import { getTeamViewer } from "../access";
import { fakeProjects } from "../projects/e2e-store";
import { searchSchema, toHits, type SearchHit, type SearchRow } from "./search";

/*
 * Team search (#142). Signed-in teammates only; the query runs in SQL under their own
 * session (portal_search, SECURITY INVOKER), so RLS decides what can be found.
 */

export type SearchResult =
  | { status: "ok"; hits: SearchHit[] }
  | { status: "too_short" }
  | { status: "failed" };

const FAKE_TICKETS = [
  { number: 9, title: "Menu photos for the menu page" },
  { number: 10, title: "Home page build" },
  { number: 12, title: "Write up kick-off notes" },
];

function fakeSearch(query: string): SearchRow[] {
  const needle = query.toLowerCase();
  const rows: SearchRow[] = [];
  for (const project of fakeProjects()) {
    if (
      [project.name, project.publicId, project.clientName].some((value) =>
        value.toLowerCase().includes(needle),
      )
    ) {
      rows.push({
        kind: "project",
        project_public_id: project.publicId,
        project_name: project.name,
        ticket_number: null,
        title: project.clientName,
      });
    }
  }
  for (const ticket of FAKE_TICKETS) {
    if (ticket.title.toLowerCase().includes(needle)) {
      rows.push({
        kind: "ticket",
        project_public_id: "NB-1234",
        project_name: "E2E Café website",
        ticket_number: ticket.number,
        title: ticket.title,
      });
    }
  }
  return rows;
}

export async function searchAction(input: unknown): Promise<SearchResult> {
  const viewer = await getTeamViewer();
  if (viewer.status !== "signed_in") return { status: "failed" };
  const parsed = searchSchema.safeParse(input);
  if (!parsed.success) return { status: "too_short" };

  if (isFakeBackendEnabled()) {
    return { status: "ok", hits: toHits(fakeSearch(parsed.data)) };
  }
  const { data, error } = await (
    await getPortalSupabase()
  ).rpc("portal_search", {
    p_query: parsed.data,
  });
  if (error) {
    reportPortalFailure("portal-team-admin")("search", error.code);
    return { status: "failed" };
  }
  return { status: "ok", hits: toHits(data) };
}
