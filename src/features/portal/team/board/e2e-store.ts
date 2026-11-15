import { E2E_PROJECT_VIEW } from "../../overview/e2e-fixture";
import type { TicketStatus } from "../../overview/domain";
import type { BoardTicket } from "./board";
import type { SaveTicketInput } from "./ticket";
import type { EditableTicket } from "./conflict";
import type { TeamBoard } from "./data";

/**
 * A fake board for Playwright (#137), used only when isFakeBackendEnabled(). The rules in
 * board.ts, ticket.ts and edit.ts run for real; only Supabase is replaced. Built from the
 * client portal's fixture (NB-1234), with real UUIDs (the editor validates them) and a
 * version per ticket, so a stale save is refused here exactly as in SQL. One store per
 * server process: tests that change it use their own tickets.
 */

const PROJECT_ID = "00000000-0000-4000-b000-00000000e2e0";
const uuid = (kind: string, n: number) =>
  `00000000-0000-4000-a000-${kind}${String(n).padStart(12 - kind.length, "0")}`;

const TEAM = [
  { id: uuid("f1", 1), name: "Ana Costa", roleLabel: "Project lead" },
  { id: uuid("f1", 2), name: "Tiago Sousa", roleLabel: "Design" },
  { id: uuid("f1", 3), name: "Rui Matos", roleLabel: "Development" },
];

const stageIds = new Map(
  E2E_PROJECT_VIEW.stages.map((stage, index) => [
    stage.id,
    uuid("c", index + 1),
  ]),
);

type StoredTicket = BoardTicket & {
  description: string;
  checklist: { id: string; label: string; done: boolean }[];
  updatedBy: string | null;
};

let versionCounter = 0;
const nextVersion = () => {
  versionCounter += 1;
  return `2026-11-14T10:00:00.${String(versionCounter).padStart(6, "0")}+00:00`;
};

const tickets: StoredTicket[] = E2E_PROJECT_VIEW.tickets.map(
  (ticket, index) => {
    const ownerId =
      TEAM.find((person) => person.name === ticket.ownerName)?.id ?? null;
    return {
      id: uuid("d", index + 1),
      number: ticket.number,
      title: ticket.title,
      status: ticket.status,
      stageId: stageIds.get(ticket.stageId) ?? uuid("c", 1),
      ownerId,
      ownerName: ticket.ownerName,
      dueOn: ticket.dueOn,
      clientVisible: ticket.clientVisible,
      waitingOnClient: ticket.waitingOnClient,
      version: nextVersion(),
      description: ticket.description,
      checklist:
        ticket.title === "Home page build"
          ? [
              "Layout and grid",
              "Hero with photography",
              "Menu highlights",
              "Story section",
              "Animations",
            ].map((label, item) => ({
              id: uuid("e", index * 10 + item + 1),
              label,
              done: item < 3,
            }))
          : [],
      updatedBy: null,
    };
  },
);

export function fakeBoard(publicId: string): TeamBoard | null {
  if (publicId !== E2E_PROJECT_VIEW.publicId) return null;
  return {
    project: {
      id: PROJECT_ID,
      publicId,
      name: E2E_PROJECT_VIEW.name,
      clientName: "E2E Café",
      health: E2E_PROJECT_VIEW.health,
      launchesOn: E2E_PROJECT_VIEW.launchesOn,
      clientEmail: "joao@e2e.example",
    },
    stages: E2E_PROJECT_VIEW.stages.map((stage) => ({
      ...stage,
      id: stageIds.get(stage.id) ?? stage.id,
    })),
    team: TEAM.map(({ id, name }) => ({ userId: id, name })),
    tickets: tickets.map(
      ({ description: _d, checklist: _c, updatedBy: _u, ...ticket }) => ticket,
    ),
  };
}

function editable(ticket: StoredTicket): EditableTicket {
  return {
    id: ticket.id,
    number: ticket.number,
    title: ticket.title,
    description: ticket.description,
    status: ticket.status,
    stageId: ticket.stageId,
    ownerId: ticket.ownerId,
    dueOn: ticket.dueOn,
    clientVisible: ticket.clientVisible,
    checklist: ticket.checklist.map((item) => ({ ...item })),
    version: ticket.version,
  };
}

export function fakeTicket(
  projectId: string,
  match: { number?: number; id?: string },
): { ticket: EditableTicket; changedBy: string | null } | null {
  if (projectId !== PROJECT_ID) return null;
  const ticket = tickets.find((entry) =>
    match.id ? entry.id === match.id : entry.number === match.number,
  );
  return ticket
    ? { ticket: editable(ticket), changedBy: ticket.updatedBy }
    : null;
}

export function fakeSaveTicket(
  input: SaveTicketInput,
  editorName: string,
): {
  outcome: "saved" | "conflict" | "not_found";
  ticketId: string;
  number: number | null;
  version: string | null;
} {
  const ownerName =
    TEAM.find((person) => person.id === input.ownerId)?.name ?? null;
  const fields = {
    title: input.title,
    description: input.description,
    status: input.status,
    stageId: input.stageId,
    ownerId: input.ownerId,
    ownerName,
    dueOn: input.dueOn,
    clientVisible: input.clientVisible,
    checklist: input.checklist.map((item, index) => ({
      id: item.id ?? uuid("e9", (Date.now() % 1_000_000) + index),
      label: item.label,
      done: item.done,
    })),
    updatedBy: editorName,
    version: nextVersion(),
  };

  if (input.ticketId === null) {
    const ticket: StoredTicket = {
      id: uuid("d9", tickets.length + 1),
      number: Math.max(...tickets.map((entry) => entry.number)) + 1,
      waitingOnClient: false,
      ...fields,
    };
    tickets.push(ticket);
    return {
      outcome: "saved",
      ticketId: ticket.id,
      number: ticket.number,
      version: ticket.version,
    };
  }

  const ticket = tickets.find((entry) => entry.id === input.ticketId);
  if (!ticket) {
    return {
      outcome: "not_found",
      ticketId: input.ticketId,
      number: null,
      version: null,
    };
  }
  if (ticket.version !== input.version) {
    return {
      outcome: "conflict",
      ticketId: ticket.id,
      number: ticket.number,
      version: ticket.version,
    };
  }
  Object.assign(ticket, fields);
  return {
    outcome: "saved",
    ticketId: ticket.id,
    number: ticket.number,
    version: ticket.version,
  };
}

export function fakeMoveTicket(
  ticketId: string,
  status: TicketStatus,
  editorName: string,
): { version: string } | null {
  const ticket = tickets.find((entry) => entry.id === ticketId);
  if (!ticket) return null;
  ticket.status = status;
  ticket.version = nextVersion();
  ticket.updatedBy = editorName;
  return { version: ticket.version };
}

export function fakeDeleteTicket(ticketId: string): "deleted" | "not_found" {
  const index = tickets.findIndex((entry) => entry.id === ticketId);
  if (index === -1) return "not_found";
  tickets.splice(index, 1);
  return "deleted";
}
