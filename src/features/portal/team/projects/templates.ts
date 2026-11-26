/*
 * Stage templates for a new project (#136; Figma TM-04 "Plan"). Pure, so the modal's
 * preview and the server action use the same rule: the server recomputes the stages from
 * the template and never trusts dates sent by the browser.
 *
 * Since #159 the template lives in the database (`portal_stage_template`, edited in
 * Settings, Figma TM-13). Each working stage has a duration in weeks; the weeks are
 * relative weights, so the working stages share the days from the start to the day
 * before launch in proportion, back to back. "Launch" is the launch day; "Support" (named "Care" until #77) starts
 * on it and has no end (lead's decision, 2026-11-22). The team adjusts each stage
 * afterwards (#138).
 */

export const STAGE_TEMPLATE_IDS = ["standard"] as const;
export type StageTemplateId = (typeof STAGE_TEMPLATE_IDS)[number];
export const STAGE_TEMPLATE_LABELS: Record<StageTemplateId, string> = {
  standard: "Standard",
};

export type TemplateStage =
  | { name: string; kind: "work"; weeks: number }
  | { name: string; kind: "launch" }
  | { name: string; kind: "after" };

/**
 * The seeded template (migrations 20261124120000 and 20261126130000, Figma TM-13). The fake backend starts
 * from it, and the app falls back to it if the stored template can't be read.
 */
export const DEFAULT_STAGE_TEMPLATE: readonly TemplateStage[] = [
  { name: "Discovery", kind: "work", weeks: 2 },
  { name: "Design", kind: "work", weeks: 3 },
  { name: "Development", kind: "work", weeks: 6 },
  { name: "Review", kind: "work", weeks: 3 },
  { name: "Launch", kind: "launch" },
  { name: "Support", kind: "after" },
];

export type PlannedStage = {
  name: string;
  startsOn: string;
  endsOn: string | null;
};

/** Each working stage needs at least two days. */
export function minimumDays(template: readonly TemplateStage[]): number {
  return template.filter((stage) => stage.kind === "work").length * 2;
}

const DAY_MS = 86_400_000;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function toDay(iso: string): number {
  return Date.parse(`${iso}T00:00:00Z`) / DAY_MS;
}

function toIso(day: number): string {
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}

export function isIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const day = toDay(value);
  return Number.isFinite(day) && toIso(day) === value;
}

/** Days from `start` to `end` (negative when `end` is earlier). */
export function daysBetween(start: string, end: string): number {
  return Math.round(toDay(end) - toDay(start));
}

/**
 * The template's stages between the two dates, or null when the dates are invalid or
 * too close together for every working stage to get its minimum.
 */
export function spreadStages(
  template: readonly TemplateStage[],
  startsOn: string,
  launchesOn: string,
): PlannedStage[] | null {
  if (!isIsoDate(startsOn) || !isIsoDate(launchesOn)) return null;
  const span = daysBetween(startsOn, launchesOn);
  if (span < minimumDays(template)) return null;

  const totalWeeks = template.reduce(
    (sum, stage) => sum + (stage.kind === "work" ? stage.weeks : 0),
    0,
  );
  if (totalWeeks <= 0) return null;
  const start = toDay(startsOn);
  const launch = toDay(launchesOn);

  let cumulative = 0;
  let cursor = start;
  return template.map((stage) => {
    if (stage.kind === "launch") {
      return { name: stage.name, startsOn: launchesOn, endsOn: launchesOn };
    }
    if (stage.kind === "after") {
      return { name: stage.name, startsOn: launchesOn, endsOn: null };
    }
    cumulative += stage.weeks;
    const next = start + Math.round((span * cumulative) / totalWeeks);
    const planned = {
      name: stage.name,
      startsOn: toIso(cursor),
      endsOn: toIso(Math.min(next, launch) - 1),
    };
    cursor = next;
    return planned;
  });
}
