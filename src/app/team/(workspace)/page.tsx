import * as Sentry from "@sentry/nextjs";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

import { teamPagesCopy, teamShellCopy } from "@/features/portal/team/copy";
import { listTeammates } from "@/features/portal/team/access";
import { getTeamShell } from "@/features/portal/team/shell-data";
import { NewProjectLauncher } from "@/features/portal/team/projects/components/new-project-launcher";
import { ProjectsView } from "@/features/portal/team/projects/components/projects-view";
import {
  getSuggestedProjectId,
  getTeamProjects,
} from "@/features/portal/team/projects/data";
import { parseProjectView } from "@/features/portal/team/projects/list";
import { EmptyState } from "@/features/portal/states/empty-state";
import { PageSkeleton } from "@/features/portal/states/skeletons";

/*
 * Projects, the team's landing page (#133, #136; Figma TM-01). Admins create projects
 * here; members see the projects they're assigned to (RLS). The first-run state is TM-09
 * "Projects · first run". Dynamic and per user (ADR-009).
 */

export const metadata: Metadata = { title: teamPagesCopy.projects.title };

type Props = PageProps<"/team">;

export default function ProjectsPage({ searchParams }: Props) {
  return (
    <Suspense fallback={<PageSkeleton label={teamShellCopy.loading} />}>
      <ProjectsContent searchParams={searchParams} />
    </Suspense>
  );
}

async function ProjectsContent({ searchParams }: Pick<Props, "searchParams">) {
  await connection();
  const data = await getTeamShell();
  if (!data) return null;
  const copy = teamPagesCopy.projects;
  const isAdmin = data.viewer.role === "admin";
  const view = parseProjectView((await searchParams).view);

  let projects;
  try {
    projects = await getTeamProjects();
  } catch (error) {
    Sentry.captureException(error, {
      tags: { feature: "portal-team-projects" },
    });
    return (
      <div className="flex flex-col gap-lg">
        <h1 className="text-h3 text-text-primary">{copy.title}</h1>
        <p role="alert" className="text-body text-text-muted">
          {copy.loadFailed}
        </p>
      </div>
    );
  }

  const action = isAdmin ? (
    <NewProjectLauncher
      label={copy.newProject}
      copy={teamPagesCopy.newProject}
      team={(await listTeammates()).map(({ userId, name }) => ({
        userId,
        name,
      }))}
      viewerId={data.viewer.userId}
      suggestedId={await getSuggestedProjectId()}
    />
  ) : null;

  if (projects.length === 0) {
    return (
      <div className="flex flex-col gap-lg">
        <h1 className="text-h3 text-text-primary">{copy.title}</h1>
        <EmptyState
          title={copy.emptyTitle}
          body={isAdmin ? copy.emptyBody : copy.emptyMemberBody}
          action={action ?? undefined}
        />
      </div>
    );
  }

  return (
    <ProjectsView
      copy={copy}
      projects={projects}
      view={view}
      action={action}
      now={new Date()}
    />
  );
}
