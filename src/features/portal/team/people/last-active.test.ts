import { describe, expect, it } from "vitest";

import { lastActiveLabel } from "./last-active";

const copy = {
  never: "Not signed in yet",
  now: "Now",
  minutesAgo: "{count} min ago",
  hoursAgo: "{count} h ago",
  today: "Today, {time}",
};
// 15:00 in Lisbon (UTC in November).
const NOW = new Date("2026-11-21T15:00:00Z");

describe("lastActiveLabel", () => {
  it("reads like the Team table", () => {
    expect(lastActiveLabel(null, NOW, copy)).toBe("Not signed in yet");
    expect(lastActiveLabel("2026-11-21T14:58:00Z", NOW, copy)).toBe("Now");
    expect(lastActiveLabel("2026-11-21T14:40:00Z", NOW, copy)).toBe(
      "20 min ago",
    );
    expect(lastActiveLabel("2026-11-21T13:30:00Z", NOW, copy)).toBe("1 h ago");
    expect(lastActiveLabel("2026-11-20T10:00:00Z", NOW, copy)).toBe("20 Nov");
  });
});
