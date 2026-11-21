import * as Sentry from "@sentry/nextjs";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { getTeamViewer } from "@/features/portal/team/access";
import { ProjectHeader } from "@/features/portal/team/board/components/project-header";
import { getTeamBoard } from "@/features/portal/team/board/data";
import { ActivityCard } from "@/features/portal/team/client-access/components/activity-card";
import { PeopleCard } from "@/features/portal/team/client-access/components/people-card";
import { ProjectIdCard } from "@/features/portal/team/client-access/components/project-id-card";
import { getClientAccess } from "@/features/portal/team/client-access/data";
import {
  teamAccessCopy,
  teamProjectCopy,
  teamShellCopy,
} from "@/features/portal/team/copy";
import { ProjectActions } from "@/features/portal/team/updates/components/project-actions";
import { PageSkeleton } from "@/features/portal/states/skeletons";

/*
 * A project's client access for the team (#141; Figma TM-06). Dynamic and per user
 * (ADR-009): RLS shows the project, its people and its activity only to its team; one
 * the viewer can't see is a plain 404. Admins manage; members read.
 */

export const metadata: Metadata = { title: teamAccessCopy.metaTitle };

type Props = PageProps<"/team/projects/[projectId]/access">;

export default function TeamAccessPage({ params }: Props) {
  return (
    <Suspense fallback={<PageSkeleton label={teamShellCopy.loading} />}>
      <AccessContent params={params} />
    </Suspense>
  );
}

function LoadFailed() {
  return (
    <p role="alert" className="text-body text-text-muted">
      {teamAccessCopy.loadFailed}
    </p>
  );
}

async function AccessContent({ params }: Pick<Props, "params">) {
  await connection();
  const { projectId } = await params;
  const board = await getTeamBoard(projectId).catch((error: unknown) => {
    Sentry.captureException(error, { tags: { feature: "portal-team-access" } });
    return undefined;
  });
  if (board === null) notFound();
  if (!board) return <LoadFailed />;

  let access;
  try {
    access = await getClientAccess(board.project);
  } catch (error) {
    Sentry.captureException(error, { tags: { feature: "portal-team-access" } });
    return <LoadFailed />;
  }

  const viewer = await getTeamViewer();
  const canManage = viewer.status === "signed_in" && viewer.role === "admin";
  const now = new Date();

  return (
    <div className="flex flex-col gap-lg">
      <ProjectHeader
        board={board}
        current="access"
        copy={teamProjectCopy}
        actions={<ProjectActions board={board} />}
      />
      <div className="grid gap-lg lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="flex min-w-0 flex-col gap-lg">
          <PeopleCard
            copy={teamAccessCopy}
            projectId={board.project.id}
            clientName={board.project.clientName}
            people={access.people}
            lockouts={access.lockouts}
            canManage={canManage}
            now={now.toISOString()}
          />
          <ActivityCard
            copy={teamAccessCopy}
            events={access.events}
            people={access.people}
            lockoutMinutes={access.lockoutMinutes}
            now={now}
          />
        </div>
        <div className="order-first lg:order-none">
          <ProjectIdCard
            copy={teamAccessCopy}
            projectId={board.project.id}
            publicId={access.publicId}
            clientName={board.project.clientName}
            canManage={canManage}
          />
        </div>
      </div>
    </div>
  );
}
