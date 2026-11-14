import * as Sentry from "@sentry/nextjs";
import { ChevronRight, Square } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { connection } from "next/server";

import { Button } from "@/components/ui/button";
import { ICON_STROKE } from "@/lib/icons";
import { cn } from "@/lib/utils";

import { initials } from "../../shell/client-data";
import { getProjectView, type ProjectView } from "../data";
import {
  currentStage,
  daysUntil,
  lisbonToday,
  progress,
  stageElapsed,
  stageState,
  weekSummary,
  workingOn,
} from "../domain";
import {
  formatDate,
  formatDay,
  formatRange,
  formatToday,
  formatUpdateTime,
  type PortalLocale,
} from "../format";
import { LoadFailed } from "./load-failed";
import { ProgressRing } from "./progress-ring";
import { StageTrack } from "./stage-track";
import { Avatar, HealthBadge, StatusPill } from "./status";

/*
 * The client overview (#134; Figma CP-03 519:51, CP-T03 557:576, CP-M03 554:371).
 * Server-rendered under RLS (no client fetching). KPIs: 4 across → 2 × 2 → stacked, with
 * a "Waiting on you" card on mobile. Only the ring and the stage track are client
 * components (their once-a-session motion).
 */

function Card({
  className,
  labelledBy,
  children,
}: {
  className?: string;
  /** The id of the card's heading: names the section as a landmark region. */
  labelledBy?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby={labelledBy}
      className={cn(
        "flex flex-col gap-3 rounded-lg border border-border-default bg-bg-surface p-lg",
        className,
      )}
    >
      {children}
    </section>
  );
}

export async function OverviewView({
  publicId,
  locale,
}: {
  publicId: string;
  locale: PortalLocale;
}) {
  await connection();
  let view: ProjectView | null;
  try {
    view = await getProjectView(publicId);
  } catch (error) {
    Sentry.captureException(error, { tags: { feature: "portal-overview" } });
    return <LoadFailed locale={locale} />;
  }
  if (!view) return null;

  const [t, status, health] = await Promise.all([
    getTranslations("Portal.overview"),
    getTranslations("Portal.status"),
    getTranslations("Portal.health"),
  ]);

  const now = new Date();
  const today = lisbonToday(now);
  const base = `/${locale}/portal/${view.publicId}`;
  const stage = currentStage(view.stages);
  const stageIndex = stage
    ? view.stages.findIndex((s) => s.id === stage.id) + 1
    : 0;
  const totals = progress(view.tickets);
  const week = weekSummary(view.tickets);
  const days = daysUntil(view.launchesOn, today);
  const working = workingOn(view.tickets, stage?.id ?? null);
  const waiting = view.tickets.find(
    (ticket) => ticket.waitingOnClient && ticket.status !== "done",
  );
  const updates = view.updates.slice(0, 4);
  const updateLabels = { today: t("today"), yesterday: t("yesterday") };
  const launch = formatDate(view.launchesOn, locale);
  const taskHref = (number: number) => `${base}/tasks?task=${String(number)}`;

  const summaryValues = {
    current: stageIndex,
    total: view.stages.length,
    stage: stage?.name ?? "",
    done: totals.done,
    tasks: totals.total,
    launch,
  };

  return (
    <div className="flex flex-col gap-lg">
      <header className="flex flex-col gap-md md:flex-row md:items-end md:justify-between">
        <div className="flex min-w-0 flex-col gap-2">
          <p className="text-[12px] font-medium tracking-[0.08em] text-text-muted uppercase">
            {formatToday(now, locale)}
          </p>
          <div className="flex flex-col items-start gap-2 md:flex-row md:flex-wrap md:items-center md:gap-3">
            <h1 className="text-h3 text-text-primary">{view.name}</h1>
            <HealthBadge health={view.health} label={health(view.health)} />
          </div>
          <p className="text-[15px] text-text-muted">
            <span className="md:hidden">
              {t("summaryShort", summaryValues)}
            </span>
            <span className="hidden md:inline">
              {t("summary", summaryValues)}
            </span>
          </p>
        </div>
        {view.stagingUrl ? (
          <Button
            asChild
            variant="secondary"
            showIcon
            className="hidden shrink-0 md:inline-flex"
          >
            <a href={view.stagingUrl} target="_blank" rel="noopener noreferrer">
              {t("staging")}
            </a>
          </Button>
        ) : null}
      </header>

      <div className="grid gap-md md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <h2 className="text-small text-text-muted">{t("progressTitle")}</h2>
          <ProgressRing
            percent={totals.percent}
            projectId={view.publicId}
            label={t("progressLabel", { percent: totals.percent })}
          />
          <p className="text-[13px] text-text-muted">
            {t("progressDone", { done: totals.done, total: totals.total })}
          </p>
        </Card>

        {waiting ? (
          <section className="flex flex-col gap-1 rounded-lg bg-action-primary-subtle p-lg md:hidden">
            <h2 className="flex items-center gap-2 text-label text-text-error">
              <Square
                aria-hidden
                strokeWidth={ICON_STROKE}
                className="size-3.5 fill-current"
              />
              {t("waitingTitle")}
            </h2>
            <Link
              href={taskHref(waiting.number)}
              className="flex min-h-11 items-center text-small text-text-error underline-offset-2 hover:underline"
            >
              {t("waitingBodyNoOwner", { task: waiting.title })}
            </Link>
          </section>
        ) : null}

        {stage ? (
          <Card className="hidden md:flex">
            <h2 className="text-small text-text-muted">{t("stageTitle")}</h2>
            <p className="text-h4 text-text-primary">{stage.name}</p>
            <p className="text-[13px] text-text-muted">
              {t("stageMeta", {
                current: stageIndex,
                total: view.stages.length,
                since: formatDay(stage.startsOn, locale),
              })}
            </p>
            <span
              aria-hidden
              className="h-1.5 w-full overflow-hidden rounded-full bg-bg-primary"
            >
              <span
                className="block h-full rounded-full bg-text-primary"
                style={{
                  width: `${String(Math.round(stageElapsed(stage, today) * 100))}%`,
                }}
              />
            </span>
          </Card>
        ) : null}

        <Card className="hidden md:flex">
          <h2 className="text-small text-text-muted">{t("weekTitle")}</h2>
          <ul className="flex flex-col gap-2">
            {(
              [
                ["in_progress", week.inProgress],
                ["in_review", week.inReview],
                ["blocked", week.blocked],
              ] as const
            ).map(([key, count]) => (
              <li key={key} className="flex items-center gap-3">
                <StatusPill status={key} label={status(key)} />
                <span className="text-[13px] text-text-muted">
                  {t("weekTasks", { count })}
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="hidden md:flex">
          <h2 className="text-small text-text-muted">{t("launchTitle")}</h2>
          <p className="text-h4 text-text-primary">{launch}</p>
          <p className="text-[13px] text-text-muted">
            {days > 0
              ? t("launchDays", { days })
              : days === 0
                ? t("launchToday")
                : t("launched")}
          </p>
        </Card>
      </div>

      {view.stages.length > 0 ? (
        <Card className="gap-lg">
          <div className="flex items-center justify-between gap-md">
            <h2 className="text-label text-text-primary">{t("stagesTitle")}</h2>
            <Link
              href={`${base}/timeline`}
              className="touch-target text-small font-medium text-action-primary-hover underline-offset-2 hover:underline"
            >
              <span className="md:hidden">{t("timelineShort")}</span>
              <span className="hidden md:inline">{t("viewTimeline")}</span>
            </Link>
          </div>
          <div className="md:pt-6">
            <StageTrack
              projectId={view.publicId}
              labels={{
                now: t("now"),
                done: status("done"),
                current: t("now"),
                upcoming: status("todo"),
              }}
              stages={view.stages.map((s) => ({
                id: s.id,
                name: s.name,
                range: formatRange(s.startsOn, s.endsOn, locale, t("from")),
                state: stageState(s, stage),
              }))}
            />
          </div>
        </Card>
      ) : null}

      <div className="grid gap-md lg:grid-cols-[minmax(0,1fr)_256px]">
        <Card labelledBy="overview-working">
          <div className="flex items-start justify-between gap-md">
            <div className="flex flex-col gap-1">
              <h2
                id="overview-working"
                className="text-label text-text-primary"
              >
                {t("workingTitle")}
              </h2>
              <p className="hidden text-[13px] text-text-muted md:block">
                {t("workingIntro")}
              </p>
            </div>
            <Link
              href={`${base}/tasks`}
              className="touch-target shrink-0 text-small font-medium text-action-primary-hover underline-offset-2 hover:underline"
            >
              <span className="md:hidden">{t("allShort")}</span>
              <span className="hidden md:inline">{t("viewAllTasks")}</span>
            </Link>
          </div>
          {working.length === 0 ? (
            <p className="text-small text-text-muted">{t("workingEmpty")}</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border-default">
              {working.map((ticket) => (
                <li key={ticket.id}>
                  <Link
                    href={taskHref(ticket.number)}
                    className="flex min-h-11 items-center gap-3 py-3 hover:bg-bg-primary/60 md:gap-md"
                  >
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="text-[14px] font-medium text-text-primary">
                        {ticket.title}
                      </span>
                      <span
                        className={cn(
                          "text-[12px]",
                          ticket.waitingOnClient
                            ? "text-text-error"
                            : "text-text-muted",
                        )}
                      >
                        {ticket.waitingOnClient
                          ? t("waitingOnYou")
                          : (stage?.name ?? "")}
                      </span>
                      <span className="flex flex-wrap items-center gap-2 md:hidden">
                        <StatusPill
                          status={ticket.status}
                          label={status(ticket.status)}
                        />
                        {ticket.dueOn ? (
                          <span className="text-[12px] text-text-muted">
                            {t("due", { day: formatDay(ticket.dueOn, locale) })}
                          </span>
                        ) : null}
                      </span>
                    </span>
                    {ticket.ownerName ? (
                      <span className="hidden w-32 items-center gap-2 md:flex">
                        <Avatar initials={initials(ticket.ownerName)} />
                        <span className="truncate text-[13px] text-text-primary">
                          {ticket.ownerName}
                        </span>
                      </span>
                    ) : null}
                    <span className="hidden w-24 text-[13px] text-text-muted md:block">
                      {ticket.dueOn
                        ? t("due", { day: formatDay(ticket.dueOn, locale) })
                        : ""}
                    </span>
                    <StatusPill
                      status={ticket.status}
                      label={status(ticket.status)}
                      className="hidden md:inline-flex"
                    />
                    <ChevronRight
                      aria-hidden
                      strokeWidth={ICON_STROKE}
                      className="size-4 shrink-0 text-text-primary"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-md">
            <h2 className="text-label text-text-primary">
              <span className="md:hidden">{t("updateTitle")}</span>
              <span className="hidden md:inline">{t("updatesTitle")}</span>
            </h2>
            <Link
              href={`${base}/updates`}
              className="touch-target text-small font-medium text-action-primary-hover underline-offset-2 hover:underline"
            >
              <span className="md:hidden">{t("allUpdates")}</span>
              <span className="hidden md:inline">{t("viewAll")}</span>
            </Link>
          </div>
          {updates.length === 0 ? (
            <p className="text-small text-text-muted">{t("updatesEmpty")}</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border-default">
              {updates.map((update, index) => {
                const author = update.authorName ?? t("team");
                return (
                  <li
                    key={update.id}
                    className={cn(
                      "flex gap-3 py-3",
                      index > 0 && "hidden md:flex",
                    )}
                  >
                    <Avatar
                      initials={initials(author)}
                      className="hidden md:grid"
                    />
                    <div className="flex min-w-0 flex-col gap-1">
                      <p className="text-[14px] text-text-primary">
                        {update.body}
                      </p>
                      <p className="text-[12px] text-text-muted">
                        {author} ·{" "}
                        {formatUpdateTime(
                          update.createdAt,
                          now,
                          locale,
                          updateLabels,
                        )}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
