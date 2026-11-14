import { describe, expect, it } from "vitest";

import {
  byUrgency,
  currentStage,
  daysUntil,
  filterByStatus,
  groupByStage,
  lisbonToday,
  parseStatusFilter,
  progress,
  stageElapsed,
  stageState,
  statusCounts,
  weekSummary,
  workingOn,
  type PortalStage,
  type PortalTicket,
} from "./domain";

const stage = (
  position: number,
  completed: boolean,
  extra: Partial<PortalStage> = {},
): PortalStage => ({
  id: `s${String(position)}`,
  position,
  name: `Stage ${String(position)}`,
  startsOn: "2026-11-03",
  endsOn: "2026-12-15",
  completed,
  ...extra,
});

let counter = 0;
const ticket = (extra: Partial<PortalTicket> = {}): PortalTicket => {
  counter += 1;
  return {
    id: `t${String(counter)}`,
    number: counter,
    title: `Task ${String(counter)}`,
    description: "",
    status: "todo",
    dueOn: null,
    createdOn: "2026-11-01",
    waitingOnClient: false,
    clientVisible: true,
    stageId: "s3",
    ownerName: null,
    ...extra,
  };
};

describe("progress", () => {
  it("counts only client-visible tickets", () => {
    const tickets = [
      ticket({ status: "done" }),
      ticket({ status: "todo" }),
      ticket({ status: "done", clientVisible: false }),
      ticket({ status: "todo", clientVisible: false }),
    ];
    expect(progress(tickets)).toEqual({ done: 1, total: 2, percent: 50 });
  });

  it("is zero with no tickets", () => {
    expect(progress([])).toEqual({ done: 0, total: 0, percent: 0 });
  });

  it("rounds to a whole percent", () => {
    const tickets = [ticket({ status: "done" }), ticket(), ticket()];
    expect(progress(tickets).percent).toBe(33);
  });
});

describe("stages", () => {
  const stages = [
    stage(2, true),
    stage(1, true),
    stage(3, false),
    stage(4, false),
  ];

  it("the current stage is the first not completed", () => {
    expect(currentStage(stages)?.position).toBe(3);
  });

  it("is the last stage when all are complete, and null with none", () => {
    expect(currentStage([stage(1, true), stage(2, true)])?.position).toBe(2);
    expect(currentStage([])).toBeNull();
  });

  it("labels done, current and upcoming", () => {
    const current = currentStage(stages);
    expect(stages.map((s) => stageState(s, current))).toEqual([
      "done",
      "done",
      "current",
      "upcoming",
    ]);
  });

  it("measures how far through its dates a stage is", () => {
    const s = stage(3, false, { startsOn: "2026-11-01", endsOn: "2026-11-11" });
    expect(stageElapsed(s, "2026-11-06")).toBeCloseTo(0.5);
    expect(stageElapsed(s, "2026-10-01")).toBe(0);
    expect(stageElapsed(s, "2026-12-01")).toBe(1);
    expect(stageElapsed({ ...s, endsOn: null }, "2026-11-06")).toBe(0);
  });
});

describe("dates", () => {
  it("counts whole days across months and years", () => {
    expect(daysUntil("2027-02-12", "2026-11-12")).toBe(92);
    expect(daysUntil("2026-11-11", "2026-11-12")).toBe(-1);
  });

  it("reads today in Lisbon, not UTC", () => {
    // 23:30 UTC on 30 June is 00:30 on 1 July in Lisbon (summer time).
    expect(lisbonToday(new Date("2026-06-30T23:30:00Z"))).toBe("2026-07-01");
    expect(lisbonToday(new Date("2026-12-31T23:30:00Z"))).toBe("2026-12-31");
  });
});

describe("tasks", () => {
  const blocked = ticket({ status: "blocked", dueOn: "2026-11-20" });
  const waiting = ticket({
    status: "in_progress",
    waitingOnClient: true,
    dueOn: "2026-11-30",
  });
  const early = ticket({ status: "todo", dueOn: "2026-11-15" });
  const late = ticket({ status: "todo", dueOn: "2026-12-02" });
  const noDate = ticket({ status: "todo" });
  const done = ticket({ status: "done" });
  const otherStage = ticket({ stageId: "s2", status: "todo" });
  const all = [late, noDate, done, early, blocked, waiting, otherStage];

  it("orders by urgency: waiting on you, blocked, then due date", () => {
    expect([late, noDate, early, blocked, waiting].sort(byUrgency)).toEqual([
      waiting,
      blocked,
      early,
      late,
      noDate,
    ]);
  });

  it("'working on' is the open tasks of the current stage", () => {
    expect(workingOn(all, "s3")).toEqual([
      waiting,
      blocked,
      early,
      late,
      noDate,
    ]);
    expect(workingOn(all, "s3", 2)).toEqual([waiting, blocked]);
  });

  it("sums the week", () => {
    expect(weekSummary(all)).toEqual({
      inProgress: 1,
      inReview: 0,
      blocked: 1,
    });
  });

  it("counts and filters by status", () => {
    expect(statusCounts(all)).toEqual({
      all: 7,
      in_progress: 1,
      in_review: 0,
      blocked: 1,
      todo: 4,
      done: 1,
    });
    expect(filterByStatus(all, "blocked")).toEqual([blocked]);
    expect(filterByStatus(all, "all")).toHaveLength(7);
  });

  it("parses the status filter from the URL, defaulting to all", () => {
    expect(parseStatusFilter("in_review")).toBe("in_review");
    expect(parseStatusFilter("nope")).toBe("all");
    expect(parseStatusFilter(undefined)).toBe("all");
  });

  it("groups by stage, newest stage first, skipping empty stages", () => {
    const groups = groupByStage(
      [stage(1, true), stage(2, true), stage(3, false)],
      all,
    );
    expect(groups.map((g) => g.stage.position)).toEqual([3, 2]);
    expect(groups[0]?.done).toBe(1);
    expect(groups[0]?.total).toBe(6);
  });
});
