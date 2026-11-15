import type { ProjectHealth } from "../../overview/data";
import { fakeMoveOpenTickets, fakePlan } from "../board/e2e-store";
import { fakePostUpdate } from "../updates/e2e-store";

/**
 * The fake backend's plan actions for Playwright (#138), used only when
 * isFakeBackendEnabled(). They change the fake board's project (NB-1234) the way the SQL
 * functions change a real one; the rules in plan.ts and plan-edit.ts run for real.
 */

function post(body: string | null, author: string): string | null {
  if (!body?.trim()) return null;
  return fakePostUpdate({
    body,
    authorName: author,
    highlight: false,
    needsClient: false,
    ticketIds: [],
  });
}

const today = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon" }).format(
    new Date(),
  );

export function fakeSetHealth(
  health: ProjectHealth,
  body: string | null,
  author: string,
) {
  fakePlan.health = health;
  return post(body, author);
}

export function fakeSetLaunch(
  launchesOn: string,
  body: string | null,
  author: string,
) {
  fakePlan.launchesOn = launchesOn;
  return post(body, author);
}

export function fakeSetStageDates(
  stageId: string,
  startsOn: string,
  endsOn: string | null,
): "ok" | "locked" | "not_found" {
  const stage = fakePlan.stages.find((entry) => entry.id === stageId);
  if (!stage) return "not_found";
  if (stage.completed) return "locked";
  stage.startsOn = startsOn;
  stage.endsOn = endsOn;
  return "ok";
}

export function fakeReopenStage(stageId: string): "ok" | "not_found" {
  const stage = fakePlan.stages.find((entry) => entry.id === stageId);
  if (!stage) return "not_found";
  stage.completed = false;
  return "ok";
}

export function fakeCompleteStage(
  stageId: string,
  moveOpen: boolean,
  body: string | null,
  author: string,
): { moved: number; updateId: string | null } | "not_current" {
  const ordered = [...fakePlan.stages].sort((a, b) => a.position - b.position);
  const index = ordered.findIndex((stage) => stage.id === stageId);
  const stage = ordered[index];
  if (
    !stage ||
    stage.completed ||
    ordered.slice(0, index).some((s) => !s.completed)
  ) {
    return "not_current";
  }
  const day = today();
  stage.completed = true;
  if (!stage.endsOn || stage.endsOn > day)
    stage.endsOn = stage.startsOn > day ? stage.startsOn : day;
  const next = ordered[index + 1];
  if (next && next.startsOn > day) next.startsOn = day;
  const moved = moveOpen && next ? fakeMoveOpenTickets(stage.id, next.id) : 0;
  return { moved, updateId: post(body, author) };
}
