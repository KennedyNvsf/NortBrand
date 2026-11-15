import { z } from "zod";

import type { TeamViewer } from "../team-admin";
import { HEALTH_VALUES } from "./plan";

/*
 * Changing the project plan (#138), free of Next.js and Supabase; actions.ts supplies
 * the real dependencies. Every write runs under the teammate's own session, so RLS and
 * the SQL functions decide (works_on_project, locked stages, the current stage only).
 *
 * Health, launch date and completing a stage can post an update (in the same SQL
 * transaction) and then email the client. The email goes after the change is saved: a
 * failed email never undoes it, it's reported and the result says so.
 */

type DbError = { error: { code: string | undefined } };

function isDbError(value: unknown): value is DbError {
  return typeof value === "object" && value !== null && "error" in value;
}

const body = z.string().trim().max(4000, "bodyInvalid");
const isoDate = z.iso.date("dateInvalid");

export const healthSchema = z.object({
  projectId: z.uuid(),
  health: z.enum(HEALTH_VALUES, "healthInvalid"),
  update: body.nullable(),
  notify: z.boolean(),
});

export const launchSchema = z.object({
  projectId: z.uuid(),
  launchesOn: isoDate,
  update: body.nullable(),
  notify: z.boolean(),
});

export const stageDatesSchema = z
  .object({
    stageId: z.uuid(),
    startsOn: isoDate,
    endsOn: isoDate.nullable(),
  })
  .refine((dates) => dates.endsOn === null || dates.endsOn >= dates.startsOn, {
    path: ["endsOn"],
    message: "endBeforeStart",
  });

export const reopenSchema = z.object({ stageId: z.uuid() });

export const completeSchema = z.object({
  stageId: z.uuid(),
  moveOpen: z.boolean(),
  update: body.nullable(),
  notify: z.boolean(),
});

export type PlanResult =
  | {
      status: "saved";
      posted: boolean;
      notified: number;
      notifyFailed: boolean;
    }
  | { status: "invalid"; error: string }
  | { status: "locked" }
  | { status: "not_current" }
  | { status: "not_found" }
  | { status: "forbidden" }
  | { status: "failed" };

export type PlanDeps = {
  viewer: () => Promise<TeamViewer>;
  /** Emails the client the update; resolves to how many were sent (throws on failure). */
  notify: (update: string) => Promise<number>;
  reportFailure: (where: string, code: string | undefined) => void;
};

function refused(where: string, error: DbError, deps: PlanDeps): PlanResult {
  switch (error.error.code) {
    case "42501":
      return { status: "forbidden" };
    case "P0002":
      return { status: "not_found" };
    case "PT409":
      return where === "stage_dates"
        ? { status: "locked" }
        : { status: "not_current" };
    case "23514":
      return { status: "invalid", error: "dateInvalid" };
    default:
      deps.reportFailure(where, error.error.code);
      return { status: "failed" };
  }
}

async function finish(
  posted: string | null,
  update: string | null,
  notify: boolean,
  deps: PlanDeps,
): Promise<PlanResult> {
  if (!posted || !update || !notify) {
    return {
      status: "saved",
      posted: posted !== null,
      notified: 0,
      notifyFailed: false,
    };
  }
  try {
    return {
      status: "saved",
      posted: true,
      notified: await deps.notify(update),
      notifyFailed: false,
    };
  } catch {
    deps.reportFailure("notify_client", undefined);
    return { status: "saved", posted: true, notified: 0, notifyFailed: true };
  }
}

async function run<T>(
  schema: z.ZodType<T>,
  input: unknown,
  deps: PlanDeps,
  apply: (data: T) => Promise<PlanResult>,
): Promise<PlanResult> {
  if ((await deps.viewer()).status !== "signed_in")
    return { status: "forbidden" };
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "invalid",
      error: parsed.error.issues[0]?.message ?? "invalid",
    };
  }
  return apply(parsed.data);
}

export function setHealth(
  input: unknown,
  deps: PlanDeps & {
    save: (
      data: z.infer<typeof healthSchema>,
    ) => Promise<string | null | DbError>;
  },
) {
  return run(healthSchema, input, deps, async (data) => {
    const saved = await deps.save(data);
    if (isDbError(saved)) return refused("set_health", saved, deps);
    return finish(saved, data.update, data.notify, deps);
  });
}

export function setLaunch(
  input: unknown,
  deps: PlanDeps & {
    save: (
      data: z.infer<typeof launchSchema>,
    ) => Promise<string | null | DbError>;
  },
) {
  return run(launchSchema, input, deps, async (data) => {
    const saved = await deps.save(data);
    if (isDbError(saved)) return refused("set_launch", saved, deps);
    return finish(saved, data.update, data.notify, deps);
  });
}

export function setStageDates(
  input: unknown,
  deps: PlanDeps & {
    save: (data: z.infer<typeof stageDatesSchema>) => Promise<"ok" | DbError>;
  },
) {
  return run(stageDatesSchema, input, deps, async (data) => {
    const saved = await deps.save(data);
    if (isDbError(saved)) return refused("stage_dates", saved, deps);
    return { status: "saved", posted: false, notified: 0, notifyFailed: false };
  });
}

export function reopenStage(
  input: unknown,
  deps: PlanDeps & {
    save: (data: z.infer<typeof reopenSchema>) => Promise<"ok" | DbError>;
  },
) {
  return run(reopenSchema, input, deps, async (data) => {
    const saved = await deps.save(data);
    if (isDbError(saved)) return refused("reopen_stage", saved, deps);
    return { status: "saved", posted: false, notified: 0, notifyFailed: false };
  });
}

export function completeStage(
  input: unknown,
  deps: PlanDeps & {
    save: (
      data: z.infer<typeof completeSchema>,
    ) => Promise<string | null | DbError>;
  },
) {
  return run(completeSchema, input, deps, async (data) => {
    const saved = await deps.save(data);
    if (isDbError(saved)) return refused("complete_stage", saved, deps);
    return finish(saved, data.update, data.notify, deps);
  });
}
