import { describe, expect, it } from "vitest";

import {
  buildColumns,
  columnOf,
  parseBoardFilters,
  type BoardTicket,
} from "./board";
import {
  describeConflict,
  saveTicketSchema,
  type EditableTicket,
} from "./ticket";

function card(overrides: Partial<BoardTicket>): BoardTicket {
  return {
    id: "t",
    number: 1,
    title: "Ticket",
    status: "todo",
    stageId: "s1",
    ownerId: "rui",
    ownerName: "Rui Matos",
    dueOn: null,
    clientVisible: true,
    waitingOnClient: false,
    version: "v1",
    ...overrides,
  };
}

const known = { stageIds: ["s1", "s2"], ownerIds: ["rui", "ana"] };

describe("board filters", () => {
  it("reads stage, owner and status from the URL, ignoring unknown ids", () => {
    expect(
      parseBoardFilters(
        { stage: "s2", owner: "ana", status: "in_review" },
        known,
      ),
    ).toEqual({ stage: "s2", owner: "ana", status: "in_review" });
    expect(
      parseBoardFilters({ stage: "gone", owner: "nobody", status: "x" }, known),
    ).toEqual({ stage: null, owner: null, status: "todo" });
    expect(parseBoardFilters({ owner: "none" }, known).owner).toBe("none");
  });
});

describe("buildColumns", () => {
  const tickets = [
    card({ id: "a", number: 1, status: "todo", dueOn: "2026-12-05" }),
    card({ id: "b", number: 2, status: "todo", dueOn: "2026-12-02" }),
    card({ id: "c", number: 3, status: "todo", dueOn: null }),
    card({ id: "d", number: 4, status: "blocked", ownerId: "ana" }),
    card({ id: "e", number: 5, status: "done" }),
    card({ id: "f", number: 6, status: "done", stageId: "s2" }),
  ];

  it("groups by column, due soonest first, Done latest first", () => {
    const columns = buildColumns(tickets, { stage: null, owner: null });
    expect(columns.map((column) => column.column)).toEqual([
      "todo",
      "in_progress",
      "in_review",
      "done",
    ]);
    expect(columns[0]?.tickets.map((ticket) => ticket.id)).toEqual([
      "b",
      "a",
      "c",
    ]);
    expect(columns[3]?.tickets.map((ticket) => ticket.id)).toEqual(["f", "e"]);
  });

  it("keeps a blocked ticket in In progress", () => {
    expect(columnOf("blocked")).toBe("in_progress");
    const columns = buildColumns(tickets, { stage: null, owner: null });
    expect(columns[1]?.tickets.map((ticket) => ticket.id)).toEqual(["d"]);
  });

  it("filters by stage and owner", () => {
    const byStage = buildColumns(tickets, { stage: "s2", owner: null });
    expect(
      byStage.flatMap((column) => column.tickets).map((t) => t.id),
    ).toEqual(["f"]);
    const byOwner = buildColumns(tickets, { stage: null, owner: "ana" });
    expect(
      byOwner.flatMap((column) => column.tickets).map((t) => t.id),
    ).toEqual(["d"]);
    const unowned = buildColumns(
      [...tickets, card({ id: "g", ownerId: null })],
      { stage: null, owner: "none" },
    );
    expect(
      unowned.flatMap((column) => column.tickets).map((t) => t.id),
    ).toEqual(["g"]);
  });
});

describe("describeConflict", () => {
  const loaded: EditableTicket = {
    id: "t",
    number: 18,
    title: "Home page build",
    description: "Hero and story.",
    status: "in_progress",
    stageId: "s1",
    ownerId: "rui",
    dueOn: "2026-11-20",
    clientVisible: true,
    checklist: [{ id: "c1", label: "Layout", done: false }],
    version: "v1",
  };

  it("names each field the other person changed, with its new value", () => {
    expect(
      describeConflict(loaded, {
        ...loaded,
        dueOn: "2026-11-22",
        version: "v2",
      }),
    ).toEqual([{ field: "dueOn", value: "2026-11-22" }]);
    expect(
      describeConflict(loaded, {
        ...loaded,
        status: "in_review",
        clientVisible: false,
        checklist: [{ id: "c1", label: "Layout", done: true }],
      }),
    ).toEqual([
      { field: "status", value: "in_review" },
      { field: "clientVisible", value: "off" },
      { field: "checklist", value: null },
    ]);
  });

  it("finds nothing when only the version moved", () => {
    expect(describeConflict(loaded, { ...loaded, version: "v2" })).toEqual([]);
  });
});

describe("saveTicketSchema", () => {
  const base = {
    projectId: "00000000-0000-4000-b000-000000000001",
    ticketId: null,
    version: null,
    title: "  Reservation form ",
    description: "",
    status: "todo",
    stageId: "00000000-0000-4000-a000-0000000000c1",
    ownerId: null,
    dueOn: "2026-12-02",
    clientVisible: true,
    checklist: [{ label: " Fields ", done: false }],
  };

  it("trims and accepts a valid ticket", () => {
    const parsed = saveTicketSchema.parse(base);
    expect(parsed.title).toBe("Reservation form");
    expect(parsed.checklist[0]?.label).toBe("Fields");
  });

  it("refuses an empty title, a bad status and a bad date", () => {
    expect(saveTicketSchema.safeParse({ ...base, title: " " }).success).toBe(
      false,
    );
    expect(
      saveTicketSchema.safeParse({ ...base, status: "later" }).success,
    ).toBe(false);
    expect(
      saveTicketSchema.safeParse({ ...base, dueOn: "2026-13-40" }).success,
    ).toBe(false);
  });
});
