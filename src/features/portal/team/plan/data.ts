import { cache } from "react";

import { isFakeBackendEnabled } from "@/lib/e2e-backend";
import { getPortalSupabase } from "@/lib/supabase/auth";

import { getTeamBoard, type TeamBoard } from "../board/data";
import { fakeLiveUpdates } from "../updates/e2e-store";
import type { PlanClient } from "./plan";

/*
 * Reads for the team project overview and timeline (#138). They build on the board's
 * read (cached per request) and add the clients and the latest updates. Server-only,
 * under the teammate's session (RLS); per user and per request (ADR-009).
 */

export type TeamUpdate = {
  id: string;
  body: string;
  authorName: string | null;
  createdAt: string;
};

export type TeamPlan = TeamBoard & {
  clients: PlanClient[];
  updates: TeamUpdate[];
};

const STATUSES: readonly PlanClient["status"][] = [
  "invited",
  "active",
  "removed",
];
const isStatus = (value: string): value is PlanClient["status"] =>
  (STATUSES as readonly string[]).includes(value);

export const getTeamPlan = cache(async function getTeamPlan(
  publicId: string,
): Promise<TeamPlan | null> {
  const board = await getTeamBoard(publicId);
  if (!board) return null;

  if (isFakeBackendEnabled()) {
    return {
      ...board,
      clients: [
        {
          email: "joao@e2e.example",
          name: "João Marques",
          status: "active",
          invitedAt: "2026-10-01T10:00:00Z",
          lastSignInAt: "2026-11-13T09:00:00Z",
        },
        {
          email: "leonor@e2e.example",
          name: "Leonor Faria",
          status: "invited",
          invitedAt: "2026-11-02T10:00:00Z",
          lastSignInAt: null,
        },
      ],
      updates: fakeLiveUpdates()
        .slice(0, 4)
        .map(({ id, body, authorName, createdAt }) => ({
          id,
          body,
          authorName,
          createdAt,
        })),
    };
  }

  const supabase = await getPortalSupabase();
  const [clients, updates] = await Promise.all([
    supabase
      .from("project_clients")
      .select("email, name, status, invited_at, last_sign_in_at")
      .eq("project_id", board.project.id)
      .neq("status", "removed"),
    supabase
      .from("updates")
      .select(
        "id, body, created_at, author:team_members!updates_author_id_fkey(name)",
      )
      .eq("project_id", board.project.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(4),
  ]);
  if (clients.error) throw new Error(`Clients failed (${clients.error.code})`);
  if (updates.error) throw new Error(`Updates failed (${updates.error.code})`);

  return {
    ...board,
    clients: clients.data.flatMap((client) =>
      isStatus(client.status)
        ? [
            {
              email: client.email,
              name: client.name,
              status: client.status,
              invitedAt: client.invited_at,
              lastSignInAt: client.last_sign_in_at,
            },
          ]
        : [],
    ),
    updates: updates.data.map((update) => ({
      id: update.id,
      body: update.body,
      authorName: update.author.name,
      createdAt: update.created_at,
    })),
  };
});

/** Where the client's notifications go: everyone invited or active on the project. */
export async function getClientRecipients(
  projectId: string,
): Promise<{ email: string; locale: "en" | "pt" }[]> {
  if (isFakeBackendEnabled())
    return [{ email: "joao@e2e.example", locale: "pt" }];
  const { data, error } = await (
    await getPortalSupabase()
  )
    .from("project_clients")
    .select("email, locale")
    .eq("project_id", projectId)
    .in("status", ["invited", "active"]);
  if (error) throw new Error(`Recipients failed (${error.code})`);
  return data.map((row) => ({
    email: row.email,
    locale: row.locale === "en" ? "en" : "pt",
  }));
}
