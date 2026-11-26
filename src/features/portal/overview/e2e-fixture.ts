import type { PortalTicket } from "./domain";
import type { ChecklistItem, Milestone, PortalFile, ProjectView } from "./data";

/*
 * The fake backend's project (#134), modelled on Figma CP-03/CP-04: NB-1234 "E2E Café
 * website", in Development (stage 3 of 6), one task waiting on the client. Used only when
 * isFakeBackendEnabled(), so Playwright never needs a database.
 */

const STAGES = [
  {
    id: "e2e-s1",
    position: 1,
    name: "Discovery",
    startsOn: "2026-10-01",
    endsOn: "2026-10-10",
    completed: true,
  },
  {
    id: "e2e-s2",
    position: 2,
    name: "Design",
    startsOn: "2026-10-13",
    endsOn: "2026-10-31",
    completed: true,
  },
  {
    id: "e2e-s3",
    position: 3,
    name: "Development",
    startsOn: "2026-11-03",
    endsOn: "2026-12-15",
    completed: false,
  },
  {
    id: "e2e-s4",
    position: 4,
    name: "Review",
    startsOn: "2026-12-16",
    endsOn: "2027-01-09",
    completed: false,
  },
  {
    id: "e2e-s5",
    position: 5,
    name: "Launch",
    startsOn: "2027-02-12",
    endsOn: "2027-02-12",
    completed: false,
  },
  {
    id: "e2e-s6",
    position: 6,
    name: "Support",
    startsOn: "2027-02-15",
    endsOn: null,
    completed: false,
  },
];

let number = 0;
function task(
  extra: Partial<PortalTicket> &
    Pick<PortalTicket, "title" | "stageId" | "status">,
): PortalTicket {
  number += 1;
  return {
    id: `e2e-t${String(number)}`,
    number,
    description: "",
    dueOn: null,
    createdOn: "2026-11-03",
    waitingOnClient: false,
    clientVisible: true,
    ownerName: null,
    ...extra,
  };
}

const TICKETS: PortalTicket[] = [
  task({
    title: "Kick-off workshop",
    stageId: "e2e-s1",
    status: "done",
    ownerName: "Ana Costa",
    dueOn: "2026-10-03",
  }),
  task({
    title: "Sitemap and goals",
    stageId: "e2e-s1",
    status: "done",
    ownerName: "Ana Costa",
    dueOn: "2026-10-09",
  }),
  ...[
    "Moodboard",
    "Home page design",
    "Menu page design",
    "Mobile designs",
    "Brand colours",
    "Design sign-off",
  ].map((title, index) =>
    task({
      title,
      stageId: "e2e-s2",
      status: "done",
      ownerName: "Tiago Sousa",
      dueOn: `2026-10-${String(15 + index * 3)}`,
    }),
  ),
  task({
    title: "Menu photos for the menu page",
    stageId: "e2e-s3",
    status: "blocked",
    waitingOnClient: true,
    ownerName: "Ana Costa",
    dueOn: "2026-11-14",
    description:
      "We need the dish photos to finish the menu page. Twelve photos, landscape, at least 2000 px wide.",
  }),
  task({
    title: "Home page build",
    stageId: "e2e-s3",
    status: "in_progress",
    ownerName: "Rui Matos",
    dueOn: "2026-11-20",
    createdOn: "2026-11-05",
    description:
      "Building the home page from the approved design: hero, menu highlights, story and the reservation call to action. You can follow it on the staging site as it comes together.",
  }),
  task({
    title: "Home page copy review",
    stageId: "e2e-s3",
    status: "in_review",
    ownerName: "Ana Costa",
    dueOn: "2026-11-18",
  }),
  task({
    title: "Menu page and online ordering link",
    stageId: "e2e-s3",
    status: "in_progress",
    ownerName: "Rui Matos",
    dueOn: "2026-11-27",
  }),
  task({
    title: "Reservation form",
    stageId: "e2e-s3",
    status: "todo",
    ownerName: "Rui Matos",
    dueOn: "2026-12-02",
  }),
  task({
    title: "Contact page build",
    stageId: "e2e-s3",
    status: "todo",
    ownerName: "Rui Matos",
    dueOn: "2026-12-05",
  }),
];

const CHECKLISTS: Record<string, ChecklistItem[]> = {
  "e2e-t10": [
    { id: "c1", label: "Layout and grid", done: true },
    { id: "c2", label: "Hero with photography", done: true },
    { id: "c3", label: "Menu highlights", done: true },
    { id: "c4", label: "Story section", done: false },
    { id: "c5", label: "Animations", done: false },
  ],
};

export const E2E_PROJECT_VIEW: ProjectView & {
  checklists: Record<string, ChecklistItem[]>;
  milestones: Milestone[];
  files: PortalFile[];
} = {
  id: "00000000-0000-4000-b000-00000000e2e0",
  publicId: "NB-1234",
  name: "E2E Café website",
  health: "waiting_on_client",
  stagingUrl: "https://staging.e2e.example",
  launchesOn: "2027-02-12",
  stages: STAGES,
  tickets: TICKETS,
  updates: [
    {
      id: "u1",
      body: "Finished the mobile designs for the Menu and Contact pages.",
      createdAt: "2026-11-14T10:20:00Z",
      authorName: "Tiago Sousa",
      ticketIds: [],
      highlight: false,
      needsClient: false,
      editedAt: null,
    },
    {
      id: "u2",
      body: "Hero and menu highlights are on staging. Story section next.",
      createdAt: "2026-11-13T17:45:00Z",
      authorName: "Rui Matos",
      ticketIds: ["e2e-t10"],
      highlight: false,
      needsClient: false,
      editedAt: "2026-11-13T18:05:00Z",
    },
    {
      id: "u3",
      body: "We need the menu photos to finish the menu page. Could you send them this week?",
      createdAt: "2026-11-09T09:12:00Z",
      authorName: "Ana Costa",
      ticketIds: ["e2e-t9"],
      highlight: false,
      needsClient: true,
      editedAt: null,
    },
    {
      id: "u4",
      body: "Development has started. We'll share progress here every few days.",
      createdAt: "2026-11-03T09:00:00Z",
      authorName: "Ana Costa",
      ticketIds: [],
      highlight: false,
      needsClient: false,
      editedAt: null,
    },
    {
      id: "u5",
      body: "Design stage complete. Thank you for the quick, clear feedback.",
      createdAt: "2026-10-31T16:00:00Z",
      authorName: "Ana Costa",
      ticketIds: [],
      highlight: true,
      needsClient: false,
      editedAt: null,
    },
  ],
  checklists: CHECKLISTS,
  milestones: [
    {
      id: "m1",
      title: "Kick-off call",
      body: "We agreed goals, pages and the launch date.",
      dueOn: "2026-10-01",
      done: true,
    },
    {
      id: "m2",
      title: "Design sign-off",
      body: "You approved the designs for every page.",
      dueOn: "2026-10-31",
      done: true,
    },
    {
      id: "m3",
      title: "Staging walkthrough",
      body: "We'll take you through the working site and collect your feedback.",
      dueOn: "2026-12-16",
      done: false,
    },
    {
      id: "m4",
      title: "Launch",
      body: "The site goes live.",
      dueOn: "2027-02-12",
      done: false,
    },
  ],
  files: [
    {
      id: "00000000-0000-4000-a000-00000000f2e1",
      name: "Home page design",
      sizeBytes: 4_200_000,
      contentType: "application/pdf",
      createdAt: "2026-10-31T15:00:00Z",
      uploaderName: "Tiago Sousa",
    },
    {
      id: "00000000-0000-4000-a000-00000000f2e2",
      name: "Brand assets",
      sizeBytes: 18_000_000,
      contentType: "application/zip",
      createdAt: "2026-10-20T15:00:00Z",
      uploaderName: "Tiago Sousa",
    },
    {
      id: "00000000-0000-4000-a000-00000000f2e3",
      name: "Proposal",
      sizeBytes: 1_100_000,
      contentType: "application/pdf",
      createdAt: "2026-09-24T10:00:00Z",
      uploaderName: "Ana Costa",
    },
    {
      id: "00000000-0000-4000-a000-00000000f2e4",
      name: "Signed agreement",
      sizeBytes: 320_000,
      contentType: "application/pdf",
      createdAt: "2026-09-29T10:00:00Z",
      uploaderName: "Ana Costa",
    },
    {
      id: "00000000-0000-4000-a000-00000000f2e5",
      name: "Moodboard",
      sizeBytes: 2_400_000,
      contentType: "image/png",
      createdAt: "2026-10-11T10:00:00Z",
      uploaderName: "Tiago Sousa",
    },
  ],
};
