import { cookies } from "next/headers";
import { cache } from "react";

import { site } from "@/content/site";
import { isFakeBackendEnabled } from "@/lib/e2e-backend";
import { getPortalSupabase } from "@/lib/supabase/auth";

import {
  E2E_PORTAL_COOKIE,
  E2E_PORTAL_PROJECT_ID,
  E2E_PORTAL_PROJECT_NAME,
} from "../auth/e2e-backend";

/*
 * What the client shell shows (#133): the project, the client's other projects (for the
 * switcher), the counts in the nav, the lead ("Message your team") and the team list.
 * Read with the client's session, so RLS decides everything: tickets and files are only
 * the client-visible ones, and the team only the people on this project. Never cached
 * across users (ADR-009).
 */

export type ShellPerson = {
  name: string;
  roleLabel: string;
  initials: string;
};

export type ClientShellData = {
  project: { id: string; publicId: string; name: string };
  projects: { publicId: string; name: string }[];
  counts: { tasks: number; files: number };
  /** Where "Message your team" writes: the lead, or the studio when the lead is hidden. */
  messageTo: string;
  team: ShellPerson[];
  viewer: { email: string; name: string | null };
};

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts.at(0)?.[0] ?? "";
  const last = parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : "";
  return (first + last).toUpperCase() || "•";
}

const E2E_SHELL: Omit<ClientShellData, "viewer"> = {
  project: {
    id: "00000000-0000-4000-b000-00000000e2e0",
    publicId: E2E_PORTAL_PROJECT_ID,
    name: E2E_PORTAL_PROJECT_NAME,
  },
  projects: [
    { publicId: E2E_PORTAL_PROJECT_ID, name: E2E_PORTAL_PROJECT_NAME },
    { publicId: "NB-1235", name: "E2E Café brand refresh" },
  ],
  counts: { tasks: 32, files: 8 },
  messageTo: "ana@e2e.example",
  team: [
    { name: "Ana Costa", roleLabel: "Project lead", initials: "AC" },
    { name: "Tiago Sousa", roleLabel: "Design", initials: "TS" },
    { name: "Rui Matos", roleLabel: "Development", initials: "RM" },
  ],
};

/**
 * The shell for one Project ID, or null when this user can't see that project. Cached
 * per request, so the layout and the page share one read.
 */
export const getClientShell = cache(async function getClientShell(
  publicId: string,
): Promise<ClientShellData | null> {
  const wanted = publicId.toUpperCase();

  if (isFakeBackendEnabled()) {
    const project = E2E_SHELL.projects.find((p) => p.publicId === wanted);
    if (!project) return null;
    return {
      ...E2E_SHELL,
      project: { ...E2E_SHELL.project, ...project },
      viewer: {
        email:
          (await cookies()).get(E2E_PORTAL_COOKIE)?.value ??
          "client@e2e.example",
        name: null,
      },
    };
  }

  const supabase = await getPortalSupabase();
  const { data: projects, error } = await supabase
    .from("projects")
    .select("id, public_id, name, lead_id")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw new Error(`Portal projects failed (${error.code})`);

  const project = projects.find((p) => p.public_id === wanted);
  if (!project) return null;

  const [tasks, files, team, user] = await Promise.all([
    supabase
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .eq("project_id", project.id),
    supabase
      .from("project_files")
      .select("id", { count: "exact", head: true })
      .eq("project_id", project.id),
    supabase
      .from("project_team")
      .select("user_id, role_label, position, team_members(name, email)")
      .eq("project_id", project.id)
      .order("position"),
    supabase.auth.getUser(),
  ]);

  // RLS shows a client exactly the teammates on their project's team, so every visible
  // project_team row has its team_members row.
  const people = (team.data ?? []).map((row) => ({
    userId: row.user_id,
    name: row.team_members.name,
    email: row.team_members.email,
    roleLabel: row.role_label,
  }));
  const lead = people.find((person) => person.userId === project.lead_id);

  const email = user.data.user?.email ?? "";
  const { data: clientRow } = await supabase
    .from("project_clients")
    .select("name")
    .eq("project_id", project.id)
    .eq("email", email.toLowerCase())
    .maybeSingle();

  return {
    project: {
      id: project.id,
      publicId: project.public_id,
      name: project.name,
    },
    projects: projects.map((p) => ({ publicId: p.public_id, name: p.name })),
    counts: { tasks: tasks.count ?? 0, files: files.count ?? 0 },
    messageTo: lead?.email ?? site.contact.email.value,
    team: people.map((person) => ({
      name: person.name,
      roleLabel: person.roleLabel,
      initials: initials(person.name),
    })),
    viewer: { email, name: clientRow?.name ?? null },
  };
});
