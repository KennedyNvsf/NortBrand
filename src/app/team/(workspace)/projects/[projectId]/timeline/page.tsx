import * as Sentry from "@sentry/nextjs";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { fill } from "@/features/portal/auth/components/copy";
import {
  currentStage,
  lisbonToday,
  stageState,
} from "@/features/portal/overview/domain";
import { formatDay } from "@/features/portal/overview/format";
import { ProjectHeader } from "@/features/portal/team/board/components/project-header";
import {
  boardCopy,
  teamProjectCopy,
  teamShellCopy,
  timelineCopy,
} from "@/features/portal/team/copy";
import {
  HealthControl,
  LaunchControl,
} from "@/features/portal/team/plan/components/plan-controls";
import { StageTable } from "@/features/portal/team/plan/components/stage-table";
import { toPlanTickets } from "@/features/portal/team/plan/components/team-overview";
import { getTeamPlan, type TeamPlan } from "@/features/portal/team/plan/data";
import {
  clientProgress,
  completionPlan,
  stageProgress,
  suggestHealth,
  type HealthSuggestion,
} from "@/features/portal/team/plan/plan";
import { PageSkeleton } from "@/features/portal/states/skeletons";
import { ProjectActions } from "@/features/portal/team/updates/components/project-actions";

/*
 * Timeline · manage stages for the team (#138; Figma TM-05, TM-05b). Health with a
 * suggestion, the launch target, and the stages: dates, Reopen, Complete stage. Dynamic
 * and per user (ADR-009).
 */

export const metadata: Metadata = { title: timelineCopy.metaTitle };

type Props = PageProps<"/team/projects/[projectId]/timeline">;

export default function TimelinePage({ params }: Props) {
  return (
    <Suspense fallback={<PageSkeleton label={teamShellCopy.loading} />}>
      <TimelineContent params={params} />
    </Suspense>
  );
}

function suggestionText(suggestion: HealthSuggestion): string {
  const text = timelineCopy.suggested;
  switch (suggestion.reason) {
    case "blocked_on_client":
      return suggestion.count === 1
        ? text.blocked_on_client_one
        : fill(text.blocked_on_client_many, { count: suggestion.count });
    case "overdue":
      return suggestion.count === 1
        ? text.overdue_one
        : fill(text.overdue_many, { count: suggestion.count });
    case "stage_late":
      return fill(text.stage_late, {
        stage: suggestion.stage,
        date: formatDay(suggestion.endsOn, "en"),
      });
    default:
      return text.on_track;
  }
}

async function TimelineContent({ params }: Pick<Props, "params">) {
  await connection();
  const { projectId } = await params;
  let plan: TeamPlan | null;
  try {
    plan = await getTeamPlan(projectId);
  } catch (error) {
    Sentry.captureException(error, {
      tags: { feature: "portal-team-timeline" },
    });
    return (
      <p role="alert" className="text-body text-text-muted">
        {boardCopy.loadFailed}
      </p>
    );
  }
  if (!plan) notFound();

  const today = lisbonToday(new Date());
  const tickets = toPlanTickets(plan);
  const current = currentStage(plan.stages);
  const ordered = [...plan.stages].sort((a, b) => a.position - b.position);
  const client = clientProgress(tickets);

  return (
    <div className="flex flex-col gap-lg">
      <ProjectHeader
        board={plan}
        current="timeline"
        copy={teamProjectCopy}
        actions={<ProjectActions board={plan} />}
      />
      <div className="grid gap-md lg:grid-cols-[minmax(0,1fr)_360px]">
        <HealthControl
          copy={timelineCopy}
          projectId={plan.project.id}
          current={plan.project.health}
          labels={teamProjectCopy.health}
          suggestion={suggestionText(suggestHealth(tickets, current, today))}
        />
        <LaunchControl
          copy={timelineCopy}
          projectId={plan.project.id}
          current={plan.project.launchesOn}
        />
      </div>
      <StageTable
        copy={timelineCopy}
        projectId={plan.project.id}
        clientName={plan.project.clientName}
        clientEmail={plan.project.clientEmail}
        footer={fill(timelineCopy.footer, {
          done: client.done,
          total: client.total,
          percent: client.percent,
        })}
        rows={ordered.map((stage, index) => {
          const progress = stageProgress(tickets, stage.id);
          const completion = completionPlan(
            plan.stages,
            tickets,
            stage.id,
            today,
          );
          return {
            id: stage.id,
            name: stage.name,
            startsOn: stage.startsOn,
            endsOn: stage.endsOn,
            state: stageState(stage, current),
            done: progress.done,
            total: progress.total,
            open: completion?.open ?? progress.total - progress.done,
            nextName: ordered[index + 1]?.name ?? null,
            early: completion?.early ?? false,
          };
        })}
      />
    </div>
  );
}
