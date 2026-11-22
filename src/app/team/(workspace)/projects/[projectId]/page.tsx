import * as Sentry from "@sentry/nextjs";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { getTeamViewer } from "@/features/portal/team/access";
import {
  manageProjectCopy,
  teamOverviewCopy,
  teamProjectCopy,
  teamShellCopy,
} from "@/features/portal/team/copy";
import { ManageProject } from "@/features/portal/team/projects/components/manage-project";
import { TeamOverview } from "@/features/portal/team/plan/components/team-overview";
import { getTeamPlan, type TeamPlan } from "@/features/portal/team/plan/data";
import { PageSkeleton } from "@/features/portal/states/skeletons";
import { ProjectActions } from "@/features/portal/team/updates/components/project-actions";

/*
 * A project's overview for the team (#138; Figma TM-07). Dynamic and per user (ADR-009):
 * RLS shows the project only to its team; one the viewer can't see is a plain 404.
 * Admins also get "Manage project": archive, restore, delete (#165).
 */

export const metadata: Metadata = { title: teamOverviewCopy.metaTitle };

type Props = PageProps<"/team/projects/[projectId]">;

export default function ProjectOverviewPage({ params }: Props) {
  return (
    <Suspense fallback={<PageSkeleton label={teamShellCopy.loading} />}>
      <OverviewContent params={params} />
    </Suspense>
  );
}

async function OverviewContent({ params }: Pick<Props, "params">) {
  await connection();
  const { projectId } = await params;
  let plan: TeamPlan | null;
  try {
    plan = await getTeamPlan(projectId);
  } catch (error) {
    Sentry.captureException(error, {
      tags: { feature: "portal-team-overview" },
    });
    return (
      <p role="alert" className="text-body text-text-muted">
        {teamOverviewCopy.loadFailed}
      </p>
    );
  }
  if (!plan) notFound();
  const viewer = await getTeamViewer();
  const isAdmin = viewer.status === "signed_in" && viewer.role === "admin";

  return (
    <div className="flex flex-col gap-lg">
      <TeamOverview
        plan={plan}
        copy={teamOverviewCopy}
        headerCopy={teamProjectCopy}
        actions={<ProjectActions board={plan} />}
        now={new Date()}
      />
      {isAdmin ? (
        <ManageProject
          project={{
            id: plan.project.id,
            publicId: plan.project.publicId,
            name: plan.project.name,
            clientName: plan.project.clientName,
            status: plan.project.status,
          }}
          copy={manageProjectCopy}
        />
      ) : null}
    </div>
  );
}
