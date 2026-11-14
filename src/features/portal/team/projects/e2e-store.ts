import type { ClientAccount, NewProject, WelcomeEmail } from "./create-project";
import type { TeamProject } from "./list";

/**
 * A fake projects backend for Playwright (#136), used only when isFakeBackendEnabled().
 * The rules in create-project.ts and list.ts run for real; only Supabase and Resend are
 * replaced. One store per server process.
 *
 *   NB-1234 "E2E Café website" is there from the start (the client portal's project).
 *   admin@ and member@e2e.example are teammates, so they're refused as clients.
 *   A welcome email to bounce@e2e.example fails (the "keeps the project" path).
 */

const LEAD = "E2E Admin";

const projects: TeamProject[] = [
  {
    id: "00000000-0000-4000-b000-00000000e2e0",
    publicId: "NB-1234",
    name: "E2E Café website",
    clientName: "E2E Café",
    launchesOn: "2027-02-12",
    health: "waiting_on_client",
    status: "active",
    leadName: LEAD,
    stages: [
      ["Discovery", true],
      ["Design", true],
      ["Development", false],
      ["Review", false],
      ["Launch", false],
      ["Care", false],
    ].map(([name, completed], index) => ({
      id: `00000000-0000-4000-c000-00000000e2e${String(index)}`,
      position: index + 1,
      name: String(name),
      startsOn: "2026-10-01",
      endsOn: null,
      completed: completed === true,
    })),
    ticketsDone: 4,
    ticketsTotal: 9,
    lastUpdateAt: new Date().toISOString(),
  },
];

const TEAMMATES = new Set(["admin@e2e.example", "member@e2e.example"]);

export function fakeProjects(): TeamProject[] {
  return [...projects];
}

export function fakeNextProjectId(): string {
  for (;;) {
    const candidate = `NB-${String(1000 + Math.floor(Math.random() * 9000))}`;
    if (!projects.some((project) => project.publicId === candidate)) {
      return candidate;
    }
  }
}

export function fakeFindAccounts(emails: string[]): Promise<ClientAccount[]> {
  return Promise.resolve(
    emails.map((email) => ({
      email,
      userId: null,
      isTeammate: TEAMMATES.has(email),
    })),
  );
}

export function fakeCreateProject(
  project: NewProject,
  leadName: string,
): Promise<{ projectId: string; publicId: string }> {
  const publicId =
    project.suggestedId &&
    !projects.some((existing) => existing.publicId === project.suggestedId)
      ? project.suggestedId
      : fakeNextProjectId();
  const id = crypto.randomUUID();
  projects.push({
    id,
    publicId,
    name: project.name,
    clientName: project.clientName,
    launchesOn: project.launchesOn,
    health: "on_track",
    status: "active",
    leadName,
    stages: project.stages.map((stage, index) => ({
      id: crypto.randomUUID(),
      position: index + 1,
      name: stage.name,
      startsOn: stage.startsOn,
      endsOn: stage.endsOn,
      completed: false,
    })),
    ticketsDone: 0,
    ticketsTotal: 0,
    lastUpdateAt: null,
  });
  return Promise.resolve({ projectId: id, publicId });
}

export function fakeSendWelcome(welcome: WelcomeEmail): Promise<boolean> {
  return Promise.resolve(welcome.email !== "bounce@e2e.example");
}
