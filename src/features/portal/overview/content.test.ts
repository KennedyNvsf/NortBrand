import { describe, expect, it } from "vitest";

import {
  fileGroup,
  fileKind,
  formatSize,
  groupUpdatesByDay,
  spanPosition,
  stageProgress,
  timelineSpan,
  updateDayGroup,
} from "./content";
import type { PortalStage, PortalTicket } from "./domain";

const stages: PortalStage[] = [
  {
    id: "a",
    position: 1,
    name: "Discovery",
    startsOn: "2026-10-01",
    endsOn: "2026-10-10",
    completed: true,
  },
  {
    id: "b",
    position: 2,
    name: "Development",
    startsOn: "2026-11-03",
    endsOn: "2026-12-15",
    completed: false,
  },
  {
    id: "c",
    position: 3,
    name: "Care",
    startsOn: "2027-02-15",
    endsOn: null,
    completed: false,
  },
];

const ticket = (
  stageId: string,
  status: PortalTicket["status"],
): PortalTicket => ({
  id: `${stageId}-${status}-${String(Math.random())}`,
  number: 1,
  title: "",
  description: "",
  status,
  dueOn: null,
  createdOn: "2026-11-01",
  waitingOnClient: false,
  clientVisible: true,
  stageId,
  ownerName: null,
});

describe("timeline", () => {
  it("spans from the first month to the month after the last date", () => {
    const span = timelineSpan(stages, "2027-02-12");
    expect(span.start).toBe("2026-10-01");
    expect(span.months).toEqual([
      "2026-10-01",
      "2026-11-01",
      "2026-12-01",
      "2027-01-01",
      "2027-02-01",
      "2027-03-01",
    ]);
    expect(span.end).toBe("2027-04-01");
  });

  it("places dates across the span, clamped", () => {
    const span = timelineSpan(stages, "2027-02-12");
    expect(spanPosition(span, "2026-10-01")).toBe(0);
    expect(spanPosition(span, "2027-04-01")).toBe(1);
    expect(spanPosition(span, "2030-01-01")).toBe(1);
    expect(spanPosition(span, "2026-11-12")).toBeGreaterThan(0.2);
    expect(spanPosition(span, "2026-11-12")).toBeLessThan(0.25);
  });

  it("measures a stage's progress from its tasks", () => {
    const tickets = [
      ticket("b", "done"),
      ticket("b", "todo"),
      ticket("b", "in_progress"),
      ticket("b", "done"),
      ticket("a", "done"),
    ];
    expect(stageProgress(tickets, "b")).toBe(50);
    expect(stageProgress(tickets, "c")).toBe(0);
  });
});

describe("files", () => {
  it("names the kind and group from the content type", () => {
    expect(fileKind("application/pdf")).toBe("pdf");
    expect(fileKind("application/zip")).toBe("zip");
    expect(fileKind("image/png")).toBe("image");
    expect(fileGroup("application/pdf")).toBe("documents");
    expect(fileGroup("application/zip")).toBe("design");
    expect(fileGroup("image/svg+xml")).toBe("design");
  });

  it("writes sizes the way people read them", () => {
    expect(formatSize(4_200_000, "en")).toBe("4.2 MB");
    expect(formatSize(18_000_000, "en")).toBe("18 MB");
    expect(formatSize(320_000, "en")).toBe("320 KB");
    expect(formatSize(400, "en")).toBe("1 KB");
    expect(formatSize(4_200_000, "pt")).toBe("4,2 MB");
  });
});

describe("updates", () => {
  const now = new Date("2026-11-12T10:30:00Z");

  it("groups by Lisbon day", () => {
    expect(updateDayGroup("2026-11-12T08:00:00Z", now)).toBe("today");
    expect(updateDayGroup("2026-11-11T23:30:00Z", now)).toBe("yesterday");
    expect(updateDayGroup("2026-11-09T09:00:00Z", now)).toBe("thisWeek");
    expect(updateDayGroup("2026-11-03T09:00:00Z", now)).toBe("earlier");
  });

  it("keeps newest first and drops empty groups", () => {
    const updates = [
      { id: "old", createdAt: "2026-11-03T09:00:00Z" },
      { id: "new", createdAt: "2026-11-12T10:20:00Z" },
      { id: "mid", createdAt: "2026-11-10T09:00:00Z" },
    ];
    expect(
      groupUpdatesByDay(updates, now).map((g) => [
        g.group,
        g.updates.map((u) => u.id),
      ]),
    ).toEqual([
      ["today", ["new"]],
      ["thisWeek", ["mid"]],
      ["earlier", ["old"]],
    ]);
  });
});
