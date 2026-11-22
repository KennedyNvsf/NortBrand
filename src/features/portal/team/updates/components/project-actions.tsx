import { Plus } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { ICON_STROKE } from "@/lib/icons";

import { getTeamViewer } from "../../access";
import type { TeamBoard } from "../../board/data";
import { Archive } from "lucide-react";

import {
  boardCopy,
  manageProjectCopy,
  previewCopy,
  teamUpdatesCopy,
} from "../../copy";
import { PostUpdateLauncher } from "./post-update-launcher";

/*
 * The project header's actions on every team project page (Figma TM-02, TM-05, TM-07,
 * TM-10): "View as client" (#160, a read-only preview of the client portal), "Post
 * update" (#139) and "New ticket" (#137). Server component; the dialog it opens is
 * client code loaded on demand. An archived project (#165) is read-only and hidden from
 * its clients, so it shows the "Archived · read-only" badge instead of the actions.
 */
export async function ProjectActions({ board }: { board: TeamBoard }) {
  const viewer = await getTeamViewer();
  if (board.project.status === "closed") {
    return (
      <span className="flex min-h-11 items-center gap-2 rounded-md border border-border-default bg-bg-primary px-md text-[13px] font-medium text-text-muted">
        <Archive aria-hidden strokeWidth={ICON_STROKE} className="size-4" />
        {manageProjectCopy.archivedBadge}
      </span>
    );
  }
  return (
    <>
      <Button asChild variant="ghost">
        <Link href={`/team/projects/${board.project.publicId}/preview`}>
          {previewCopy.viewAsClient}
        </Link>
      </Button>
      <PostUpdateLauncher
        copy={teamUpdatesCopy}
        projectId={board.project.id}
        clientName={board.project.clientName}
        authorName={viewer.status === "signed_in" ? viewer.name : "NortBrand"}
        tickets={board.tickets.map(({ id, title }) => ({ id, title }))}
        variant="secondary"
        label={teamUpdatesCopy.postUpdate}
      />
      <Button asChild>
        <Link
          href={`/team/projects/${board.project.publicId}/board?ticket=new`}
          scroll={false}
        >
          <Plus aria-hidden strokeWidth={ICON_STROKE} className="size-4" />
          {boardCopy.newTicket}
        </Link>
      </Button>
    </>
  );
}
