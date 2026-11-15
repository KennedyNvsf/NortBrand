import { describe, expect, it, vi } from "vitest";

import {
  deleteTicket,
  moveTicket,
  saveTicket,
  type SaveTicketDeps,
} from "./edit";
import type { EditableTicket } from "./ticket";

const VIEWER = {
  status: "signed_in",
  userId: "00000000-0000-4000-a000-000000000002",
  name: "Rui Matos",
  role: "member",
} as const;

const PROJECT = "00000000-0000-4000-b000-000000000001";
const TICKET = "00000000-0000-4000-a000-0000000000d1";
const STAGE = "00000000-0000-4000-a000-0000000000c1";

const loaded: EditableTicket = {
  id: TICKET,
  number: 18,
  title: "Home page build",
  description: "",
  status: "in_progress",
  stageId: STAGE,
  ownerId: null,
  dueOn: "2026-11-20",
  clientVisible: true,
  checklist: [],
  version: "2026-11-14T10:00:00.000001+00:00",
};

const input = {
  projectId: PROJECT,
  ticketId: TICKET,
  version: loaded.version,
  title: "Home page build",
  description: "",
  status: "in_review",
  stageId: STAGE,
  ownerId: null,
  dueOn: "2026-11-20",
  clientVisible: true,
  checklist: [],
};

function deps(overrides: Partial<SaveTicketDeps> = {}): SaveTicketDeps {
  return {
    viewer: () => Promise.resolve(VIEWER),
    save: vi.fn(() =>
      Promise.resolve({
        outcome: "saved" as const,
        ticketId: TICKET,
        number: 18,
        version: "v2",
      }),
    ),
    read: vi.fn(() =>
      Promise.resolve({
        ticket: { ...loaded, dueOn: "2026-11-22", version: "v2" },
        changedBy: "Ana Costa",
      }),
    ),
    reportFailure: vi.fn(),
    ...overrides,
  };
}

describe("saveTicket", () => {
  it("saves with the loaded version", async () => {
    const d = deps();
    expect(await saveTicket(input, d)).toEqual({
      status: "saved",
      ticketId: TICKET,
      number: 18,
      version: "v2",
    });
    expect(d.save).toHaveBeenCalledWith(
      expect.objectContaining({ version: loaded.version, status: "in_review" }),
    );
  });

  it("detects a concurrent edit and says who changed what", async () => {
    const d = deps({
      save: () =>
        Promise.resolve({
          outcome: "conflict",
          ticketId: TICKET,
          number: 18,
          version: "v2",
        }),
    });
    expect(await saveTicket(input, d)).toEqual({
      status: "conflict",
      current: { ...loaded, dueOn: "2026-11-22", version: "v2" },
      changedBy: "Ana Costa",
    });
  });

  it("refuses invalid input before touching the database", async () => {
    const d = deps();
    const result = await saveTicket({ ...input, title: "" }, d);
    expect(result).toEqual({
      status: "invalid",
      fieldErrors: { title: "titleInvalid" },
    });
    expect(d.save).not.toHaveBeenCalled();
  });

  it("maps database refusals", async () => {
    const forbidden = deps({
      save: () => Promise.resolve({ error: { code: "42501" } }),
    });
    expect(await saveTicket(input, forbidden)).toEqual({
      status: "forbidden",
    });
    const owner = deps({
      save: () => Promise.resolve({ error: { code: "22023" } }),
    });
    expect(await saveTicket(input, owner)).toEqual({
      status: "invalid",
      fieldErrors: { ownerId: "ownerInvalid" },
    });
  });

  it("refuses signed-out callers", async () => {
    const d = deps({ viewer: () => Promise.resolve({ status: "signed_out" }) });
    expect(await saveTicket(input, d)).toEqual({ status: "forbidden" });
  });
});

describe("moveTicket and deleteTicket", () => {
  it("moves a ticket and returns its new version", async () => {
    const result = await moveTicket(
      { projectId: PROJECT, ticketId: TICKET, status: "done" },
      {
        viewer: () => Promise.resolve(VIEWER),
        move: () => Promise.resolve({ version: "v3" }),
        reportFailure: vi.fn(),
      },
    );
    expect(result).toEqual({
      status: "moved",
      ticketStatus: "done",
      version: "v3",
    });
  });

  it("treats an unknown status or a missing ticket as not found", async () => {
    const move = vi.fn(() => Promise.resolve(null));
    const d = {
      viewer: () => Promise.resolve(VIEWER),
      move,
      reportFailure: vi.fn(),
    };
    expect(
      await moveTicket(
        { projectId: PROJECT, ticketId: TICKET, status: "later" },
        d,
      ),
    ).toEqual({ status: "not_found" });
    expect(move).not.toHaveBeenCalled();
    expect(
      await moveTicket(
        { projectId: PROJECT, ticketId: TICKET, status: "done" },
        d,
      ),
    ).toEqual({ status: "not_found" });
  });

  it("deletes under the teammate's session", async () => {
    const remove = vi.fn(() => Promise.resolve("deleted" as const));
    expect(
      await deleteTicket(
        { projectId: PROJECT, ticketId: TICKET },
        {
          viewer: () => Promise.resolve(VIEWER),
          remove,
          reportFailure: vi.fn(),
        },
      ),
    ).toEqual({ status: "deleted" });
    expect(remove).toHaveBeenCalledWith({
      projectId: PROJECT,
      ticketId: TICKET,
    });
  });
});
