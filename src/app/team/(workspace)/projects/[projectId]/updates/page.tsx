import * as Sentry from "@sentry/nextjs";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { getTeamViewer } from "@/features/portal/team/access";
import { ProjectHeader } from "@/features/portal/team/board/components/project-header";
import { getTeamBoard } from "@/features/portal/team/board/data";
import {
  teamProjectCopy,
  teamShellCopy,
  teamUpdatesCopy,
} from "@/features/portal/team/copy";
import { ProjectActions } from "@/features/portal/team/updates/components/project-actions";
import { TeamUpdatesView } from "@/features/portal/team/updates/components/team-updates-view";
import { getTeamUpdates } from "@/features/portal/team/updates/data";
import { PageSkeleton } from "@/features/portal/states/skeletons";

/*
 * A project's updates for the team (#139; Figma TM-10). Dynamic and per user (ADR-009):
 * RLS shows the project only to its team; one the viewer can't see is a plain 404.
 */

export const metadata: Metadata = { title: teamUpdatesCopy.metaTitle };

type Props = PageProps<"/team/projects/[projectId]/updates">;

export default function TeamUpdatesPage({ params }: Props) {
  return (
    <Suspense fallback={<PageSkeleton label={teamShellCopy.loading} />}>
      <UpdatesContent params={params} />
    </Suspense>
  );
}

async function UpdatesContent({ params }: Pick<Props, "params">) {
  await connection();
  const { projectId } = await params;
  const board = await getTeamBoard(projectId).catch((error: unknown) => {
    Sentry.captureException(error, {
      tags: { feature: "portal-team-updates" },
    });
    return undefined;
  });
  if (board === null) notFound();
  if (!board) {
    return (
      <p role="alert" className="text-body text-text-muted">
        {teamUpdatesCopy.loadFailed}
      </p>
    );
  }

  let updates;
  try {
    updates = await getTeamUpdates(board.project.id);
  } catch (error) {
    Sentry.captureException(error, {
      tags: { feature: "portal-team-updates" },
    });
    return (
      <p role="alert" className="text-body text-text-muted">
        {teamUpdatesCopy.loadFailed}
      </p>
    );
  }

  const viewer = await getTeamViewer();
  const authorName = viewer.status === "signed_in" ? viewer.name : "NortBrand";
  const tickets = board.tickets.map(({ id, number, title }) => ({
    id,
    number,
    title,
  }));

  return (
    <div className="flex flex-col gap-lg">
      <ProjectHeader
        board={board}
        current="updates"
        copy={teamProjectCopy}
        actions={<ProjectActions board={board} />}
      />
      <TeamUpdatesView
        copy={teamUpdatesCopy}
        projectId={board.project.id}
        publicId={board.project.publicId}
        clientName={board.project.clientName}
        authorName={authorName}
        updates={updates}
        tickets={tickets}
        now={new Date()}
      />
    </div>
  );
}
