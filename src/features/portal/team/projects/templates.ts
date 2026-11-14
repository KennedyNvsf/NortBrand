/*
 * Stage templates for a new project (#136; Figma TM-04 "Plan"). Pure, so the modal's
 * preview and the server action use the same rule: the server recomputes the stages from
 * the template id and never trusts dates sent by the browser.
 *
 * The working stages share the days from the start to the day before launch, in
 * proportion to their weight, back to back. "Launch" is the launch day; "Care" starts on
 * it and has no end. The team adjusts each stage afterwards (#138).
 */

export const STAGE_TEMPLATE_IDS = ["standard"] as const;
export type StageTemplateId = (typeof STAGE_TEMPLATE_IDS)[number];

type TemplateStage =
  | { name: string; kind: "work"; weight: number }
  | { name: string; kind: "launch" }
  | { name: string; kind: "after" };

export const STAGE_TEMPLATES: Record<
  StageTemplateId,
  { label: string; stages: readonly TemplateStage[] }
> = {
  standard: {
    label: "Standard",
    stages: [
      { name: "Discovery", kind: "work", weight: 2 },
      { name: "Design", kind: "work", weight: 3 },
      { name: "Development", kind: "work", weight: 8 },
      { name: "Review", kind: "work", weight: 3 },
      { name: "Launch", kind: "launch" },
      { name: "Care", kind: "after" },
    ],
  },
};

export type PlannedStage = {
  name: string;
  startsOn: string;
  endsOn: string | null;
};

/** Each working stage needs at least two days. */
export function minimumDays(template: StageTemplateId): number {
  return (
    STAGE_TEMPLATES[template].stages.filter((stage) => stage.kind === "work")
      .length * 2
  );
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
  template: StageTemplateId,
  startsOn: string,
  launchesOn: string,
): PlannedStage[] | null {
  if (!isIsoDate(startsOn) || !isIsoDate(launchesOn)) return null;
  const span = daysBetween(startsOn, launchesOn);
  if (span < minimumDays(template)) return null;

  const stages = STAGE_TEMPLATES[template].stages;
  const totalWeight = stages.reduce(
    (sum, stage) => sum + (stage.kind === "work" ? stage.weight : 0),
    0,
  );
  const start = toDay(startsOn);
  const launch = toDay(launchesOn);

  let cumulative = 0;
  let cursor = start;
  return stages.map((stage) => {
    if (stage.kind === "launch") {
      return { name: stage.name, startsOn: launchesOn, endsOn: launchesOn };
    }
    if (stage.kind === "after") {
      return { name: stage.name, startsOn: launchesOn, endsOn: null };
    }
    cumulative += stage.weight;
    const next = start + Math.round((span * cumulative) / totalWeight);
    const planned = {
      name: stage.name,
      startsOn: toIso(cursor),
      endsOn: toIso(Math.min(next, launch) - 1),
    };
    cursor = next;
    return planned;
  });
}
