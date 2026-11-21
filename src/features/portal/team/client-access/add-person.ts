import type { TeamViewer } from "../team-admin";
import {
  accessErrorFor,
  addPersonSchema,
  conflictFor,
  type AccessError,
  type AddPerson,
} from "./access-rules";

/*
 * Add a person who can sign in (#141; TM-09 "add person"), free of Next.js and Supabase.
 * Only admins. The email is checked first; an auth user is created only when none exists
 * (auth administration, ADR-009) and deleted again if adding them fails, so a refused
 * invite leaves nothing behind. The welcome email goes out after the row exists; if it
 * fails the person stays added and the team is told, so they can resend.
 */

type DbError = { error: { code: string | undefined; message?: string } };

const isDbError = (value: unknown): value is DbError =>
  typeof value === "object" && value !== null && "error" in value;

export type AddPersonResult =
  | { status: "added"; emailed: boolean }
  | { status: "refused"; error: AccessError };

export type AddPersonDeps = {
  viewer: () => Promise<TeamViewer>;
  findAccount: (
    email: string,
  ) => Promise<{ userId: string | null; isTeammate: boolean } | DbError>;
  createAuthUser: (
    email: string,
  ) => Promise<{ ok: true; userId: string } | { ok: false; code: string }>;
  deleteAuthUser: (userId: string) => Promise<void>;
  addClient: (person: AddPerson, userId: string) => Promise<"ok" | DbError>;
  sendWelcome: (person: AddPerson) => Promise<boolean>;
  logInviteSent: (person: AddPerson) => Promise<void>;
  reportFailure: (where: string, code: string | undefined) => void;
};

function refusal(where: string, error: DbError, deps: AddPersonDeps) {
  const named =
    (error.error.code === "PT409"
      ? conflictFor(error.error.message ?? "")
      : null) ?? accessErrorFor(error.error.code);
  if (named) return { status: "refused", error: named } as const;
  deps.reportFailure(where, error.error.code);
  return { status: "refused", error: "failed" } as const;
}

export async function addPerson(
  input: unknown,
  deps: AddPersonDeps,
): Promise<AddPersonResult> {
  const viewer = await deps.viewer();
  if (viewer.status !== "signed_in" || viewer.role !== "admin") {
    return { status: "refused", error: "forbidden" };
  }
  const parsed = addPersonSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "refused",
      error:
        parsed.error.issues[0]?.message === "nameTooLong"
          ? "nameTooLong"
          : "emailInvalid",
    };
  }
  const person = parsed.data;

  const account = await deps.findAccount(person.email);
  if (isDbError(account)) return refusal("find_account", account, deps);
  if (account.isTeammate) return { status: "refused", error: "isTeammate" };

  let userId = account.userId;
  let created = false;
  if (!userId) {
    const user = await deps.createAuthUser(person.email);
    if (!user.ok) {
      deps.reportFailure("create_auth_user", user.code);
      return { status: "refused", error: "failed" };
    }
    userId = user.userId;
    created = true;
  }

  const added = await deps.addClient(person, userId);
  if (isDbError(added)) {
    if (created) await deps.deleteAuthUser(userId);
    return refusal("add_client", added, deps);
  }

  const emailed = await deps.sendWelcome(person);
  if (emailed) await deps.logInviteSent(person);
  return { status: "added", emailed };
}
