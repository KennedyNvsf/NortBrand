import { describe, expect, it } from "vitest";

import {
  daysToSunday,
  groupMyTickets,
  groupOf,
  summarize,
  type MyTicket,
} from "./my-tickets";

const ticket = (overrides: Partial<MyTicket>): MyTicket => ({
  id: crypto.randomUUID(),
  number: 1,
  title: "Ticket",
  status: "todo",
  dueOn: null,
  clientVisible: true,
  projectPublicId: "NB-4821",
  projectName: "Atlântico Café website",
  clientName: "Atlântico Café",
  ...overrides,
});

// Thursday 12 Nov 2026 (Lisbon): this week runs to Sunday 15 Nov.
const TODAY = "2026-11-12";

describe("daysToSunday", () => {
  it("counts to the end of the week, with Sunday as the last day", () => {
    expect(daysToSunday("2026-11-12")).toBe(3); // Thursday
    expect(daysToSunday("2026-11-15")).toBe(0); // Sunday
    expect(daysToSunday("2026-11-16")).toBe(6); // Monday
  });
});

describe("groupOf", () => {
  it("files tickets as overdue, this week or later", () => {
    expect(groupOf({ dueOn: "2026-11-10" }, TODAY)).toBe("overdue");
    expect(groupOf({ dueOn: "2026-11-12" }, TODAY)).toBe("thisWeek");
    expect(groupOf({ dueOn: "2026-11-15" }, TODAY)).toBe("thisWeek");
    expect(groupOf({ dueOn: "2026-11-16" }, TODAY)).toBe("later");
    expect(groupOf({ dueOn: null }, TODAY)).toBe("later");
  });
});

describe("groupMyTickets and summarize", () => {
  const tickets = [
    ticket({
      title: "Launch checklist",
      dueOn: "2026-11-15",
      projectPublicId: "NB-4741",
    }),
    ticket({
      title: "Send the moodboard",
      dueOn: "2026-11-10",
      status: "in_progress",
    }),
    ticket({ title: "No date yet", dueOn: null, projectPublicId: "NB-4802" }),
    ticket({
      title: "Brand workshop",
      dueOn: "2026-11-20",
      projectPublicId: "NB-4802",
    }),
    ticket({ title: "Menu photos", dueOn: "2026-11-14", status: "blocked" }),
  ];

  it("sorts each group by due date, undated last", () => {
    const groups = groupMyTickets(tickets, TODAY);
    expect(groups.overdue.map((t) => t.title)).toEqual(["Send the moodboard"]);
    expect(groups.thisWeek.map((t) => t.title)).toEqual([
      "Menu photos",
      "Launch checklist",
    ]);
    expect(groups.later.map((t) => t.title)).toEqual([
      "Brand workshop",
      "No date yet",
    ]);
  });

  it("counts open tickets, projects, overdue and this week", () => {
    expect(summarize(tickets, TODAY)).toEqual({
      open: 5,
      projects: 3,
      overdue: 1,
      thisWeek: 2,
    });
  });
});
