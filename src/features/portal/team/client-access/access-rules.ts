import { z } from "zod";

/*
 * Client access rules (#141; Figma TM-06, guarded states TM-09), free of Next.js and
 * Supabase. The database decides again (admin role, the last person, the session cut-off);
 * these keep the page honest and give every refusal a named reason.
 */

export const LOCALES = ["en", "pt"] as const;

const email = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, "emailInvalid")
  .regex(/^[^@\s]+@[^@\s]+\.[^@\s]+$/, "emailInvalid");

export const addPersonSchema = z.object({
  projectId: z.uuid(),
  email,
  name: z
    .string()
    .trim()
    .max(80, "nameTooLong")
    .transform((value) => (value === "" ? null : value)),
  locale: z.enum(LOCALES),
});
export type AddPerson = z.output<typeof addPersonSchema>;

export const personSchema = z.object({
  projectId: z.uuid(),
  clientId: z.uuid(),
});
export const projectSchema = z.object({ projectId: z.uuid() });
export const lockoutSchema = z.object({ projectId: z.uuid(), email });

export type AccessError =
  | "emailInvalid"
  | "nameTooLong"
  | "alreadyAdded"
  | "isTeammate"
  | "lastPerson"
  | "notFound"
  | "forbidden"
  | "failed";

export type ClientPerson = {
  id: string;
  email: string;
  name: string | null;
  locale: "en" | "pt";
  status: "invited" | "active";
  invitedAt: string;
  lastSignInAt: string | null;
};

export type Lockout = { email: string; lockedAt: string; unlocksAt: string };

export type PersonState =
  | { kind: "active"; lastSignInAt: string | null }
  | { kind: "invited"; invitedAt: string }
  | { kind: "locked"; lockedAt: string; unlocksAt: string };

/** What the people list shows for one person: a pause outranks active or invited. */
export function personState(
  person: ClientPerson,
  lockouts: readonly Lockout[],
  now: Date,
): PersonState {
  const lockout = lockouts.find(
    (entry) => entry.email === person.email && new Date(entry.unlocksAt) > now,
  );
  if (lockout) {
    return {
      kind: "locked",
      lockedAt: lockout.lockedAt,
      unlocksAt: lockout.unlocksAt,
    };
  }
  return person.status === "active"
    ? { kind: "active", lastSignInAt: person.lastSignInAt }
    : { kind: "invited", invitedAt: person.invitedAt };
}

/** Mirrors the SQL trigger: someone else must still be able to sign in. */
export function canRemove(
  people: readonly ClientPerson[],
  clientId: string,
): boolean {
  return people.some((person) => person.id !== clientId);
}

export const ACCESS_EVENT_KINDS = [
  "sign_in",
  "wrong_code",
  "locked",
  "lockout_cleared",
  "invite_sent",
  "client_removed",
  "project_id_rotated",
] as const;
export type AccessEventKind = (typeof ACCESS_EVENT_KINDS)[number];

export function isAccessEventKind(value: string): value is AccessEventKind {
  return (ACCESS_EVENT_KINDS as readonly string[]).includes(value);
}

export type AccessEvent = {
  id: number;
  kind: AccessEventKind;
  occurredAt: string;
  email: string | null;
  actorName: string | null;
};

/** Sign-in trouble is shown in red (TM-06: "entered 3 wrong codes"). */
export const isAlertEvent = (kind: AccessEventKind) => kind === "locked";

/** Postgres codes from the access functions, as named refusals. */
export function accessErrorFor(code: string | undefined): AccessError | null {
  switch (code) {
    case "42501":
      return "forbidden";
    case "P0002":
      return "notFound";
    default:
      return null;
  }
}

/** PT409 carries its reason in the message. */
export function conflictFor(message: string): AccessError | null {
  if (message.includes("last_person")) return "lastPerson";
  if (message.includes("already_added")) return "alreadyAdded";
  if (message.includes("client_is_teammate")) return "isTeammate";
  return null;
}
