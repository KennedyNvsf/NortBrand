import { z } from "zod";

import { TICKET_STATUSES } from "../../overview/domain";
import type { TicketField } from "./conflict";

export type {
  EditableChecklistItem,
  EditableTicket,
  TicketChange,
  TicketField,
} from "./conflict";
export { describeConflict } from "./conflict";

/*
 * The ticket editor's data and rules (#137), free of Next.js and Supabase.
 *
 * Saves are versioned: the editor sends the version it loaded (tickets.updated_at), and
 * SQL refuses a save if someone saved since (portal_save_ticket → 'conflict'). Then
 * `describeConflict` compares what this editor loaded with what's saved now, so the
 * notice can say who changed what. Nothing is lost: the form keeps its values, and
 * "Keep mine" saves them over the new version once the person has seen the other change.
 */

const checklistItem = z.object({
  id: z.uuid().optional(),
  label: z
    .string()
    .trim()
    .min(1, "checklistInvalid")
    .max(200, "checklistInvalid"),
  done: z.boolean(),
});

export const saveTicketSchema = z.object({
  projectId: z.uuid(),
  ticketId: z.uuid().nullable(),
  version: z.string().max(40).nullable(),
  title: z.string().trim().min(1, "titleInvalid").max(160, "titleInvalid"),
  description: z.string().max(5000, "descriptionInvalid"),
  status: z.enum(TICKET_STATUSES, "statusInvalid"),
  stageId: z.uuid("stageInvalid"),
  ownerId: z.uuid("ownerInvalid").nullable(),
  dueOn: z.iso.date("dueInvalid").nullable(),
  clientVisible: z.boolean(),
  checklist: z.array(checklistItem).max(100, "checklistInvalid"),
});

export type SaveTicketInput = z.infer<typeof saveTicketSchema>;

export const TICKET_FIELDS = [
  "title",
  "description",
  "status",
  "stageId",
  "ownerId",
  "dueOn",
  "clientVisible",
  "checklist",
] as const satisfies readonly TicketField[];

export const TICKET_ERRORS = [
  "titleInvalid",
  "descriptionInvalid",
  "statusInvalid",
  "stageInvalid",
  "ownerInvalid",
  "dueInvalid",
  "checklistInvalid",
] as const;
export type TicketError = (typeof TICKET_ERRORS)[number];
export type TicketFieldErrors = Partial<Record<TicketField, TicketError>>;

export function ticketFieldErrors(
  issues: { path: PropertyKey[]; message: string }[],
): TicketFieldErrors {
  const errors: TicketFieldErrors = {};
  for (const issue of issues) {
    const field = TICKET_FIELDS.find((key) => key === issue.path[0]);
    const message = TICKET_ERRORS.find((key) => key === issue.message);
    if (field && message && !errors[field]) errors[field] = message;
  }
  return errors;
}
