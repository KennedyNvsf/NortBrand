import { z } from "zod";

/*
 * Team administration rules (#132, ADR-009), free of Next.js and Supabase so they can be
 * tested with fakes. The server actions (actions.ts) supply the real dependencies.
 *
 * Roles are enforced twice: here, every action starts by checking that the viewer is an
 * active admin, and in SQL, every function refuses non-admins (42501), so a forged call
 * fails even if this check were skipped.
 *
 * Invite: check (admin, allowed domain, not already on the team) → reuse the auth user
 * for that email or create one (service role, auth administration only) → add the
 * teammate under the admin's session. If adding fails after creating a user, the user is
 * deleted again, so a failed invite leaves nothing behind.
 * Remove: SQL deactivates and reassigns; then sign-in is blocked in Supabase Auth.
 */

export type TeamRole = "admin" | "member";

export type TeamViewer =
  | { status: "signed_in"; userId: string; name: string; role: TeamRole }
  | { status: "signed_out" }
  | { status: "anonymous" };

const name = z.string().trim().min(1, "nameInvalid").max(80, "nameInvalid");
const email = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, "emailInvalid")
  .pipe(z.email("emailInvalid"));

export const inviteSchema = z.object({
  name,
  email,
  role: z.enum(["admin", "member"], "roleInvalid"),
});

export const removeSchema = z.object({ userId: z.uuid() });

export type InviteFieldErrors = Partial<
  Record<
    "name" | "email" | "role",
    "nameInvalid" | "emailInvalid" | "roleInvalid"
  >
>;

export type InviteResult =
  | { status: "invited" }
  | { status: "invalid"; fieldErrors: InviteFieldErrors }
  | { status: "forbidden" }
  | { status: "domain_not_allowed" }
  | { status: "already_member" }
  | { status: "failed" };

export type RemoveResult =
  | { status: "removed" }
  | { status: "forbidden" }
  | { status: "cannot_remove_self" }
  | { status: "project_lead" }
  | { status: "not_found" }
  | { status: "failed" };

type DbError = { error: { code: string | undefined } };

export type InviteDeps = {
  viewer: () => Promise<TeamViewer>;
  checkInvite: (
    email: string,
  ) => Promise<
    | { status: "ok"; userId: string | null }
    | { status: "domain_not_allowed" | "already_member" }
    | DbError
  >;
  createAuthUser: (
    email: string,
  ) => Promise<{ ok: true; userId: string } | { ok: false; code: string }>;
  deleteAuthUser: (userId: string) => Promise<void>;
  unblockAuthUser: (userId: string) => Promise<boolean>;
  addMember: (
    userId: string,
    name: string,
    role: TeamRole,
  ) => Promise<"ok" | DbError>;
  reportFailure: (where: string, code: string | undefined) => void;
};

export type RemoveDeps = {
  viewer: () => Promise<TeamViewer>;
  removeMember: (userId: string) => Promise<"ok" | DbError>;
  blockAuthUser: (userId: string) => Promise<boolean>;
  reportFailure: (where: string, code: string | undefined) => void;
};

function isDbError(value: unknown): value is DbError {
  return typeof value === "object" && value !== null && "error" in value;
}

const isAdmin = (viewer: TeamViewer) =>
  viewer.status === "signed_in" && viewer.role === "admin";

const FIELD_KEYS = ["nameInvalid", "emailInvalid", "roleInvalid"] as const;

function fieldErrors(
  issues: { path: PropertyKey[]; message: string }[],
): InviteFieldErrors {
  const errors: InviteFieldErrors = {};
  for (const issue of issues) {
    const field = issue.path[0];
    const message = FIELD_KEYS.find((key) => key === issue.message);
    if (
      (field === "name" || field === "email" || field === "role") &&
      message &&
      !errors[field]
    ) {
      errors[field] = message;
    }
  }
  return errors;
}

export async function inviteTeammate(
  input: unknown,
  deps: InviteDeps,
): Promise<InviteResult> {
  if (!isAdmin(await deps.viewer())) return { status: "forbidden" };

  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "invalid", fieldErrors: fieldErrors(parsed.error.issues) };
  }
  const invite = parsed.data;

  const check = await deps.checkInvite(invite.email);
  if (isDbError(check)) {
    if (check.error.code === "42501") return { status: "forbidden" };
    deps.reportFailure("check_invite", check.error.code);
    return { status: "failed" };
  }
  if (check.status !== "ok") return { status: check.status };

  let userId = check.userId;
  let created = false;
  if (userId === null) {
    const user = await deps.createAuthUser(invite.email);
    if (!user.ok) {
      deps.reportFailure("create_auth_user", user.code);
      return { status: "failed" };
    }
    userId = user.userId;
    created = true;
  } else if (!(await deps.unblockAuthUser(userId))) {
    // A returning teammate whose sign-in was blocked when they were removed.
    deps.reportFailure("unblock_auth_user", undefined);
    return { status: "failed" };
  }

  const added = await deps.addMember(userId, invite.name, invite.role);
  if (isDbError(added)) {
    if (created) await deps.deleteAuthUser(userId);
    if (added.error.code === "PT422") return { status: "domain_not_allowed" };
    if (added.error.code === "42501") return { status: "forbidden" };
    deps.reportFailure("add_member", added.error.code);
    return { status: "failed" };
  }
  return { status: "invited" };
}

export async function removeTeammate(
  input: unknown,
  deps: RemoveDeps,
): Promise<RemoveResult> {
  const viewer = await deps.viewer();
  if (viewer.status !== "signed_in" || viewer.role !== "admin") {
    return { status: "forbidden" };
  }

  const parsed = removeSchema.safeParse(input);
  if (!parsed.success) return { status: "not_found" };
  const { userId } = parsed.data;
  if (userId === viewer.userId) return { status: "cannot_remove_self" };

  const removed = await deps.removeMember(userId);
  if (isDbError(removed)) {
    switch (removed.error.code) {
      case "42501":
        return { status: "forbidden" };
      case "PT403":
        return { status: "cannot_remove_self" };
      case "PT409":
        return { status: "project_lead" };
      case "P0002":
        return { status: "not_found" };
      default:
        deps.reportFailure("remove_member", removed.error.code);
        return { status: "failed" };
    }
  }

  // The database is the source of truth (they're already inactive, and every team page
  // checks that), so a failed block is reported, not shown as a failure.
  if (!(await deps.blockAuthUser(userId))) {
    deps.reportFailure("block_auth_user", undefined);
  }
  return { status: "removed" };
}
