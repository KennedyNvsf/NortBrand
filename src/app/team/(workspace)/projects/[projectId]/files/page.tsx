import * as Sentry from "@sentry/nextjs";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { ProjectHeader } from "@/features/portal/team/board/components/project-header";
import { getTeamBoard } from "@/features/portal/team/board/data";
import {
  teamFilesCopy,
  teamProjectCopy,
  teamShellCopy,
} from "@/features/portal/team/copy";
import { TeamFilesView } from "@/features/portal/team/files/components/team-files-view";
import { UploadButton } from "@/features/portal/team/files/components/uploader";
import { getTeamFiles } from "@/features/portal/team/files/data";
import { PageSkeleton } from "@/features/portal/states/skeletons";

/*
 * A project's files for the team (#140; Figma TM-08). Dynamic and per user (ADR-009):
 * RLS and the Storage rules show the project only to its team; otherwise a plain 404.
 */

export const metadata: Metadata = { title: teamFilesCopy.metaTitle };

type Props = PageProps<"/team/projects/[projectId]/files">;

export default function TeamFilesPage({ params }: Props) {
  return (
    <Suspense fallback={<PageSkeleton label={teamShellCopy.loading} />}>
      <FilesContent params={params} />
    </Suspense>
  );
}

async function FilesContent({ params }: Pick<Props, "params">) {
  await connection();
  const { projectId } = await params;
  const board = await getTeamBoard(projectId).catch((error: unknown) => {
    Sentry.captureException(error, { tags: { feature: "portal-team-files" } });
    return undefined;
  });
  if (board === null) notFound();
  if (!board) {
    return (
      <p role="alert" className="text-body text-text-muted">
        {teamFilesCopy.loadFailed}
      </p>
    );
  }

  let files;
  try {
    files = await getTeamFiles(board.project.id);
  } catch (error) {
    Sentry.captureException(error, { tags: { feature: "portal-team-files" } });
    return (
      <p role="alert" className="text-body text-text-muted">
        {teamFilesCopy.loadFailed}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-lg">
      <ProjectHeader
        board={board}
        current="files"
        copy={teamProjectCopy}
        actions={<UploadButton label={teamFilesCopy.upload} />}
      />
      <TeamFilesView
        copy={teamFilesCopy}
        projectId={board.project.id}
        clientName={board.project.clientName}
        files={files}
        now={new Date()}
      />
    </div>
  );
}
