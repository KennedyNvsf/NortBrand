import { z } from "zod";

import type { TeamViewer } from "../team-admin";
import {
  MAX_STAGE_NAME,
  MAX_STAGES,
  MAX_WEEKS,
  SETTINGS_ERRORS,
  TEAM_DOMAIN,
  normalizeDomain,
  templateProblem,
  type SettingsError,
  type SettingsFieldErrors,
} from "./rules";

/*
 * Workspace Settings (#159; Figma TM-13 546:583). Server-side rules, free of Next.js and
 * Supabase so they're tested directly; actions.ts supplies the real dependencies.
 *
 *   admin? → validate (zod, mirroring the SQL checks) → portal_save_settings, which
 *   checks the role again, refuses a stale save and replaces the template atomically.
 *
 * Values and where they take effect:
 *   codeMaxTries, lockoutMinutes  the client and team sign-in functions (SQL)
 *   sessionDays                   client session markers, from the next sign-in
 *   dailyDigest                   portal_claim_digests skips while it's off (SQL)
 *   notifyFirstClientSignIn       portal_complete_client_sign_in → the lead's email
 *   allowedTeamDomain             the team_members trigger, on every invite (SQL)
 *   stages                        new projects (create-project.ts)
 * "Codes expire after" is Supabase Auth's OTP expiry, shown read-only (lead's decision,
 * 2026-11-21); "Needs you" emails are always on.
 */

const stageName = z
  .string()
  .trim()
  .min(1, "stageNameInvalid")
  .max(MAX_STAGE_NAME, "stageNameInvalid");

const stageSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("work"),
    name: stageName,
    weeks: z
      .int("weeksInvalid")
      .min(1, "weeksInvalid")
      .max(MAX_WEEKS, "weeksInvalid"),
  }),
  z.object({ kind: z.literal("launch"), name: stageName }),
  z.object({ kind: z.literal("after"), name: stageName }),
]);

export const settingsSchema = z
  .object({
    updatedAt: z.string().min(1).max(64),
    codeMaxTries: z.int().min(1).max(10),
    lockoutMinutes: z.int().min(1).max(1440),
    sessionDays: z.int().min(1).max(90),
    dailyDigest: z.boolean(),
    notifyFirstClientSignIn: z.boolean(),
    allowedTeamDomain: z
      .string()
      .max(260, "domainInvalid")
      .nullable()
      .transform((value) => normalizeDomain(value ?? ""))
      .refine(
        (value) =>
          value === null || (value.length <= 253 && TEAM_DOMAIN.test(value)),
        "domainInvalid",
      ),
    stages: z.array(stageSchema).min(3).max(MAX_STAGES),
  })
  .superRefine((input, context) => {
    const problem = templateProblem(input.stages);
    if (problem) {
      context.addIssue({ code: "custom", path: ["stages"], message: problem });
    }
  });

export type ValidSettings = z.output<typeof settingsSchema>;

export type SaveSettingsResult =
  | { status: "saved"; updatedAt: string }
  | { status: "invalid"; fieldErrors: SettingsFieldErrors }
  | { status: "forbidden" }
  | { status: "stale" }
  | { status: "failed" };

type DbError = { error: { code: string | undefined; message?: string } };

function isSettingsError(value: string): value is SettingsError {
  return (SETTINGS_ERRORS as readonly string[]).includes(value);
}

export function settingsFieldErrors(
  issues: readonly { path: PropertyKey[]; message: string }[],
): SettingsFieldErrors {
  const errors: SettingsFieldErrors = {};
  for (const issue of issues) {
    const [field, index, key] = issue.path;
    if (field === "allowedTeamDomain") {
      errors.allowedTeamDomain ??= "domainInvalid";
    } else if (
      field === "stages" &&
      typeof index === "number" &&
      (key === "name" || key === "weeks")
    ) {
      errors.stages ??= {};
      const stage = (errors.stages[index] ??= {});
      stage[key] ??= isSettingsError(issue.message)
        ? issue.message
        : key === "name"
          ? "stageNameInvalid"
          : "weeksInvalid";
    } else {
      // The template's shape, or a select/switch value the form never offers.
      errors.template ??= isSettingsError(issue.message)
        ? issue.message
        : "templateInvalid";
    }
  }
  return errors;
}

export async function saveSettings(
  input: unknown,
  deps: {
    viewer: () => Promise<TeamViewer>;
    save: (settings: ValidSettings) => Promise<{ updatedAt: string } | DbError>;
    reportFailure: (where: string, code: string | undefined) => void;
  },
): Promise<SaveSettingsResult> {
  const viewer = await deps.viewer();
  if (viewer.status !== "signed_in" || viewer.role !== "admin") {
    return { status: "forbidden" };
  }

  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "invalid",
      fieldErrors: settingsFieldErrors(parsed.error.issues),
    };
  }

  const result = await deps.save(parsed.data);
  if ("updatedAt" in result) {
    return { status: "saved", updatedAt: result.updatedAt };
  }
  const { code, message } = result.error;
  if (code === "42501") return { status: "forbidden" };
  if (code === "PT409" && message?.includes("stale_settings")) {
    return { status: "stale" };
  }
  if (code === "23514" || code === "22023") {
    return { status: "invalid", fieldErrors: { template: "templateInvalid" } };
  }
  deps.reportFailure("save_settings", code);
  return { status: "failed" };
}
