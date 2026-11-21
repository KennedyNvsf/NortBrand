import * as Sentry from "@sentry/nextjs";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

import { fill } from "@/features/portal/auth/components/copy";
import { lisbonToday } from "@/features/portal/overview/domain";
import { EmptyState } from "@/features/portal/states/empty-state";
import { PageSkeleton } from "@/features/portal/states/skeletons";
import { getTeamViewer } from "@/features/portal/team/access";
import { teamPagesCopy, teamShellCopy } from "@/features/portal/team/copy";
import { MyTicketsView } from "@/features/portal/team/my-tickets/components/my-tickets-view";
import { getMyTickets } from "@/features/portal/team/my-tickets/data";
import { summarize } from "@/features/portal/team/my-tickets/my-tickets";

/*
 * My tickets (#142; Figma TM-11, TM-M05): the viewer's open tickets across their
 * projects, by due date. Dynamic and per user (ADR-009); RLS scopes the projects.
 */

export const metadata: Metadata = { title: teamPagesCopy.myTickets.title };

type Props = PageProps<"/team/my-tickets">;

export default function MyTicketsPage({ searchParams }: Props) {
  return (
    <Suspense fallback={<PageSkeleton label={teamShellCopy.loading} />}>
      <MyTicketsContent searchParams={searchParams} />
    </Suspense>
  );
}

async function MyTicketsContent({ searchParams }: Pick<Props, "searchParams">) {
  await connection();
  const copy = teamPagesCopy.myTickets;
  const viewer = await getTeamViewer();
  if (viewer.status !== "signed_in") return null;
  const showAll = (await searchParams).all === "1";

  let tickets;
  try {
    tickets = await getMyTickets(viewer.userId);
  } catch (error) {
    Sentry.captureException(error, { tags: { feature: "portal-my-tickets" } });
    return (
      <div className="flex flex-col gap-lg">
        <h1 className="text-h3 text-text-primary">{copy.title}</h1>
        <p role="alert" className="text-body text-text-muted">
          {copy.loadFailed}
        </p>
      </div>
    );
  }

  const today = lisbonToday(new Date());
  const counts = summarize(tickets, today);
  const projects =
    counts.projects === 1
      ? copy.projectOne
      : fill(copy.projectMany, { count: counts.projects });

  return (
    <div className="flex flex-col gap-lg">
      <div className="flex flex-col gap-1">
        <h1 className="text-h3 text-text-primary">{copy.title}</h1>
        {tickets.length > 0 ? (
          <p className="text-body text-text-muted">
            <span className="hidden md:inline">
              {fill(copy.summary, {
                open: counts.open,
                projects,
                overdue: counts.overdue,
                week: counts.thisWeek,
              })}
            </span>
            <span className="md:hidden">
              {fill(copy.summaryShort, {
                open: counts.open,
                overdue: counts.overdue,
                week: counts.thisWeek,
              })}
            </span>
          </p>
        ) : null}
      </div>
      {tickets.length === 0 ? (
        <EmptyState title={copy.emptyTitle} body={copy.emptyBody} />
      ) : (
        <MyTicketsView
          copy={copy}
          tickets={tickets}
          today={today}
          showAll={showAll}
        />
      )}
    </div>
  );
}
