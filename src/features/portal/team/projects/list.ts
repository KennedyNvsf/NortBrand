import type { ProjectHealth } from "../../overview/data";
import {
  currentStage,
  daysUntil,
  stageState,
  type PortalStage,
  type StageState,
} from "../../overview/domain";

/*
 * Rules for the team's Projects list (#136; Figma TM-01), pure and unit-tested.
 *
 * Tabs: Active (open, launch still ahead), Waiting on client (active and waiting),
 * Launched (open, launch date passed: in Care), Archived (closed). The tab is URL state
 * (?view=). Progress counts every ticket: the team sees team-only tickets too.
 */

export const PROJECT_VIEWS = [
  "active",
  "waiting",
  "launched",
  "archived",
] as const;
export type ProjectView = (typeof PROJECT_VIEWS)[number];

export function parseProjectView(value: unknown): ProjectView {
  return PROJECT_VIEWS.find((view) => view === value) ?? "active";
}

export type TeamProject = {
  id: string;
  publicId: string;
  name: string;
  clientName: string;
  launchesOn: string;
  health: ProjectHealth;
  status: "active" | "closed";
  leadName: string | null;
  stages: PortalStage[];
  ticketsDone: number;
  ticketsTotal: number;
  /** The newest team post, as an ISO timestamp. */
  lastUpdateAt: string | null;
};

export function projectBucket(
  project: TeamProject,
  today: string,
): "active" | "launched" | "archived" {
  if (project.status === "closed") return "archived";
  return project.launchesOn < today ? "launched" : "active";
}

export function inView(
  project: TeamProject,
  view: ProjectView,
  today: string,
): boolean {
  const bucket = projectBucket(project, today);
  if (view === "waiting") {
    return bucket === "active" && project.health === "waiting_on_client";
  }
  return bucket === view;
}

export function viewCounts(
  projects: readonly TeamProject[],
  today: string,
): Record<ProjectView, number> {
  const counts: Record<ProjectView, number> = {
    active: 0,
    waiting: 0,
    launched: 0,
    archived: 0,
  };
  for (const project of projects) {
    for (const view of PROJECT_VIEWS) {
      if (inView(project, view, today)) counts[view] += 1;
    }
  }
  return counts;
}

/**
 * "2 launching before March": active projects launching before the first day of the
 * month after 90 days from today. Returns that month (YYYY-MM-01) and the count.
 */
export function launchingSoon(
  projects: readonly TeamProject[],
  today: string,
): { before: string; count: number } {
  const horizon = new Date(`${today}T00:00:00Z`);
  horizon.setUTCDate(horizon.getUTCDate() + 90);
  horizon.setUTCMonth(horizon.getUTCMonth() + 1, 1);
  const before = horizon.toISOString().slice(0, 10);
  const count = projects.filter(
    (project) =>
      projectBucket(project, today) === "active" && project.launchesOn < before,
  ).length;
  return { before, count };
}

export type StageSummary = {
  name: string;
  position: number;
  total: number;
  states: StageState[];
};

export function stageSummary(
  stages: readonly PortalStage[],
): StageSummary | null {
  const current = currentStage(stages);
  if (!current) return null;
  const ordered = [...stages].sort((a, b) => a.position - b.position);
  return {
    name: current.name,
    position: ordered.findIndex((stage) => stage.id === current.id) + 1,
    total: ordered.length,
    states: ordered.map((stage) => stageState(stage, current)),
  };
}

export function percentDone(done: number, total: number): number {
  return total === 0 ? 0 : Math.round((done / total) * 100);
}

/** "Today", "Yesterday", "3 days ago", or null past a week (show the date instead). */
export function updateAge(
  lastUpdateDay: string | null,
  today: string,
): { kind: "today" | "yesterday" | "days" | "date" | "none"; days: number } {
  if (!lastUpdateDay) return { kind: "none", days: 0 };
  const days = -daysUntil(lastUpdateDay, today);
  if (days <= 0) return { kind: "today", days: 0 };
  if (days === 1) return { kind: "yesterday", days };
  if (days <= 7) return { kind: "days", days };
  return { kind: "date", days };
}
