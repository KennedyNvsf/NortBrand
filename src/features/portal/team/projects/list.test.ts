import { describe, expect, it } from "vitest";

import {
  inView,
  launchingSoon,
  parseProjectView,
  percentDone,
  stageSummary,
  updateAge,
  viewCounts,
  type TeamProject,
} from "./list";

const TODAY = "2026-11-12";

function project(overrides: Partial<TeamProject>): TeamProject {
  return {
    id: "p",
    publicId: "NB-0001",
    name: "Website",
    clientName: "Client",
    launchesOn: "2027-02-12",
    health: "on_track",
    status: "active",
    leadName: "Ana Costa",
    stages: [],
    ticketsDone: 0,
    ticketsTotal: 0,
    lastUpdateAt: null,
    ...overrides,
  };
}

const projects = [
  project({ id: "a", health: "waiting_on_client" }),
  project({ id: "b", launchesOn: "2027-03-28" }),
  project({ id: "c", launchesOn: "2026-12-04" }),
  project({ id: "d", launchesOn: "2026-10-30" }),
  project({ id: "e", status: "closed" }),
];

describe("project views", () => {
  it("sorts projects into tabs", () => {
    expect(viewCounts(projects, TODAY)).toEqual({
      active: 3,
      waiting: 1,
      launched: 1,
      archived: 1,
    });
    expect(inView(projects[3] as TeamProject, "launched", TODAY)).toBe(true);
    expect(inView(projects[0] as TeamProject, "active", TODAY)).toBe(true);
  });

  it("falls back to Active for an unknown tab", () => {
    expect(parseProjectView("waiting")).toBe("waiting");
    expect(parseProjectView("everything")).toBe("active");
    expect(parseProjectView(undefined)).toBe("active");
  });

  it("counts launches before the month after 90 days (Figma: before March)", () => {
    expect(launchingSoon(projects, TODAY)).toEqual({
      before: "2027-03-01",
      count: 2,
    });
  });
});

describe("stageSummary", () => {
  it("names the current stage and its place", () => {
    const stage = (position: number, completed: boolean) => ({
      id: `s${String(position)}`,
      position,
      name: ["Discovery", "Design", "Development"][position - 1] ?? "Care",
      startsOn: "2026-11-01",
      endsOn: null,
      completed,
    });
    expect(
      stageSummary([stage(2, true), stage(1, true), stage(3, false)]),
    ).toEqual({
      name: "Development",
      position: 3,
      total: 3,
      states: ["done", "done", "current"],
    });
    expect(stageSummary([])).toBeNull();
  });
});

describe("percentDone and updateAge", () => {
  it("rounds progress and handles no tickets", () => {
    expect(percentDone(4, 9)).toBe(44);
    expect(percentDone(0, 0)).toBe(0);
  });

  it("says how long ago the last update was", () => {
    expect(updateAge("2026-11-12", TODAY)).toEqual({ kind: "today", days: 0 });
    expect(updateAge("2026-11-11", TODAY)).toEqual({
      kind: "yesterday",
      days: 1,
    });
    expect(updateAge("2026-11-09", TODAY)).toEqual({ kind: "days", days: 3 });
    expect(updateAge("2026-10-01", TODAY).kind).toBe("date");
    expect(updateAge(null, TODAY).kind).toBe("none");
  });
});
