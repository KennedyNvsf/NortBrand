import { ChevronRight, Plus } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { ICON_STROKE } from "@/lib/icons";

import { fill } from "../../../auth/components/copy";
import { ProgressRing } from "../../../overview/components/progress-ring";
import { StageTrack } from "../../../overview/components/stage-track";
import { Avatar, StatusPill } from "../../../overview/components/status";
import {
  currentStage,
  daysUntil,
  lisbonToday,
  stageElapsed,
  stageState,
  type TicketStatus,
} from "../../../overview/domain";
import {
  formatDate,
  formatDay,
  formatRange,
  formatUpdateTime,
} from "../../../overview/format";
import { initials } from "../../../shell/initials";
import { ProjectHeader } from "../../board/components/project-header";
import type { TeamOverviewCopy, TeamProjectCopy } from "../../copy";
import type { TeamPlan } from "../data";
import {
  attentionItems,
  clientProgress,
  teamProgress,
  type PlanTicket,
} from "../plan";

/*
 * The team's project overview (#138; Figma TM-07). Server-rendered under RLS: what
 * needs attention, progress (every ticket for the team; the client's figure beside it),
 * the current stage, this week, the launch, the stage track, open work in the current
 * stage and the latest updates. KPIs go 4 → 2 × 2 → stacked (Portal · Responsive rules).
 * Motion: the stage track and the ring play once a session (their own components),
 * keyed apart from the client portal's.
 */

export function toPlanTickets(plan: TeamPlan): PlanTicket[] {
  return plan.tickets.map((ticket) => ({
    id: ticket.id,
    number: ticket.number,
    title: ticket.title,
    status: ticket.status,
    stageId: ticket.stageId,
    dueOn: ticket.dueOn,
    clientVisible: ticket.clientVisible,
    waitingOnClient: ticket.waitingOnClient,
    changedAt: ticket.version,
  }));
}

const URGENCY: Record<TicketStatus, number> = {
  blocked: 0,
  in_review: 1,
  in_progress: 2,
  todo: 3,
  done: 4,
};

export function TeamOverview({
  plan,
  copy,
  headerCopy,
  now,
}: {
  plan: TeamPlan;
  copy: TeamOverviewCopy;
  headerCopy: TeamProjectCopy;
  now: Date;
}) {
  const today = lisbonToday(now);
  const tickets = toPlanTickets(plan);
  const team = teamProgress(tickets);
  const client = clientProgress(tickets);
  const current = currentStage(plan.stages);
  const ordered = [...plan.stages].sort((a, b) => a.position - b.position);
  const position = current
    ? ordered.findIndex((stage) => stage.id === current.id) + 1
    : 0;
  const attention = attentionItems(tickets, plan.clients, today);
  const boardHref = `/team/projects/${plan.project.publicId}/board`;
  const ticketHref = (number: number) =>
    `${boardHref}?ticket=${String(number)}`;
  const days = daysUntil(plan.project.launchesOn, today);
  const count = (status: TicketStatus) =>
    tickets.filter((ticket) => ticket.status === status).length;
  const working = tickets
    .filter(
      (ticket) => ticket.status !== "done" && ticket.stageId === current?.id,
    )
    .sort(
      (a, b) =>
        URGENCY[a.status] - URGENCY[b.status] ||
        (a.dueOn ?? "9").localeCompare(b.dueOn ?? "9"),
    )
    .slice(0, 6);
  const ownerOf = (id: string) =>
    plan.tickets.find((ticket) => ticket.id === id)?.ownerName ?? null;
  const stageName = (id: string) =>
    plan.stages.find((stage) => stage.id === id)?.name ?? "";

  const elapsed = current ? stageElapsed(current, today) : 0;

  const card =
    "flex flex-col gap-3 rounded-lg border border-border-default bg-bg-surface p-lg";

  return (
    <div className="flex flex-col gap-lg">
      <ProjectHeader
        board={plan}
        current="overview"
        copy={headerCopy}
        actions={
          <Button asChild>
            <Link href={`${boardHref}?ticket=new`}>
              <Plus aria-hidden strokeWidth={ICON_STROKE} className="size-4" />
              {copy.newTicket}
            </Link>
          </Button>
        }
      />

      {attention.length > 0 ? (
        <section
          aria-labelledby="needs-attention"
          className="rounded-lg border border-action-primary bg-bg-surface p-lg"
        >
          <h2 id="needs-attention" className="text-label text-text-primary">
            {copy.attentionTitle}
          </h2>
          <ul className="mt-3 flex flex-col divide-y divide-border-default border-t border-border-default">
            {attention.map((item) => (
              <li
                key={`${item.kind}-${item.kind === "not_signed_in" ? item.name : String(item.ticketNumber)}`}
                className="flex flex-col gap-1 py-3 md:flex-row md:items-center md:gap-md"
              >
                <p className="flex flex-1 items-start gap-2.5 text-[15px] text-text-primary">
                  <span
                    aria-hidden
                    className="mt-1.5 size-2 shrink-0 rounded-[2px] bg-action-primary"
                  />
                  {item.kind === "blocked"
                    ? item.days === 0
                      ? fill(copy.attention.blockedToday, { title: item.title })
                      : fill(
                          item.days === 1
                            ? copy.attention.blockedOne
                            : copy.attention.blockedMany,
                          { title: item.title, days: item.days },
                        )
                    : item.kind === "in_review"
                      ? fill(copy.attention.inReview, {
                          title: item.title,
                          days: item.days,
                        })
                      : fill(copy.attention.notSignedIn, {
                          name: item.name,
                          date: formatDay(item.invitedOn, "en"),
                        })}
                </p>
                {item.kind !== "not_signed_in" ? (
                  <Link
                    href={ticketHref(item.ticketNumber)}
                    className="min-h-11 content-center text-[14px] font-medium text-text-accent hover:underline md:min-h-0"
                  >
                    {copy.openTicket}
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="xl:grid-cols-4 grid gap-md md:grid-cols-2">
        <section className={card} aria-labelledby="kpi-progress">
          <h2 id="kpi-progress" className="text-[14px] text-text-muted">
            {copy.overallProgress}
          </h2>
          <div className="flex items-center gap-md">
            <ProgressRing
              percent={team.percent}
              projectId={`team-${plan.project.publicId}`}
              label={fill(copy.progressLabel, { percent: team.percent })}
            />
            <div className="flex flex-col gap-1">
              <p className="text-[13px] text-text-muted">
                {fill(copy.progressDone, {
                  done: team.done,
                  total: team.total,
                })}
              </p>
            </div>
          </div>
          <p className="text-[12px] text-text-muted">
            {fill(copy.clientSees, {
              done: client.done,
              total: client.total,
              percent: client.percent,
            })}
          </p>
        </section>
        <section className={card} aria-labelledby="kpi-stage">
          <h2 id="kpi-stage" className="text-[14px] text-text-muted">
            {copy.currentStage}
          </h2>
          <p className="text-[22px] font-bold text-text-primary">
            {current?.name ?? copy.noStages}
          </p>
          {current ? (
            <>
              <p className="text-[13px] text-text-muted">
                {fill(copy.stageOf, {
                  position,
                  total: ordered.length,
                  date: formatDay(current.startsOn, "en"),
                })}
              </p>
              <span
                aria-hidden
                className="block h-1.5 overflow-hidden rounded-[3px] bg-border-default"
              >
                <span
                  className="block h-full bg-text-primary"
                  style={{ width: `${String(Math.round(elapsed * 100))}%` }}
                />
              </span>
            </>
          ) : null}
        </section>
        <section className={card} aria-labelledby="kpi-week">
          <h2 id="kpi-week" className="text-[14px] text-text-muted">
            {copy.thisWeek}
          </h2>
          <ul className="flex flex-col gap-2">
            {(["in_progress", "in_review", "blocked"] as const).map(
              (status) => {
                const n = count(status);
                return (
                  <li key={status} className="flex items-center gap-3">
                    <StatusPill status={status} label={copy.statuses[status]} />
                    <span className="text-[13px] text-text-muted">
                      {n === 1
                        ? copy.weekOne
                        : fill(copy.weekMany, { count: n })}
                    </span>
                  </li>
                );
              },
            )}
          </ul>
        </section>
        <section className={card} aria-labelledby="kpi-launch">
          <h2 id="kpi-launch" className="text-[14px] text-text-muted">
            {copy.launch}
          </h2>
          <p className="text-[22px] font-bold text-text-primary">
            {formatDate(plan.project.launchesOn, "en")}
          </p>
          <p className="text-[13px] text-text-muted">
            {days < 0
              ? copy.launched
              : days === 1
                ? copy.daysToGoOne
                : fill(copy.daysToGoMany, { days })}
          </p>
        </section>
      </div>

      {ordered.length > 0 ? (
        <section className={card} aria-labelledby="project-stages">
          <div className="flex items-center justify-between gap-md">
            <h2 id="project-stages" className="text-h4 text-text-primary">
              {copy.stagesTitle}
            </h2>
            <Link
              href={`/team/projects/${plan.project.publicId}/timeline`}
              className="min-h-11 content-center text-[14px] font-medium text-text-accent hover:underline md:min-h-0"
            >
              {copy.viewTimeline}
            </Link>
          </div>
          <StageTrack
            projectId={`team-${plan.project.publicId}`}
            labels={copy.stageLabels}
            stages={ordered.map((stage) => ({
              id: stage.id,
              name: stage.name,
              range: formatRange(stage.startsOn, stage.endsOn, "en", copy.from),
              state: stageState(stage, current),
            }))}
          />
        </section>
      ) : null}

      <div className="grid gap-md lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className={card} aria-labelledby="working-on">
          <div className="flex items-start justify-between gap-md">
            <div className="flex flex-col gap-1">
              <h2 id="working-on" className="text-h4 text-text-primary">
                {copy.workingTitle}
              </h2>
              <p className="text-[13px] text-text-muted">{copy.workingIntro}</p>
            </div>
            <Link
              href={boardHref}
              className="min-h-11 shrink-0 content-center text-[14px] font-medium text-text-accent hover:underline md:min-h-0"
            >
              {copy.viewBoard}
            </Link>
          </div>
          {working.length === 0 ? (
            <p className="text-small text-text-muted">{copy.workingEmpty}</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border-default border-t border-border-default">
              {working.map((ticket) => {
                const owner = ownerOf(ticket.id);
                return (
                  <li key={ticket.id}>
                    <Link
                      href={ticketHref(ticket.number)}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-md gap-y-1 py-3 hover:bg-bg-primary md:grid-cols-[minmax(0,1fr)_150px_100px_auto_auto]"
                    >
                      <span className="flex min-w-0 flex-col">
                        <span className="text-[14px] font-medium text-text-primary">
                          {ticket.title}
                        </span>
                        <span
                          className={
                            ticket.waitingOnClient
                              ? "text-[12px] text-text-error"
                              : "text-[12px] text-text-muted"
                          }
                        >
                          {stageName(ticket.stageId)}
                        </span>
                      </span>
                      <span className="hidden items-center gap-2 text-[13px] text-text-primary md:flex">
                        {owner ? (
                          <>
                            <Avatar
                              initials={initials(owner)}
                              className="size-6 text-[10px]"
                            />
                            {owner}
                          </>
                        ) : null}
                      </span>
                      <span className="hidden text-[13px] text-text-muted md:block">
                        {ticket.dueOn
                          ? fill(copy.due, {
                              date: formatDay(ticket.dueOn, "en"),
                            })
                          : ""}
                      </span>
                      <StatusPill
                        status={ticket.status}
                        label={copy.statuses[ticket.status]}
                      />
                      <ChevronRight
                        aria-hidden
                        strokeWidth={ICON_STROKE}
                        className="hidden size-4 text-text-muted md:block"
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className={card} aria-labelledby="latest-updates">
          <h2 id="latest-updates" className="text-h4 text-text-primary">
            {copy.updatesTitle}
          </h2>
          {plan.updates.length === 0 ? (
            <p className="text-small text-text-muted">{copy.updatesEmpty}</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border-default">
              {plan.updates.map((update) => {
                const author = update.authorName ?? copy.team;
                return (
                  <li key={update.id} className="flex gap-3 py-3 first:pt-0">
                    <Avatar initials={initials(author)} />
                    <div className="flex min-w-0 flex-col gap-1">
                      <p className="text-[14px] whitespace-pre-line text-text-primary">
                        {update.body}
                      </p>
                      <p className="text-[12px] text-text-muted">
                        {author} ·{" "}
                        {formatUpdateTime(update.createdAt, now, "en", {
                          today: "Today",
                          yesterday: "Yesterday",
                        })}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
