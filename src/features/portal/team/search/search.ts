import { z } from "zod";

/*
 * Team search (#142; top bar, ⌘K). The query is validated here and searched in SQL
 * (portal_search, SECURITY INVOKER), so results come only through RLS: a teammate never
 * sees a project they can't open. Results link to the project overview or the ticket on
 * its board.
 */

export const searchSchema = z.string().trim().min(2).max(80);

export type SearchHit =
  | {
      kind: "project";
      publicId: string;
      name: string;
      clientName: string;
      href: string;
    }
  | {
      kind: "ticket";
      publicId: string;
      projectName: string;
      number: number;
      title: string;
      href: string;
    };

export type SearchRow = {
  kind: string;
  project_public_id: string;
  project_name: string;
  ticket_number: number | null;
  title: string;
};

export function toHits(rows: readonly SearchRow[]): SearchHit[] {
  return rows.flatMap((row): SearchHit[] => {
    if (row.kind === "project") {
      return [
        {
          kind: "project",
          publicId: row.project_public_id,
          name: row.project_name,
          clientName: row.title,
          href: `/team/projects/${row.project_public_id}`,
        },
      ];
    }
    if (row.kind === "ticket" && row.ticket_number !== null) {
      return [
        {
          kind: "ticket",
          publicId: row.project_public_id,
          projectName: row.project_name,
          number: row.ticket_number,
          title: row.title,
          href: `/team/projects/${row.project_public_id}/board?ticket=${String(row.ticket_number)}`,
        },
      ];
    }
    return [];
  });
}
