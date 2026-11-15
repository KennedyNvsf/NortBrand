import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { ICON_STROKE } from "@/lib/icons";
import { cn } from "@/lib/utils";

import { fill } from "../../../auth/components/copy";
import { HealthBadge } from "../../../overview/components/status";
import { formatDay } from "../../../overview/format";
import type { TeamProjectCopy } from "../../copy";
import { stageSummary } from "../../projects/list";
import type { TeamBoard } from "../data";

/*
 * The team project header (#137; Figma TM-02 top, TM-M02): breadcrumb (a back link on
 * mobile), the name with its health, a one-line summary and the section tabs. Shared by
 * the project pages; the Overview, Timeline, Files, Updates and Client access sections
 * arrive with #138–#141 (their tabs show the designed 404 until then).
 */

export const PROJECT_SECTIONS = [
  "overview",
  "board",
  "timeline",
  "files",
  "updates",
  "access",
] as const;
export type ProjectSection = (typeof PROJECT_SECTIONS)[number];

function sectionHref(publicId: string, section: ProjectSection): string {
  const base = `/team/projects/${publicId}`;
  return section === "overview" ? base : `${base}/${section}`;
}

export function ProjectHeader({
  board,
  current,
  copy,
  actions,
}: {
  board: TeamBoard;
  current: ProjectSection;
  copy: TeamProjectCopy;
  actions?: ReactNode;
}) {
  const { project } = board;
  const stage = stageSummary(board.stages);
  const done = board.tickets.filter(
    (ticket) => ticket.status === "done",
  ).length;
  const summary =
    fill(copy.summary, {
      stage: stage?.name ?? copy.noStages,
      position: stage?.position ?? 0,
      total: stage?.total ?? 0,
      done,
      all: board.tickets.length,
      launch: formatDay(project.launchesOn, "en"),
    }) +
    (project.clientEmail
      ? fill(copy.summaryClient, { email: project.clientEmail })
      : "");

  return (
    <header className="flex flex-col gap-md">
      <nav aria-label={copy.breadcrumb} className="text-[14px]">
        <Link
          href="/team"
          className="inline-flex min-h-11 items-center gap-1 text-text-muted hover:text-text-primary md:hidden"
        >
          <ChevronLeft
            aria-hidden
            strokeWidth={ICON_STROKE}
            className="size-4"
          />
          {copy.back}
        </Link>
        <ol className="hidden items-center gap-2 md:flex">
          <li>
            <Link
              href="/team"
              className="text-text-muted hover:text-text-primary"
            >
              {copy.breadcrumb}
            </Link>
          </li>
          <li aria-hidden className="text-text-muted">
            /
          </li>
          <li aria-current="page" className="font-medium text-text-primary">
            {project.clientName}
          </li>
        </ol>
      </nav>

      <div className="flex flex-col gap-md lg:flex-row lg:items-end lg:gap-lg">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-col items-start gap-2 md:flex-row md:flex-wrap md:items-center md:gap-3">
            <h1 className="text-h3 text-text-primary">{project.name}</h1>
            <HealthBadge
              health={project.health}
              label={copy.health[project.health]}
            />
          </div>
          <p className="hidden text-[15px] text-text-muted md:block">
            {summary}
          </p>
        </div>
        {actions ? (
          <div className="hidden shrink-0 items-center gap-3 md:flex">
            {actions}
          </div>
        ) : null}
      </div>

      <nav aria-label={copy.tabsLabel}>
        <ul className="-mx-md flex gap-2 overflow-x-auto px-md md:mx-0 md:gap-lg md:border-b md:border-border-default md:px-0">
          {PROJECT_SECTIONS.map((section) => {
            const active = section === current;
            return (
              <li key={section} className="shrink-0">
                <Link
                  href={sectionHref(project.publicId, section)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 items-center rounded-full border px-3.5 text-[14px] whitespace-nowrap md:min-h-0 md:rounded-none md:border-0 md:px-0 md:pb-3",
                    active
                      ? "border-text-primary bg-text-primary font-semibold text-text-on-accent md:bg-transparent md:text-text-primary md:shadow-[inset_0_-2px_0_var(--color-text-primary)]"
                      : "border-border-default font-medium text-text-muted hover:text-text-primary",
                  )}
                >
                  {copy.tabs[section]}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
