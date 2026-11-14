import { describe, expect, it } from "vitest";

import {
  formatDate,
  formatDay,
  formatRange,
  formatToday,
  formatUpdateTime,
} from "./format";

const labels = { today: "Today", yesterday: "Yesterday" };
const NOW = new Date("2026-11-12T10:30:00Z"); // Thursday, 10:30 in Lisbon (WET)

describe("portal dates", () => {
  it("formats calendar days without shifting them", () => {
    expect(formatDay("2026-11-14", "en")).toBe("14 Nov");
    expect(formatDate("2027-02-12", "en")).toBe("12 Feb 2027");
    expect(formatDay("2026-11-14", "pt")).toBe("14 nov");
  });

  it("writes today's eyebrow in Lisbon", () => {
    expect(formatToday(NOW, "en")).toBe("Thursday · 12 Nov 2026");
    expect(formatToday(NOW, "pt")).toBe("quinta-feira · 12 nov 2026");
  });

  it("writes stage ranges, open-ended or not", () => {
    expect(formatRange("2026-11-03", "2026-12-15", "en", "From")).toBe(
      "3 Nov – 15 Dec",
    );
    expect(formatRange("2027-02-15", null, "en", "From")).toBe("From 15 Feb");
  });

  it("writes update times relative to today, in Lisbon time", () => {
    expect(formatUpdateTime("2026-11-12T10:20:00Z", NOW, "en", labels)).toBe(
      "Today 10:20",
    );
    expect(formatUpdateTime("2026-11-11T17:45:00Z", NOW, "en", labels)).toBe(
      "Yesterday 17:45",
    );
    expect(formatUpdateTime("2026-11-09T09:12:00Z", NOW, "en", labels)).toBe(
      "Mon 09:12",
    );
    expect(formatUpdateTime("2026-11-03T09:00:00Z", NOW, "en", labels)).toBe(
      "3 Nov",
    );
  });
});
