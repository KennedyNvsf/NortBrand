import { isFakeBackendEnabled } from "@/lib/e2e-backend";
import { getPortalSupabase } from "@/lib/supabase/auth";

import { isTicketStatus, lisbonToday } from "../../overview/domain";
import type { MyTicket } from "./my-tickets";

/*
 * The viewer's open tickets on active projects (#142; Figma TM-11), under their own
 * session: RLS shows only projects they work on. At most 200 (the page groups and folds
 * them). The fake backend's tickets are dated relative to today, so their groups never
 * go stale.
 */

const LIMIT = 200;

function inDays(days: number): string {
  const today = new Date(`${lisbonToday(new Date())}T12:00:00Z`);
  today.setUTCDate(today.getUTCDate() + days);
  return today.toISOString().slice(0, 10);
}

function fakeMyTickets(): MyTicket[] {
  const project = {
    projectPublicId: "NB-1234",
    projectName: "E2E Café website",
    clientName: "E2E Café",
  };
  return [
    {
      id: "00000000-0000-4000-a000-00000000d001",
      number: 9,
      title: "Menu photos for the menu page",
      status: "blocked",
      dueOn: inDays(-2),
      clientVisible: true,
      ...project,
    },
    {
      id: "00000000-0000-4000-a000-00000000d002",
      number: 12,
      title: "Write up kick-off notes",
      status: "todo",
      dueOn: inDays(0),
      clientVisible: false,
      ...project,
    },
    {
      id: "00000000-0000-4000-a000-00000000d003",
      number: 10,
      title: "Home page build",
      status: "in_progress",
      dueOn: inDays(10),
      clientVisible: true,
      ...project,
    },
    {
      id: "00000000-0000-4000-a000-00000000d004",
      number: 14,
      title: "Brand workshop",
      status: "todo",
      dueOn: null,
      clientVisible: true,
      ...project,
    },
  ];
}

export async function getMyTickets(userId: string): Promise<MyTicket[]> {
  if (isFakeBackendEnabled()) return fakeMyTickets();

  const { data, error } = await (
    await getPortalSupabase()
  )
    .from("tickets")
    .select(
      "id, number, title, status, due_on, client_visible, project:projects!inner(public_id, name, client_name, status)",
    )
    .eq("owner_id", userId)
    .neq("status", "done")
    .eq("project.status", "active")
    .order("due_on", { ascending: true, nullsFirst: false })
    .limit(LIMIT);
  if (error) throw new Error(`My tickets failed (${error.code})`);

  return data.flatMap((row) =>
    isTicketStatus(row.status) && row.status !== "done"
      ? [
          {
            id: row.id,
            number: row.number,
            title: row.title,
            status: row.status,
            dueOn: row.due_on,
            clientVisible: row.client_visible,
            projectPublicId: row.project.public_id,
            projectName: row.project.name,
            clientName: row.project.client_name,
          },
        ]
      : [],
  );
}

/** For the nav count in the fake backend (the real count comes from the shell query). */
export const FAKE_MY_TICKETS_COUNT = 4;
