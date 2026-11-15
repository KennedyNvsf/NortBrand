import * as Sentry from "@sentry/nextjs";
import { ChevronDown, ChevronRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { connection } from "next/server";

import { ICON_STROKE } from "@/lib/icons";
import { cn } from "@/lib/utils";

import { initials } from "../../shell/initials";
import { getProjectView, type ProjectView } from "../data";
import {
  currentStage,
  filterByStatus,
  groupByStage,
  lisbonToday,
  parseStatusFilter,
  STATUS_FILTERS,
  statusCounts,
  type StatusFilter,
} from "../domain";
import { formatDay, formatRange, type PortalLocale } from "../format";
import { LoadFailed } from "./load-failed";
import { Avatar, StatusPill } from "./status";
import { TaskDetail } from "./task-detail";
import { TaskDetailFrame } from "./task-detail-frame";

/*
 * Tasks (#134; Figma CP-04 522:110, CP-T04 557:807, CP-M04 555:354, CP-M04b 555:512).
 * Everything server-rendered: the filter (?status=) and the open task (?task=18) live in
 * the URL, so they're shareable and survive a refresh. Groups are native <details> (no
 * JavaScript): the current stage open, finished stages collapsed with "Done".
 */

export async function TasksView({
  publicId,
  locale,
  statusParam,
  taskParam,
}: {
  publicId: string;
  locale: PortalLocale;
  statusParam: unknown;
  taskParam: unknown;
}) {
  await connection();
  let view: ProjectView | null;
  try {
    view = await getProjectView(publicId);
  } catch (error) {
    Sentry.captureException(error, { tags: { feature: "portal-tasks" } });
    return <LoadFailed locale={locale} />;
  }
  if (!view) return null;

  const [t, status, overview] = await Promise.all([
    getTranslations("Portal.tasks"),
    getTranslations("Portal.status"),
    getTranslations("Portal.overview"),
  ]);
  const now = new Date();
  const today = lisbonToday(now);
  const filter = parseStatusFilter(statusParam);
  const counts = statusCounts(view.tickets);
  const groups = groupByStage(
    view.stages,
    filterByStatus(view.tickets, filter),
  );
  const current = currentStage(view.stages);
  const base = `/${locale}/portal/${view.publicId}/tasks`;
  const query = (next: { status?: StatusFilter; task?: number }) => {
    const params = new URLSearchParams();
    const statusValue = next.status ?? filter;
    if (statusValue !== "all") params.set("status", statusValue);
    if (next.task !== undefined) params.set("task", String(next.task));
    const search = params.toString();
    return search ? `${base}?${search}` : base;
  };

  const requested = typeof taskParam === "string" ? Number(taskParam) : NaN;
  const selected = Number.isInteger(requested)
    ? view.tickets.find((ticket) => ticket.number === requested)
    : undefined;
  const waiting = view.tickets.filter(
    (ticket) => ticket.waitingOnClient && ticket.status !== "done",
  ).length;
  const stageName = (id: string) =>
    view.stages.find((stage) => stage.id === id)?.name ?? "";

  const list = (
    <div className="flex min-w-0 flex-col gap-lg">
      <header className="flex flex-col gap-2">
        <p className="text-[12px] font-medium tracking-[0.08em] text-text-muted uppercase">
          {t("eyebrow")}
        </p>
        <h1 className="text-h3 text-text-primary">{t("title")}</h1>
        <p className="text-[15px] text-text-muted">
          <span className="md:hidden">
            {t("summaryShort", {
              total: counts.all,
              done: counts.done,
              waiting,
            })}
          </span>
          <span className="hidden md:inline">
            {t("summary", {
              total: counts.all,
              done: counts.done,
              inProgress: counts.in_progress,
              inReview: counts.in_review,
              blocked: counts.blocked,
              todo: counts.todo,
            })}
          </span>
        </p>
      </header>

      <nav
        aria-label={t("filterLabel")}
        className="-mx-(--gutter) overflow-x-auto px-(--gutter) md:mx-0 md:px-0"
      >
        <ul className="flex gap-2 md:gap-lg md:border-b md:border-border-default">
          {STATUS_FILTERS.map((key) => {
            const active = key === filter;
            return (
              <li key={key} className="shrink-0">
                <Link
                  href={query({ status: key })}
                  aria-current={active ? "page" : undefined}
                  scroll={false}
                  className={cn(
                    "flex min-h-11 items-center gap-1.5 rounded-full border px-3 text-[14px] font-medium whitespace-nowrap md:rounded-none md:border-0 md:border-b-2 md:px-0",
                    active
                      ? "border-text-primary bg-text-primary text-text-on-accent md:bg-transparent md:text-text-primary"
                      : "border-border-default text-text-muted hover:text-text-primary md:border-transparent",
                  )}
                >
                  {t(`filters.${key}`)}
                  <span
                    className={cn(
                      "text-[12px]",
                      active ? "md:text-text-muted" : "text-text-muted",
                    )}
                  >
                    {counts[key]}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {view.tickets.length === 0 ? (
        <p className="text-body text-text-muted">{t("emptyAll")}</p>
      ) : groups.length === 0 ? (
        <p className="text-body text-text-muted">{t("empty")}</p>
      ) : (
        <div className="flex flex-col gap-md">
          {groups.map((group) => {
            const allDone = group.done === group.total;
            const open =
              group.stage.id === current?.id ||
              filter !== "all" ||
              selected?.stageId === group.stage.id;
            return (
              <details
                key={group.stage.id}
                open={open}
                className="group rounded-lg border border-border-default bg-bg-surface"
              >
                <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-lg py-3 [&::-webkit-details-marker]:hidden">
                  <ChevronRight
                    aria-hidden
                    strokeWidth={ICON_STROKE}
                    className="size-4 shrink-0 group-open:hidden"
                  />
                  <ChevronDown
                    aria-hidden
                    strokeWidth={ICON_STROKE}
                    className="hidden size-4 shrink-0 group-open:block"
                  />
                  <span className="text-label text-text-primary">
                    {group.stage.name}
                  </span>
                  <span className="text-[13px] text-text-muted">
                    <span className="md:hidden">
                      {allDone
                        ? t("stageDone", {
                            done: group.done,
                            total: group.total,
                          })
                        : t("stageOpen", { count: group.total - group.done })}
                    </span>
                    <span className="hidden md:inline">
                      {t("stageMeta", {
                        position: group.stage.position,
                        range: formatRange(
                          group.stage.startsOn,
                          group.stage.endsOn,
                          locale,
                          "",
                        ),
                      })}
                      {allDone
                        ? ` · ${t("stageDone", { done: group.done, total: group.total })}`
                        : ""}
                    </span>
                  </span>
                  <span className="flex-1" />
                  {allDone ? (
                    <StatusPill status="done" label={status("done")} />
                  ) : null}
                </summary>
                <ul className="flex flex-col divide-y divide-border-default border-t border-border-default px-md pb-2">
                  {group.tickets.map((ticket) => {
                    const isSelected = ticket.id === selected?.id;
                    return (
                      <li key={ticket.id}>
                        <Link
                          href={query({ task: ticket.number })}
                          scroll={false}
                          aria-current={isSelected ? "true" : undefined}
                          aria-label={t("open", { title: ticket.title })}
                          className={cn(
                            "my-1 flex min-h-14 items-center gap-3 rounded-md px-2 py-2 hover:bg-bg-primary md:gap-md",
                            isSelected && "bg-bg-primary",
                          )}
                        >
                          <StatusPill
                            status={ticket.status}
                            label={status(ticket.status)}
                            className="hidden w-32 justify-start md:inline-flex"
                          />
                          <span className="flex min-w-0 flex-1 flex-col gap-1">
                            <span className="text-[14px] font-medium text-text-primary">
                              {ticket.title}
                            </span>
                            <span
                              className={cn(
                                "hidden text-[12px] md:block",
                                ticket.waitingOnClient
                                  ? "text-text-error"
                                  : "text-text-muted",
                              )}
                            >
                              {ticket.waitingOnClient
                                ? overview("waitingOnYou")
                                : ticket.ownerName}
                            </span>
                            <span className="flex flex-wrap items-center gap-2 md:hidden">
                              <StatusPill
                                status={ticket.status}
                                label={status(ticket.status)}
                              />
                              {ticket.dueOn ? (
                                <span className="text-[12px] text-text-muted">
                                  {formatDay(ticket.dueOn, locale)}
                                </span>
                              ) : null}
                            </span>
                          </span>
                          {ticket.ownerName ? (
                            <Avatar
                              initials={initials(ticket.ownerName)}
                              className="hidden md:grid"
                            />
                          ) : null}
                          <span className="hidden w-16 text-right text-[13px] text-text-muted md:block">
                            {ticket.dueOn
                              ? formatDay(ticket.dueOn, locale)
                              : ""}
                          </span>
                          <ChevronRight
                            aria-hidden
                            strokeWidth={ICON_STROKE}
                            className="size-4 shrink-0 md:hidden"
                          />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </details>
            );
          })}
        </div>
      )}

      {typeof taskParam === "string" && !selected ? (
        <p role="status" className="text-small text-text-muted">
          {t("notFound")}
        </p>
      ) : null}
    </div>
  );

  if (!selected) return list;

  return (
    <div className="grid gap-lg min-[80rem]:-my-8 min-[80rem]:-mr-10 min-[80rem]:grid-cols-[minmax(0,1fr)_440px] min-[80rem]:gap-0">
      <div className="min-[80rem]:py-8 min-[80rem]:pr-10">{list}</div>
      <TaskDetailFrame
        title={selected.title}
        closeHref={query({})}
        closeLabel={t("close")}
      >
        <TaskDetail
          view={view}
          ticket={selected}
          stageName={stageName(selected.stageId)}
          locale={locale}
          today={today}
          now={now}
        />
      </TaskDetailFrame>
    </div>
  );
}
