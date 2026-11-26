import type { TemplateStage } from "../projects/templates";

/*
 * Settings rules and choices (#159) shared by the form (browser) and settings.ts
 * (server). Zod-free on purpose: client components never load zod (docs/guides/
 * performance.md). The server validates everything again with zod, and SQL once more.
 */

export type WorkspaceSettings = {
  /** `portal_settings.updated_at`, sent back on save to refuse a stale one. */
  updatedAt: string;
  codeMaxTries: number;
  lockoutMinutes: number;
  sessionDays: number;
  dailyDigest: boolean;
  notifyFirstClientSignIn: boolean;
  /** Null: off, any email can be invited (ADR-009). */
  allowedTeamDomain: string | null;
  stages: TemplateStage[];
};

/** The emailed code's lifetime: Supabase Auth's OTP expiry (supabase/config.toml). */
export const CODE_EXPIRY_MINUTES = 10;

/** Choices offered in the selects. A stored value outside them is added (withValue). */
export const TRIES_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
export const LOCKOUT_OPTIONS = [5, 10, 15, 30, 60, 120, 240, 1440] as const;
export const SESSION_OPTIONS = [1, 7, 14, 30, 60, 90] as const;

export function withValue(options: readonly number[], value: number): number[] {
  return options.includes(value)
    ? [...options]
    : [...options, value].sort((a, b) => a - b);
}

export const MAX_STAGES = 12;
export const MAX_WEEKS = 52;
export const MAX_STAGE_NAME = 60;

/** The same rule as `portal_settings.allowed_team_domain`'s check constraint. */
export const TEAM_DOMAIN = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/;

/** What an admin types (" @Studio.PT ") → what's stored ("studio.pt"); empty is off. */
export function normalizeDomain(value: string): string | null {
  const domain = value.trim().toLowerCase().replace(/^@/, "");
  return domain === "" ? null : domain;
}

export const SETTINGS_ERRORS = [
  "domainInvalid",
  "stageNameInvalid",
  "weeksInvalid",
  "templateInvalid",
  "stageNamesRepeat",
] as const;
export type SettingsError = (typeof SETTINGS_ERRORS)[number];

/** Field errors: `allowedTeamDomain`, a stage's `name`/`weeks` by index, or the template. */
export type SettingsFieldErrors = {
  allowedTeamDomain?: SettingsError;
  template?: SettingsError;
  stages?: Record<number, { name?: SettingsError; weeks?: SettingsError }>;
};

/** One or more working stages, then Launch, then the after stage (Support); names unique (any case). */
export function templateProblem(
  stages: readonly TemplateStage[],
): "templateInvalid" | "stageNamesRepeat" | null {
  const kinds = stages.map((stage) => stage.kind);
  const work = kinds.filter((kind) => kind === "work").length;
  const shapeOk =
    stages.length >= 3 &&
    stages.length <= MAX_STAGES &&
    work === stages.length - 2 &&
    kinds.at(-2) === "launch" &&
    kinds.at(-1) === "after";
  if (!shapeOk) return "templateInvalid";
  const names = stages.map((stage) => stage.name.trim().toLowerCase());
  return new Set(names).size === names.length ? null : "stageNamesRepeat";
}

/** The form's own checks, for comfort; the server repeats them. Empty when valid. */
export function checkSettings(
  settings: Pick<WorkspaceSettings, "allowedTeamDomain" | "stages">,
): SettingsFieldErrors {
  const errors: SettingsFieldErrors = {};
  const domain = normalizeDomain(settings.allowedTeamDomain ?? "");
  if (domain !== null && (domain.length > 253 || !TEAM_DOMAIN.test(domain))) {
    errors.allowedTeamDomain = "domainInvalid";
  }
  settings.stages.forEach((stage, index) => {
    const name = stage.name.trim();
    const stageErrors: { name?: SettingsError; weeks?: SettingsError } = {};
    if (name.length === 0 || name.length > MAX_STAGE_NAME) {
      stageErrors.name = "stageNameInvalid";
    }
    if (
      stage.kind === "work" &&
      (!Number.isInteger(stage.weeks) ||
        stage.weeks < 1 ||
        stage.weeks > MAX_WEEKS)
    ) {
      stageErrors.weeks = "weeksInvalid";
    }
    if (stageErrors.name || stageErrors.weeks) {
      errors.stages ??= {};
      errors.stages[index] = stageErrors;
    }
  });
  if (!errors.stages) {
    const problem = templateProblem(settings.stages);
    if (problem) errors.template = problem;
  }
  return errors;
}

export function hasErrors(errors: SettingsFieldErrors): boolean {
  return Boolean(
    errors.allowedTeamDomain ||
    errors.template ||
    (errors.stages && Object.keys(errors.stages).length > 0),
  );
}

type StageRow = { name: string; kind: string; weeks: number | null };

/** Stored rows in position order → the template, or null when they don't form one. */
export function toTemplate(rows: readonly StageRow[]): TemplateStage[] | null {
  const stages: TemplateStage[] = [];
  for (const row of rows) {
    if (row.kind === "work" && row.weeks !== null) {
      stages.push({ name: row.name, kind: "work", weeks: row.weeks });
    } else if (row.kind === "launch" || row.kind === "after") {
      stages.push({ name: row.name, kind: row.kind });
    } else {
      return null;
    }
  }
  return templateProblem(stages) === null ? stages : null;
}
