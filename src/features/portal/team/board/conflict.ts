import type { TicketStatus } from "../../overview/domain";

/*
 * The ticket editor's shape and the conflict rule (#137), with no zod, so the browser can
 * use them: after a refused save, the editor compares what it loaded with what is saved
 * now to say who changed what.
 */

export type TicketField =
  | "title"
  | "description"
  | "status"
  | "stageId"
  | "ownerId"
  | "dueOn"
  | "clientVisible"
  | "checklist";

export type EditableChecklistItem = {
  id?: string;
  label: string;
  done: boolean;
};

export type EditableTicket = {
  id: string | null;
  number: number | null;
  title: string;
  description: string;
  status: TicketStatus;
  stageId: string;
  ownerId: string | null;
  dueOn: string | null;
  clientVisible: boolean;
  checklist: EditableChecklistItem[];
  version: string | null;
};

export type TicketChange = { field: TicketField; value: string | null };

function checklistKey(items: readonly EditableChecklistItem[]): string {
  return JSON.stringify(items.map((item) => [item.label.trim(), item.done]));
}

/**
 * What changed between the version this editor loaded and the one saved now. Values are
 * raw (ids, ISO dates); the UI turns them into names and dates.
 */
export function describeConflict(
  loaded: EditableTicket,
  current: EditableTicket,
): TicketChange[] {
  const changes: TicketChange[] = [];
  const scalar = (
    field: Exclude<TicketField, "checklist" | "clientVisible">,
  ) => {
    if ((loaded[field] ?? null) !== (current[field] ?? null)) {
      changes.push({ field, value: current[field] ?? null });
    }
  };
  scalar("title");
  scalar("status");
  scalar("dueOn");
  scalar("stageId");
  scalar("ownerId");
  scalar("description");
  if (loaded.clientVisible !== current.clientVisible) {
    changes.push({
      field: "clientVisible",
      value: current.clientVisible ? "on" : "off",
    });
  }
  if (checklistKey(loaded.checklist) !== checklistKey(current.checklist)) {
    changes.push({ field: "checklist", value: null });
  }
  return changes;
}
