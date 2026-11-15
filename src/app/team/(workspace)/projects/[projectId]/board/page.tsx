import * as Sentry from "@sentry/nextjs";
import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import { fill } from "@/features/portal/auth/components/copy";
import { parseBoardFilters } from "@/features/portal/team/board/board";
import { BoardView } from "@/features/portal/team/board/components/board-view";
import { ProjectHeader } from "@/features/portal/team/board/components/project-header";
import { TicketEditor } from "@/features/portal/team/board/components/ticket-editor";
import type { EditableTicket } from "@/features/portal/team/board/conflict";
import {
  getEditableTicket,
  getTeamBoard,
  type TeamBoard,
} from "@/features/portal/team/board/data";
import {
  boardCopy,
  teamProjectCopy,
  teamShellCopy,
  ticketEditorCopy,
} from "@/features/portal/team/copy";
import { PageSkeleton } from "@/features/portal/states/skeletons";
import { ProjectActions } from "@/features/portal/team/updates/components/project-actions";
import { ICON_STROKE } from "@/lib/icons";
import { cn } from "@/lib/utils";

/*
 * A project's board (#137; Figma TM-02). Dynamic and per user (ADR-009): RLS shows the
 * project only to its team, and a project the viewer can't see is a plain 404. Filters
 * and the open ticket are URL state (?stage=, ?owner=, ?status=, ?ticket=N | new).
 */

export const metadata: Metadata = { title: boardCopy.metaTitle };

type Props = PageProps<"/team/projects/[projectId]/board">;

export default function BoardPage({ params, searchParams }: Props) {
  return (
    <Suspense fallback={<PageSkeleton label={teamShellCopy.loading} />}>
      <BoardContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

async function BoardContent({ params, searchParams }: Props) {
  await connection();
  const { projectId } = await params;
  const search = await searchParams;

  let board: TeamBoard | null;
  try {
    board = await getTeamBoard(projectId);
  } catch (error) {
    Sentry.captureException(error, { tags: { feature: "portal-team-board" } });
    return (
      <p role="alert" className="text-body text-text-muted">
        {boardCopy.loadFailed}
      </p>
    );
  }
  if (!board) notFound();

  const filters = parseBoardFilters(search, {
    stageIds: board.stages.map((stage) => stage.id),
    ownerIds: board.team.map((person) => person.userId),
  });
  const basePath = `/team/projects/${board.project.publicId}/board`;
  const keep = new URLSearchParams();
  for (const key of ["stage", "owner", "status"] as const) {
    const value = one(search[key]);
    if (value) keep.set(key, value);
  }
  const closeHref = keep.size > 0 ? `${basePath}?${keep.toString()}` : basePath;
  keep.set("ticket", "new");
  const newHref = `${basePath}?${keep.toString()}`;

  const requested = one(search.ticket);
  let editing: { ticket: EditableTicket; eyebrow: string } | null = null;
  let missing = false;
  if (requested === "new") {
    const current =
      board.stages.find((stage) => !stage.completed) ?? board.stages[0];
    if (current) {
      editing = {
        ticket: {
          id: null,
          number: null,
          title: "",
          description: "",
          status: "todo",
          stageId: filters.stage ?? current.id,
          ownerId: null,
          dueOn: null,
          clientVisible: true,
          checklist: [],
          version: null,
        },
        eyebrow: fill(ticketEditorCopy.newEyebrow, {
          project: board.project.clientName,
        }),
      };
    }
  } else if (requested && /^\d{1,6}$/.test(requested)) {
    const found = await getEditableTicket(board.project.id, {
      number: Number(requested),
    });
    if (found) {
      editing = {
        ticket: found.ticket,
        eyebrow: fill(ticketEditorCopy.editEyebrow, {
          ref: `${board.project.publicId}-${String(found.ticket.number)}`,
        }),
      };
    } else {
      missing = true;
    }
  }

  const newTicket = (
    <Button asChild>
      <Link href={newHref} scroll={false}>
        <Plus aria-hidden strokeWidth={ICON_STROKE} className="size-4" />
        {boardCopy.newTicket}
      </Link>
    </Button>
  );

  return (
    <div
      className={cn(
        "grid gap-lg",
        editing && "lg:grid-cols-[minmax(0,1fr)_440px] lg:gap-0",
      )}
    >
      <div
        className={cn("flex min-w-0 flex-col gap-lg", editing && "lg:pr-lg")}
      >
        <ProjectHeader
          board={board}
          current="board"
          copy={teamProjectCopy}
          actions={<ProjectActions board={board} />}
        />
        {missing ? (
          <p role="status" className="text-small text-text-muted">
            {boardCopy.notFound}
          </p>
        ) : null}
        <BoardView
          copy={boardCopy}
          projectId={board.project.id}
          tickets={board.tickets}
          stages={board.stages}
          team={board.team}
          filters={filters}
          basePath={basePath}
        />
        {/* Mobile: the action sits under the board (TM-M02). */}
        <div className="md:hidden [&>a]:w-full">{newTicket}</div>
      </div>
      {editing ? (
        <TicketEditor
          key={`${editing.ticket.id ?? "new"}-${editing.ticket.version ?? ""}`}
          copy={ticketEditorCopy}
          statuses={boardCopy.statuses}
          initial={editing.ticket}
          projectId={board.project.id}
          eyebrow={editing.eyebrow}
          clientName={board.project.clientName}
          stages={board.stages}
          team={board.team}
          closeHref={closeHref}
        />
      ) : null}
    </div>
  );
}
