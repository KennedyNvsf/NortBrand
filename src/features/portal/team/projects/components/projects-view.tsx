import Link from "next/link";

import { cn } from "@/lib/utils";

import { fill } from "../../../auth/components/copy";
import { initials } from "../../../shell/client-data";
import { Avatar, HealthBadge } from "../../../overview/components/status";
import type { StageState } from "../../../overview/domain";
import { lisbonToday } from "../../../overview/domain";
import { formatDay, formatToday } from "../../../overview/format";
import type { TeamPagesCopy } from "../../copy";
import {
  PROJECT_VIEWS,
  inView,
  launchingSoon,
  percentDone,
  stageSummary,
  updateAge,
  viewCounts,
  type ProjectView,
  type TeamProject,
} from "../list";

/*
 * The team's Projects list (#136; Figma TM-01 528:189, TM-T01 560:957, TM-M01 559:646).
 * Server-rendered under RLS. The tab is a link (?view=), so it survives a reload and can
 * be shared. Desktop shows every column; tablet drops progress, lead and last update; on
 * mobile each project is a card (Portal · Responsive rules). Health always pairs an icon
 * with text.
 */

type Copy = TeamPagesCopy["projects"];

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function StageDots({ states }: { states: StageState[] }) {
  return (
    <span aria-hidden className="flex gap-1">
      {states.map((state, index) => (
        <span
          key={index}
          className={cn(
            "h-1 w-[22px] rounded-[2px]",
            state === "done" && "bg-action-secondary",
            state === "current" && "bg-action-primary",
            state === "upcoming" && "bg-border-default",
          )}
        />
      ))}
    </span>
  );
}

function ProgressBar({ percent }: { percent: number }) {
  return (
    <span
      aria-hidden
      className="relative block h-1.5 w-20 overflow-hidden rounded-[3px] bg-border-default"
    >
      <span
        className="absolute inset-y-0 left-0 rounded-[3px] bg-text-primary"
        style={{ width: `${String(Math.max(percent, percent > 0 ? 8 : 0))}%` }}
      />
    </span>
  );
}

function ageLabel(copy: Copy, project: TeamProject, today: string): string {
  const day = project.lastUpdateAt
    ? lisbonToday(new Date(project.lastUpdateAt))
    : null;
  const age = updateAge(day, today);
  switch (age.kind) {
    case "today":
      return copy.age.today;
    case "yesterday":
      return copy.age.yesterday;
    case "days":
      return fill(copy.age.days, { days: age.days });
    case "date":
      return day ? formatDay(day, "en") : copy.age.none;
    default:
      return copy.age.none;
  }
}

function stageLabel(copy: Copy, project: TeamProject) {
  const stage = stageSummary(project.stages);
  return stage
    ? {
        text: fill(copy.stageOf, {
          stage: stage.name,
          position: stage.position,
          total: stage.total,
        }),
        short: stage.name,
        states: stage.states,
      }
    : { text: copy.noStages, short: copy.noStages, states: [] };
}

export function ProjectsView({
  copy,
  projects,
  view,
  action,
  now,
}: {
  copy: Copy;
  projects: TeamProject[];
  view: ProjectView;
  action: React.ReactNode;
  now: Date;
}) {
  const today = lisbonToday(now);
  const counts = viewCounts(projects, today);
  const soon = launchingSoon(projects, today);
  const shown = projects.filter((project) => inView(project, view, today));

  return (
    <div className="flex flex-col gap-lg">
      <header className="flex flex-col gap-md md:flex-row md:items-end md:gap-lg">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <p className="hidden text-[12px] font-medium tracking-[0.08em] text-text-muted uppercase lg:block">
            {formatToday(now, "en")}
          </p>
          <div className="flex items-center justify-between gap-md">
            <h1 className="text-h3 text-text-primary">{copy.title}</h1>
            <div className="md:hidden">{action}</div>
          </div>
          <p className="hidden text-[15px] text-text-muted md:block">
            {fill(copy.summary, {
              active: counts.active,
              waiting: counts.waiting,
              soon: soon.count,
              month: MONTHS[Number(soon.before.slice(5, 7)) - 1] ?? "",
            })}
          </p>
        </div>
        <div className="hidden md:block">{action}</div>
      </header>

      <nav aria-label={copy.tabsLabel}>
        <ul className="-mx-md flex gap-2 overflow-x-auto px-md md:mx-0 md:gap-lg md:overflow-visible md:border-b md:border-border-default md:px-0">
          {PROJECT_VIEWS.map((key) => {
            const active = key === view;
            return (
              <li key={key} className="shrink-0">
                <Link
                  href={key === "active" ? "/team" : `/team?view=${key}`}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 items-center gap-1.5 text-[14px] whitespace-nowrap",
                    // Mobile: pills. From tablet: underlined tabs.
                    "rounded-full border px-3.5 md:min-h-0 md:rounded-none md:border-0 md:px-0 md:pb-3",
                    active
                      ? "border-text-primary bg-text-primary font-semibold text-text-on-accent md:bg-transparent md:text-text-primary md:shadow-[inset_0_-2px_0_var(--color-text-primary)]"
                      : "border-border-default font-medium text-text-muted hover:text-text-primary",
                  )}
                >
                  {copy.tabs[key]}
                  <span
                    className={cn(
                      "text-[13px] font-normal",
                      active
                        ? "opacity-80 md:text-text-muted md:opacity-100"
                        : "",
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

      {shown.length === 0 ? (
        <p className="text-body text-text-muted">{copy.viewEmpty[view]}</p>
      ) : (
        <>
          {/* Tablet and desktop: a table. */}
          <div className="hidden rounded-lg border border-border-default bg-bg-surface px-5 py-1 md:block">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="text-[12px] text-text-muted">
                  <th scope="col" className="py-3 pr-4 font-medium">
                    {copy.columns.project}
                  </th>
                  <th scope="col" className="w-[190px] py-3 pr-4 font-medium">
                    {copy.columns.stage}
                  </th>
                  <th
                    scope="col"
                    className="hidden w-[140px] py-3 pr-4 font-medium lg:table-cell"
                  >
                    {copy.columns.progress}
                  </th>
                  <th scope="col" className="w-[160px] py-3 pr-4 font-medium">
                    {copy.columns.health}
                  </th>
                  <th scope="col" className="w-[90px] py-3 pr-4 font-medium">
                    {copy.columns.launch}
                  </th>
                  <th
                    scope="col"
                    className="hidden w-[56px] py-3 pr-4 font-medium lg:table-cell"
                  >
                    {copy.columns.lead}
                  </th>
                  <th
                    scope="col"
                    className="hidden w-[96px] py-3 font-medium lg:table-cell"
                  >
                    {copy.columns.lastUpdate}
                  </th>
                </tr>
              </thead>
              <tbody>
                {shown.map((project) => {
                  const stage = stageLabel(copy, project);
                  const percent = percentDone(
                    project.ticketsDone,
                    project.ticketsTotal,
                  );
                  return (
                    <tr
                      key={project.id}
                      className="border-t border-border-default"
                    >
                      <th
                        scope="row"
                        className="py-3.5 pr-4 text-left font-normal"
                      >
                        <span className="flex flex-col gap-0.5">
                          <span className="text-[14px] font-semibold text-text-primary">
                            {project.clientName}
                          </span>
                          <span className="text-[12px] text-text-muted">
                            {project.name} · {project.publicId}
                          </span>
                        </span>
                      </th>
                      <td className="py-3.5 pr-4">
                        <span className="flex flex-col gap-1.5">
                          <span className="text-[13px] font-medium text-text-primary">
                            {stage.text}
                          </span>
                          <StageDots states={stage.states} />
                        </span>
                      </td>
                      <td className="hidden py-3.5 pr-4 lg:table-cell">
                        <span className="flex items-center gap-2.5">
                          <ProgressBar percent={percent} />
                          <span className="text-[13px] font-medium text-text-primary">
                            {percent}%
                          </span>
                        </span>
                      </td>
                      <td className="py-3.5 pr-4">
                        <HealthBadge
                          health={project.health}
                          label={copy.health[project.health]}
                        />
                      </td>
                      <td className="py-3.5 pr-4 text-[13px] text-text-primary">
                        {formatDay(project.launchesOn, "en")}
                      </td>
                      <td className="hidden py-3.5 pr-4 lg:table-cell">
                        {project.leadName ? (
                          <>
                            <Avatar
                              initials={initials(project.leadName)}
                              className="size-[26px]"
                            />
                            <span className="sr-only">{project.leadName}</span>
                          </>
                        ) : null}
                      </td>
                      <td className="hidden py-3.5 text-[13px] text-text-muted lg:table-cell">
                        {ageLabel(copy, project, today)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile: cards. */}
          <ul className="flex flex-col gap-3 md:hidden">
            {shown.map((project) => {
              const stage = stageLabel(copy, project);
              const percent = percentDone(
                project.ticketsDone,
                project.ticketsTotal,
              );
              return (
                <li key={project.id}>
                  <article className="flex flex-col gap-3 rounded-lg border border-border-default bg-bg-surface p-4">
                    <header className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <h2 className="text-[17px] font-semibold text-text-primary">
                          {project.clientName}
                        </h2>
                        <p className="text-[13px] text-text-muted">
                          {project.name} · {project.publicId}
                        </p>
                      </div>
                      <HealthBadge
                        health={project.health}
                        label={copy.health[project.health]}
                      />
                    </header>
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <StageDots states={stage.states} />
                      <span className="text-[14px] text-text-primary">
                        <span className="sr-only">{stage.text} · </span>
                        <span aria-hidden>{stage.short}</span> · {percent}%
                      </span>
                    </p>
                    <footer className="flex items-center justify-between gap-3">
                      <span className="text-[14px] text-text-muted">
                        {fill(copy.launchOn, {
                          date: formatDay(project.launchesOn, "en"),
                        })}
                      </span>
                      {project.leadName ? (
                        <>
                          <Avatar initials={initials(project.leadName)} />
                          <span className="sr-only">
                            {fill(copy.leadLabel, { name: project.leadName })}
                          </span>
                        </>
                      ) : null}
                    </footer>
                  </article>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
