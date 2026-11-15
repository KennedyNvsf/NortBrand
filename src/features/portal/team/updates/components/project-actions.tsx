import { Plus } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { ICON_STROKE } from "@/lib/icons";

import { getTeamViewer } from "../../access";
import type { TeamBoard } from "../../board/data";
import { boardCopy, teamUpdatesCopy } from "../../copy";
import { PostUpdateLauncher } from "./post-update-launcher";

/*
 * The project header's actions on every team project page (Figma TM-02, TM-05, TM-07,
 * TM-10): "Post update" (#139) and "New ticket" (#137). Server component; the dialog it
 * opens is client code loaded on demand.
 */
export async function ProjectActions({ board }: { board: TeamBoard }) {
  const viewer = await getTeamViewer();
  return (
    <>
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
