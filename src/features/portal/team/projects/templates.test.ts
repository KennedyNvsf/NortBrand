import { describe, expect, it } from "vitest";

import { daysBetween, isIsoDate, minimumDays, spreadStages } from "./templates";

describe("spreadStages", () => {
  it("spreads the standard stages back to back up to launch", () => {
    const stages = spreadStages("standard", "2026-11-17", "2027-04-14");
    expect(stages?.map((stage) => stage.name)).toEqual([
      "Discovery",
      "Design",
      "Development",
      "Review",
      "Launch",
      "Care",
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
      name: "Care",
      startsOn: "2027-04-14",
      endsOn: null,
    });
  });

  it("gives Development the largest share", () => {
    const stages = spreadStages("standard", "2026-11-17", "2027-04-14") ?? [];
    const length = (index: number) =>
      daysBetween(stages[index]?.startsOn ?? "", stages[index]?.endsOn ?? "") +
      1;
    expect(length(2)).toBeGreaterThan(length(1));
    expect(length(1)).toBeGreaterThan(length(0));
    // 148 days: 2/16, 3/16, 8/16 and 3/16 of them.
    expect([0, 1, 2, 3].map(length)).toEqual([19, 27, 74, 28]);
  });

  it("refuses dates that are invalid, reversed or too close", () => {
    expect(spreadStages("standard", "2026-02-30", "2027-04-14")).toBeNull();
    expect(spreadStages("standard", "2027-04-14", "2026-11-17")).toBeNull();
    expect(spreadStages("standard", "2026-11-17", "2026-11-17")).toBeNull();
    expect(minimumDays("standard")).toBe(8);
    expect(spreadStages("standard", "2026-11-17", "2026-11-25")).not.toBeNull();
    expect(spreadStages("standard", "2026-11-17", "2026-11-24")).toBeNull();
  });

  it("gives every working stage at least one day at the minimum span", () => {
    const stages = spreadStages("standard", "2026-11-17", "2026-11-25") ?? [];
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
