import { describe, expect, it } from "vitest";

import {
  daysBetween,
  DEFAULT_STAGE_TEMPLATE,
  isIsoDate,
  minimumDays,
  spreadStages,
  type TemplateStage,
} from "./templates";

const standard = DEFAULT_STAGE_TEMPLATE;

describe("spreadStages", () => {
  it("spreads the standard stages back to back up to launch", () => {
    const stages = spreadStages(standard, "2026-11-17", "2027-04-14");
    expect(stages?.map((stage) => stage.name)).toEqual([
      "Discovery",
      "Design",
      "Development",
      "Review",
      "Launch",
      "Support",
    ]);
    expect(stages?.at(0)?.startsOn).toBe("2026-11-17");
    // Each working stage starts the day after the previous one ends.
    for (let index = 1; index < 4; index += 1) {
      const previous = stages?.[index - 1];
      const stage = stages?.[index];
      expect(previous?.endsOn && stage).toBeTruthy();
      expect(daysBetween(previous?.endsOn ?? "", stage?.startsOn ?? "")).toBe(
        1,
      );
    }
    expect(stages?.at(3)?.endsOn).toBe("2027-04-13");
    expect(stages?.at(4)).toEqual({
      name: "Launch",
      startsOn: "2027-04-14",
      endsOn: "2027-04-14",
    });
    expect(stages?.at(5)).toEqual({
      name: "Support",
      startsOn: "2027-04-14",
      endsOn: null,
    });
  });

  it("gives Development the largest share", () => {
    const stages = spreadStages(standard, "2026-11-17", "2027-04-14") ?? [];
    const length = (index: number) =>
      daysBetween(stages[index]?.startsOn ?? "", stages[index]?.endsOn ?? "") +
      1;
    expect(length(2)).toBeGreaterThan(length(1));
    expect(length(1)).toBeGreaterThan(length(0));
    // 148 days: 2/14, 3/14, 6/14 and 3/14 of them (weeks as weights).
    expect([0, 1, 2, 3].map(length)).toEqual([21, 32, 63, 32]);
  });

  it("refuses dates that are invalid, reversed or too close", () => {
    expect(spreadStages(standard, "2026-02-30", "2027-04-14")).toBeNull();
    expect(spreadStages(standard, "2027-04-14", "2026-11-17")).toBeNull();
    expect(spreadStages(standard, "2026-11-17", "2026-11-17")).toBeNull();
    expect(minimumDays(standard)).toBe(8);
    expect(spreadStages(standard, "2026-11-17", "2026-11-25")).not.toBeNull();
    expect(spreadStages(standard, "2026-11-17", "2026-11-24")).toBeNull();
  });

  it("gives every working stage at least one day at the minimum span", () => {
    const stages = spreadStages(standard, "2026-11-17", "2026-11-25") ?? [];
    for (const stage of stages.slice(0, 4)) {
      expect(
        daysBetween(stage.startsOn, stage.endsOn ?? ""),
      ).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("isIsoDate", () => {
  it("accepts real calendar dates only", () => {
    expect(isIsoDate("2026-11-17")).toBe(true);
    expect(isIsoDate("2026-13-01")).toBe(false);
    expect(isIsoDate("17/11/2026")).toBe(false);
  });
});

describe("an edited template (Settings, #159)", () => {
  const edited: TemplateStage[] = [
    { name: "Workshop", kind: "work", weeks: 1 },
    { name: "Build", kind: "work", weeks: 3 },
    { name: "Go live", kind: "launch" },
    { name: "Support", kind: "after" },
  ];

  it("uses its names, its weeks and its number of stages", () => {
    const stages = spreadStages(edited, "2027-01-04", "2027-02-01") ?? [];
    expect(stages.map((stage) => stage.name)).toEqual([
      "Workshop",
      "Build",
      "Go live",
      "Support",
    ]);
    // 28 days, 1:3.
    expect(stages[0]).toEqual({
      name: "Workshop",
      startsOn: "2027-01-04",
      endsOn: "2027-01-10",
    });
    expect(stages[1]?.endsOn).toBe("2027-01-31");
    expect(minimumDays(edited)).toBe(4);
  });
});
