import { describe, expect, it, vi } from "vitest";

import { portalBase } from "../overview/scope";
import { withLocale } from "./language-switch";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/auth", () => ({ getPortalSupabase: vi.fn() }));
vi.mock("@/lib/e2e-backend", () => ({ isFakeBackendEnabled: () => false }));

const { toPreviewBundle } = await import("./data");

const LEAD = "a1700000-0000-4000-a000-000000000002";
const OTHER = "a1700000-0000-4000-a000-000000000009";

const answer = {
  project: {
    id: "p1",
    public_id: "NB-9971",
    name: "Atlântico Café website",
    health: "waiting_on_client",
    staging_url: null,
    launches_on: "2027-02-12",
    status: "active",
    lead_id: LEAD,
  },
  stages: [
    {
      id: "s1",
      position: 1,
      name: "Design",
      starts_on: "2026-10-01",
      ends_on: "2026-10-31",
      completed_at: "2026-10-31T10:00:00Z",
    },
  ],
  tickets: [
    {
      id: "t1",
      number: 1,
      title: "Menu photos",
      description: "",
      status: "blocked",
      due_on: null,
      created_at: "2026-10-02T09:00:00Z",
      waiting_on_client: true,
      stage_id: "s1",
      owner_id: LEAD,
    },
    {
      id: "t2",
      number: 2,
      title: "Odd status",
      description: "",
      status: "unknown",
      due_on: null,
      created_at: "2026-10-02T09:00:00Z",
      waiting_on_client: false,
      stage_id: "s1",
      owner_id: OTHER,
    },
  ],
  checklist_items: [
    { id: "c1", ticket_id: "t1", label: "Send the photos", done: false },
  ],
  updates: [
    {
      id: "u1",
      body: "Design is done.",
      created_at: "2026-11-01T10:00:00Z",
      edited_at: null,
      highlight: true,
      needs_client: false,
      author_id: OTHER,
      ticket_ids: ["t1"],
    },
  ],
  milestones: [
    {
      id: "m1",
      title: "Sign-off",
      body: "",
      due_on: "2026-11-01",
      done_at: null,
    },
  ],
  files: [
    {
      id: "f1",
      name: "Brand guide.pdf",
      size_bytes: 1000,
      content_type: "application/pdf",
      created_at: "2026-11-01T10:00:00Z",
      uploaded_by: LEAD,
    },
  ],
  file_count: 1,
  team: [
    {
      user_id: LEAD,
      role_label: "Project lead",
      name: "Tiago Sousa",
      email: "tiago@test.example",
    },
  ],
  client_locale: "en",
};

describe("toPreviewBundle", () => {
  it("reshapes the client's view for the client screens", () => {
    const bundle = toPreviewBundle(answer);
    expect(bundle?.view.publicId).toBe("NB-9971");
    expect(bundle?.view.health).toBe("waiting_on_client");
    expect(bundle?.view.tickets.map((ticket) => ticket.title)).toEqual([
      "Menu photos",
    ]);
    expect(bundle?.view.tickets[0]?.ownerName).toBe("Tiago Sousa");
    expect(bundle?.checklists.t1).toEqual([
      { id: "c1", label: "Send the photos", done: false },
    ]);
    expect(bundle?.files[0]?.uploaderName).toBe("Tiago Sousa");
    expect(bundle?.clientLocale).toBe("en");
  });

  it("names only the project's team, as the client's own screens do", () => {
    // OTHER isn't on the project's team: a client can't read their name.
    expect(toPreviewBundle(answer)?.view.updates[0]?.authorName).toBeNull();
  });

  it("builds the shell: the lead to message, counts and the team", () => {
    const shell = toPreviewBundle(answer)?.shell;
    expect(shell?.messageTo).toBe("tiago@test.example");
    expect(shell?.counts).toEqual({ tasks: 1, files: 1 });
    expect(shell?.team).toEqual([
      { name: "Tiago Sousa", roleLabel: "Project lead", initials: "TS" },
    ]);
  });

  it("opens in Portuguese unless the clients use English", () => {
    expect(
      toPreviewBundle({ ...answer, client_locale: null })?.clientLocale,
    ).toBe("pt");
  });

  it("refuses an answer of the wrong shape", () => {
    expect(toPreviewBundle({ project: {} })).toBeNull();
  });
});

describe("withLocale", () => {
  it("swaps the language and keeps the section and its query", () => {
    expect(
      withLocale("/team/projects/NB-1234/preview/pt/tasks", "task=3", "en"),
    ).toBe("/team/projects/NB-1234/preview/en/tasks?task=3");
    expect(withLocale("/team/projects/NB-1234/preview/en", "", "pt")).toBe(
      "/team/projects/NB-1234/preview/pt",
    );
  });
});

describe("portalBase", () => {
  it("is the client's route, or the preview's base", () => {
    expect(portalBase("pt", "NB-1234")).toBe("/pt/portal/NB-1234");
    expect(
      portalBase("pt", "NB-1234", {
        base: "/team/projects/NB-1234/preview/pt",
        publicId: "NB-1234",
      }),
    ).toBe("/team/projects/NB-1234/preview/pt");
  });
});
