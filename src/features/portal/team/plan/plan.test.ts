import { describe, expect, it } from "vitest";

import type { PortalStage } from "../../overview/domain";
import {
  attentionItems,
  clientProgress,
  completionPlan,
  stageProgress,
  suggestHealth,
  teamProgress,
  type PlanClient,
  type PlanTicket,
} from "./plan";

const TODAY = "2026-11-12";

function ticket(overrides: Partial<PlanTicket>): PlanTicket {
  return {
    id: "t",
    number: 1,
    title: "Ticket",
    status: "todo",
    stageId: "dev",
    dueOn: null,
    clientVisible: true,
    waitingOnClient: false,
    changedAt: "2026-11-12T09:00:00Z",
    ...overrides,
  };
}

const stages: PortalStage[] = [
  {
    id: "design",
    position: 1,
    name: "Design",
    startsOn: "2026-10-13",
    endsOn: "2026-10-31",
    completed: true,
  },
  {
    id: "dev",
    position: 2,
    name: "Development",
    startsOn: "2026-11-03",
    endsOn: "2026-12-15",
    completed: false,
  },
  {
    id: "review",
    position: 3,
    name: "Review",
    startsOn: "2026-12-16",
    endsOn: "2027-01-09",
    completed: false,
  },
];

describe("progress", () => {
  const tickets = [
    ticket({ status: "done" }),
    ticket({ status: "done", clientVisible: false }),
    ticket({ status: "todo" }),
    ticket({ status: "in_progress", clientVisible: false, stageId: "review" }),
  ];

  it("counts every ticket for the team and visible ones for the client", () => {
    expect(teamProgress(tickets)).toEqual({ done: 2, total: 4, percent: 50 });
    expect(clientProgress(tickets)).toEqual({ done: 1, total: 2, percent: 50 });
    expect(stageProgress(tickets, "review")).toEqual({
      done: 0,
      total: 1,
      percent: 0,
    });
    expect(teamProgress([])).toEqual({ done: 0, total: 0, percent: 0 });
  });
});

describe("suggestHealth", () => {
  it("suggests waiting on the client when a ticket is blocked on them", () => {
    expect(
      suggestHealth(
        [
          ticket({ status: "blocked", waitingOnClient: true }),
          ticket({ dueOn: "2026-11-01" }),
        ],
        stages[1] ?? null,
        TODAY,
      ),
    ).toEqual({
      health: "waiting_on_client",
      reason: "blocked_on_client",
      count: 1,
    });
  });

  it("suggests at risk for overdue tickets, then for a late stage", () => {
    expect(
      suggestHealth(
        [ticket({ dueOn: "2026-11-01" })],
        stages[1] ?? null,
        TODAY,
      ),
    ).toEqual({
      health: "at_risk",
      reason: "overdue",
      count: 1,
    });
    expect(suggestHealth([], stages[1] ?? null, "2026-12-20")).toEqual({
      health: "at_risk",
      reason: "stage_late",
      stage: "Development",
      endsOn: "2026-12-15",
    });
  });

  it("ignores finished tickets and otherwise says on track", () => {
    expect(
      suggestHealth(
        [
          ticket({
            status: "done",
            waitingOnClient: true,
            dueOn: "2026-11-01",
          }),
        ],
        stages[1] ?? null,
        TODAY,
      ),
    ).toEqual({ health: "on_track", reason: "on_track" });
  });
});

describe("attentionItems", () => {
  const clients: PlanClient[] = [
    {
      email: "leonor@client.pt",
      name: "Leonor Faria",
      status: "invited",
      invitedAt: "2026-11-09T10:00:00Z",
      lastSignInAt: null,
    },
    {
      email: "new@client.pt",
      name: null,
      status: "invited",
      invitedAt: "2026-11-11T10:00:00Z",
      lastSignInAt: null,
    },
    {
      email: "joao@client.pt",
      name: "João",
      status: "active",
      invitedAt: "2026-10-01T10:00:00Z",
      lastSignInAt: "2026-11-10T10:00:00Z",
    },
  ];

  it("lists blocked tickets, quiet clients and long reviews, in that order", () => {
    const items = attentionItems(
      [
        ticket({
          number: 9,
          title: "Menu photos",
          status: "blocked",
          waitingOnClient: true,
          changedAt: "2026-11-07T10:00:00Z",
        }),
        ticket({
          number: 11,
          title: "Home page copy review",
          status: "in_review",
          changedAt: "2026-11-08T10:00:00Z",
        }),
        ticket({
          number: 12,
          title: "Fresh review",
          status: "in_review",
          changedAt: "2026-11-11T10:00:00Z",
        }),
      ],
      clients,
      TODAY,
    );
    expect(items).toEqual([
      { kind: "blocked", ticketNumber: 9, title: "Menu photos", days: 5 },
      { kind: "not_signed_in", name: "Leonor Faria", invitedOn: "2026-11-09" },
      {
        kind: "in_review",
        ticketNumber: 11,
        title: "Home page copy review",
        days: 4,
      },
    ]);
  });

  it("is empty when nothing needs attention", () => {
    expect(attentionItems([ticket({})], [], TODAY)).toEqual([]);
  });
});

describe("completionPlan", () => {
  const tickets = [
    ticket({ stageId: "dev", status: "done" }),
    ticket({ stageId: "dev", status: "in_progress" }),
    ticket({ stageId: "dev", status: "blocked" }),
  ];

  it("describes the current stage: open tickets, the next stage, early or not", () => {
    expect(completionPlan(stages, tickets, "dev", TODAY)).toEqual({
      stage: stages[1],
      next: stages[2],
      open: 2,
      total: 3,
      early: true,
    });
  });

  it("refuses a finished stage or one after the current stage", () => {
    expect(completionPlan(stages, tickets, "design", TODAY)).toBeNull();
    expect(completionPlan(stages, tickets, "review", TODAY)).toBeNull();
  });
});
