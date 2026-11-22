import "server-only";

import { cache } from "react";
import { z } from "zod";

import { site } from "@/content/site";
import { isFakeBackendEnabled } from "@/lib/e2e-backend";
import { getPortalSupabase } from "@/lib/supabase/auth";

import {
  isTicketStatus,
  type PortalStage,
  type PortalTicket,
} from "../overview/domain";
import type {
  ChecklistItem,
  Milestone,
  PortalFile,
  ProjectHealth,
  ProjectView,
} from "../overview/data";
import { E2E_PROJECT_VIEW } from "../overview/e2e-fixture";
import type { PortalLocale } from "../overview/format";
import type { ClientShellData } from "../shell/client-data";
import { initials } from "../shell/initials";

/*
 * View as client (#160): everything the client portal screens show for one project, as
 * its client sees it. Computed in SQL by portal_client_preview (the client policies'
 * rules, run for a teammate who works on the project); this file only reshapes it into
 * the types the client screens already use. Cached per request; never across users.
 */

export type PreviewBundle = {
  view: ProjectView;
  checklists: Record<string, ChecklistItem[]>;
  milestones: Milestone[];
  files: PortalFile[];
  shell: ClientShellData;
  /** The language most of the project's clients use; the preview opens in it. */
  clientLocale: PortalLocale;
};

const uuid = z.string().min(1);
const date = z.string().min(1);

const previewSchema = z.object({
  project: z.object({
    id: uuid,
    public_id: z.string(),
    name: z.string(),
    health: z.string(),
    staging_url: z.string().nullable(),
    launches_on: date,
    status: z.string(),
    lead_id: uuid,
  }),
  stages: z.array(
    z.object({
      id: uuid,
      position: z.number(),
      name: z.string(),
      starts_on: date,
      ends_on: date.nullable(),
      completed_at: z.string().nullable(),
    }),
  ),
  tickets: z.array(
    z.object({
      id: uuid,
      number: z.number(),
      title: z.string(),
      description: z.string(),
      status: z.string(),
      due_on: date.nullable(),
      created_at: z.string(),
      waiting_on_client: z.boolean(),
      stage_id: uuid,
      owner_id: uuid.nullable(),
    }),
  ),
  checklist_items: z.array(
    z.object({
      id: uuid,
      ticket_id: uuid,
      label: z.string(),
      done: z.boolean(),
    }),
  ),
  updates: z.array(
    z.object({
      id: uuid,
      body: z.string(),
      created_at: z.string(),
      edited_at: z.string().nullable(),
      highlight: z.boolean(),
      needs_client: z.boolean(),
      author_id: uuid.nullable(),
      ticket_ids: z.array(uuid),
    }),
  ),
  milestones: z.array(
    z.object({
      id: uuid,
      title: z.string(),
      body: z.string(),
      due_on: date,
      done_at: z.string().nullable(),
    }),
  ),
  files: z.array(
    z.object({
      id: uuid,
      name: z.string(),
      size_bytes: z.number(),
      content_type: z.string(),
      created_at: z.string(),
      uploaded_by: uuid.nullable(),
    }),
  ),
  file_count: z.number(),
  team: z.array(
    z.object({
      user_id: uuid,
      role_label: z.string(),
      name: z.string(),
      email: z.string(),
    }),
  ),
  client_locale: z.string().nullable(),
});

const HEALTH: readonly ProjectHealth[] = [
  "on_track",
  "at_risk",
  "waiting_on_client",
];
const isHealth = (value: string): value is ProjectHealth =>
  (HEALTH as readonly string[]).includes(value);

/** The SQL function's answer → the client screens' types. Exported for tests. */
export function toPreviewBundle(data: unknown): PreviewBundle | null {
  const parsed = previewSchema.safeParse(data);
  if (!parsed.success) return null;
  const preview = parsed.data;
  const { project } = preview;

  // A client resolves names only for the teammates on the project's team (RLS); anyone
  // else reads as the studio (null), exactly as on the client's own screens.
  const names = new Map(
    preview.team.map((person) => [person.user_id, person.name]),
  );
  const nameOf = (id: string | null) => (id ? (names.get(id) ?? null) : null);

  const stages: PortalStage[] = preview.stages.map((row) => ({
    id: row.id,
    position: row.position,
    name: row.name,
    startsOn: row.starts_on,
    endsOn: row.ends_on,
    completed: row.completed_at !== null,
  }));
  const tickets: PortalTicket[] = preview.tickets.flatMap((row) =>
    isTicketStatus(row.status)
      ? [
          {
            id: row.id,
            number: row.number,
            title: row.title,
            description: row.description,
            status: row.status,
            dueOn: row.due_on,
            createdOn: row.created_at.slice(0, 10),
            waitingOnClient: row.waiting_on_client,
            clientVisible: true,
            stageId: row.stage_id,
            ownerName: nameOf(row.owner_id),
          },
        ]
      : [],
  );

  const checklists: Record<string, ChecklistItem[]> = {};
  for (const item of preview.checklist_items) {
    (checklists[item.ticket_id] ??= []).push({
      id: item.id,
      label: item.label,
      done: item.done,
    });
  }

  const lead = preview.team.find(
    (person) => person.user_id === project.lead_id,
  );

  return {
    view: {
      id: project.id,
      publicId: project.public_id,
      name: project.name,
      health: isHealth(project.health) ? project.health : "on_track",
      stagingUrl: project.staging_url,
      launchesOn: project.launches_on,
      stages,
      tickets,
      updates: preview.updates.map((row) => ({
        id: row.id,
        body: row.body,
        createdAt: row.created_at,
        authorName: nameOf(row.author_id),
        ticketIds: row.ticket_ids,
        highlight: row.highlight,
        needsClient: row.needs_client,
        editedAt: row.edited_at,
      })),
    },
    checklists,
    milestones: preview.milestones.map((row) => ({
      id: row.id,
      title: row.title,
      body: row.body,
      dueOn: row.due_on,
      done: row.done_at !== null,
    })),
    files: preview.files.map((row) => ({
      id: row.id,
      name: row.name,
      sizeBytes: row.size_bytes,
      contentType: row.content_type,
      createdAt: row.created_at,
      uploaderName: nameOf(row.uploaded_by),
    })),
    shell: {
      project: {
        id: project.id,
        publicId: project.public_id,
        name: project.name,
      },
      projects: [{ publicId: project.public_id, name: project.name }],
      counts: { tasks: tickets.length, files: preview.file_count },
      messageTo: lead?.email ?? site.contact.email.value,
      team: preview.team.map((person) => ({
        name: person.name,
        roleLabel: person.role_label,
        initials: initials(person.name),
      })),
      viewer: { email: "", name: null },
    },
    clientLocale: preview.client_locale === "en" ? "en" : "pt",
  };
}

function fakeBundle(publicId: string): PreviewBundle | null {
  if (publicId !== E2E_PROJECT_VIEW.publicId) return null;
  const { checklists, milestones, files, ...view } = E2E_PROJECT_VIEW;
  return {
    view: { ...view, tickets: view.tickets.filter((t) => t.clientVisible) },
    checklists,
    milestones,
    files,
    shell: {
      project: { id: view.id, publicId: view.publicId, name: view.name },
      projects: [{ publicId: view.publicId, name: view.name }],
      counts: {
        tasks: view.tickets.filter((t) => t.clientVisible).length,
        files: files.length,
      },
      messageTo: "ana@e2e.example",
      team: [
        { name: "Ana Costa", roleLabel: "Project lead", initials: "AC" },
        { name: "Tiago Sousa", roleLabel: "Design", initials: "TS" },
        { name: "Rui Matos", roleLabel: "Development", initials: "RM" },
      ],
      viewer: { email: "", name: null },
    },
    clientLocale: "pt",
  };
}

/**
 * The client's view of a project, or null when the teammate can't preview it (not on
 * the project, or no such Project ID). Throws when the database can't be read.
 */
export const getPreviewBundle = cache(async function getPreviewBundle(
  publicId: string,
): Promise<PreviewBundle | null> {
  const wanted = publicId.toUpperCase();
  if (isFakeBackendEnabled()) return fakeBundle(wanted);

  const { data, error } = await (
    await getPortalSupabase()
  ).rpc("portal_client_preview", { p_public_id: wanted });
  if (error) throw new Error(`Preview read failed (${error.code})`);
  if (data === null) return null;
  const bundle = toPreviewBundle(data);
  if (!bundle) throw new Error("Preview answer was not the expected shape");
  return bundle;
});
