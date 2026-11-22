import { z } from "zod";

import type { TeamViewer } from "../team-admin";

/*
 * Changing a teammate's role (#142; Figma TM-12). Admins only, checked here and in SQL
 * (portal_set_team_role), which also refuses to demote the last active admin. Free of
 * Next.js and Supabase so it's tested directly.
 */

export const roleSchema = z.object({
  userId: z.uuid(),
  role: z.enum(["admin", "member"]),
});

export type RoleResult =
  | { status: "saved" }
  | {
      status: "refused";
      error: "forbidden" | "lastAdmin" | "notFound" | "failed";
    };

type DbError = { error: { code: string | undefined; message?: string } };

export async function setTeamRole(
  input: unknown,
  deps: {
    viewer: () => Promise<TeamViewer>;
    save: (userId: string, role: "admin" | "member") => Promise<"ok" | DbError>;
    reportFailure: (where: string, code: string | undefined) => void;
  },
): Promise<RoleResult> {
  const viewer = await deps.viewer();
  if (viewer.status !== "signed_in" || viewer.role !== "admin") {
    return { status: "refused", error: "forbidden" };
  }
  const parsed = roleSchema.safeParse(input);
  if (!parsed.success) return { status: "refused", error: "notFound" };

  const result = await deps.save(parsed.data.userId, parsed.data.role);
  if (result === "ok") return { status: "saved" };
  const { code, message } = result.error;
  if (code === "PT409" && message?.includes("last_admin")) {
    return { status: "refused", error: "lastAdmin" };
  }
  if (code === "42501") return { status: "refused", error: "forbidden" };
  if (code === "P0002") return { status: "refused", error: "notFound" };
  deps.reportFailure("set_team_role", code);
  return { status: "refused", error: "failed" };
}
