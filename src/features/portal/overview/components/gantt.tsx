"use client";

import { Check, Circle, Contrast } from "lucide-react";
import { m } from "motion/react";

import { ICON_STROKE } from "@/lib/icons";
import { motionTokens } from "@/lib/motion";
import { cn } from "@/lib/utils";

import type { StageState } from "../domain";
import { useSessionMoment } from "./use-session-moment";

/*
 * The project timeline (#135; Figma CP-05 Gantt, CP-T05/CP-M05 stage list with range
 * bars). One component, two layouts: a month grid from 1024 px, a list below where each
 * stage has its own range bar across the project's span. Positions are fractions of the
 * span (content.ts), computed on the server.
 * Motion (14 Portal — Motion, "Gantt bars", once a session): bars grow from their start
 * date (scaleX, origin left), 50 ms apart, 300 ms each; the Today line draws down last.
 * Reduced motion: final state.
 */

export type GanttRow = {
  id: string;
  name: string;
  range: string;
  state: StageState;
  left: number;
  width: number;
  /** Open-ended (no end date): drawn as a dashed band to the edge. */
  open: boolean;
  /** The current stage's done share, 0–100. */
  progress: number | null;
};

export type GanttLabels = {
  stage: string;
  today: string;
  /** Template with {percent}, filled here (functions can't cross to the client). */
  done: string;
  state: Record<StageState, string>;
  chart: string;
};

const ICON = { done: Check, current: Contrast, upcoming: Circle } as const;

function StateIcon({ state }: { state: StageState }) {
  const Icon = ICON[state];
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-5 shrink-0 place-items-center rounded-full",
        state === "done" && "bg-action-secondary text-text-on-accent",
        state !== "done" && "text-text-primary",
      )}
    >
      <Icon
        strokeWidth={state === "done" ? 3 : ICON_STROKE}
        className={state === "done" ? "size-3" : "size-4"}
      />
    </span>
  );
}

function Bar({
  row,
  index,
  play,
}: {
  row: GanttRow;
  index: number;
  play: boolean;
}) {
  return (
    <m.span
      aria-hidden
      initial={false}
      animate={play ? { scaleX: [0, 1] } : { scaleX: 1 }}
      transition={{
        duration: play ? motionTokens.duration.bar : 0,
        delay: play ? index * 0.05 : 0,
        ease: motionTokens.ease.emphasized,
      }}
      className={cn(
        "absolute top-1/2 h-6 origin-left -translate-y-1/2 overflow-hidden rounded-md",
        row.state === "done" && "bg-action-secondary",
        row.state === "current" && "border-2 border-text-primary bg-bg-surface",
        row.state === "upcoming" && !row.open && "bg-border-default",
        row.open && "border border-dashed border-border-default bg-bg-primary",
      )}
      style={{
        left: `${String(row.left * 100)}%`,
        width: `${String(Math.max(row.width * 100, 1.2))}%`,
      }}
    >
      {row.progress !== null ? (
        <span
          className="block h-full bg-text-primary"
          style={{ width: `${String(row.progress)}%` }}
        />
      ) : null}
    </m.span>
  );
}

export function Gantt({
  projectId,
  months,
  rows,
  today,
  labels,
}: {
  projectId: string;
  months: { key: string; label: string; left: number }[];
  rows: GanttRow[];
  today: { left: number; label: string } | null;
  labels: GanttLabels;
}) {
  const play = useSessionMoment(`gantt:${projectId}`) === true;
  const lastDelay = rows.length * 0.05 + motionTokens.duration.bar;

  const todayLine = today ? (
    <m.span
      aria-hidden
      initial={false}
      animate={play ? { scaleY: [0, 1] } : { scaleY: 1 }}
      transition={{
        duration: play ? motionTokens.duration.base : 0,
        delay: play ? lastDelay : 0,
      }}
      className="pointer-events-none absolute top-0 bottom-0 w-0.5 origin-top bg-action-primary"
      style={{ left: `${String(today.left * 100)}%` }}
    />
  ) : null;

  return (
    <div
      role="group"
      aria-label={labels.chart}
      className="rounded-lg border border-border-default bg-bg-surface"
    >
      {/* Desktop: the month grid. */}
      <div className="hidden lg:block">
        <div className="grid grid-cols-[280px_minmax(0,1fr)] border-b border-border-default text-[13px] text-text-muted">
          <span className="px-lg py-3">{labels.stage}</span>
          <div className="relative h-11">
            {months.map((month) => (
              <span
                key={month.key}
                className="absolute top-0 bottom-0 border-l border-border-default pt-3 pl-2"
                style={{ left: `${String(month.left * 100)}%` }}
              >
                {month.label}
              </span>
            ))}
            {today ? (
              <span
                className="absolute top-2.5 z-10 -translate-x-1/2 rounded-full bg-action-primary-fill px-2 py-0.5 text-[11px] font-medium whitespace-nowrap text-text-on-accent"
                style={{ left: `${String(today.left * 100)}%` }}
              >
                {today.label}
              </span>
            ) : null}
          </div>
        </div>
        <ul className="relative">
          {rows.map((row, index) => (
            <li
              key={row.id}
              className="grid grid-cols-[280px_minmax(0,1fr)] border-b border-border-default last:border-b-0"
            >
              <div className="flex items-center gap-3 px-lg py-3">
                <StateIcon state={row.state} />
                <div className="flex min-w-0 flex-col">
                  <span className="text-[14px] font-medium text-text-primary">
                    {row.name}
                  </span>
                  <span className="text-[12px] text-text-muted">
                    {row.range}
                  </span>
                </div>
                <span className="sr-only">{labels.state[row.state]}</span>
              </div>
              <div className="relative min-h-16">
                {months.map((month) => (
                  <span
                    key={month.key}
                    aria-hidden
                    className="absolute top-0 bottom-0 border-l border-border-default"
                    style={{ left: `${String(month.left * 100)}%` }}
                  />
                ))}
                <Bar row={row} index={index} play={play} />
                {row.progress !== null ? (
                  <span
                    className="absolute top-1/2 -translate-y-1/2 pl-3 text-[13px] whitespace-nowrap text-text-primary"
                    style={{ left: `${String((row.left + row.width) * 100)}%` }}
                  >
                    {labels.done.replace("{percent}", String(row.progress))}
                  </span>
                ) : null}
              </div>
            </li>
          ))}
          <li
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 left-[280px]"
          >
            {todayLine}
          </li>
        </ul>
      </div>

      {/* Tablet and mobile: a stage list with range bars. */}
      <ul className="flex flex-col divide-y divide-border-default lg:hidden">
        {rows.map((row, index) => (
          <li key={row.id} className="flex flex-col gap-3 px-lg py-md">
            <div className="flex items-center gap-3">
              <StateIcon state={row.state} />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="text-[14px] font-medium text-text-primary">
                  {row.name}
                </span>
                <span className="text-[12px] text-text-muted">
                  {row.range}
                  {row.progress !== null
                    ? ` · ${labels.done.replace("{percent}", String(row.progress))}`
                    : ""}
                </span>
              </div>
              <span className="sr-only">{labels.state[row.state]}</span>
            </div>
            <div aria-hidden className="relative h-6 rounded-md bg-bg-primary">
              <Bar row={row} index={index} play={play} />
              {today ? (
                <span
                  className="absolute -top-1 -bottom-1 w-0.5 bg-action-primary"
                  style={{ left: `${String(today.left * 100)}%` }}
                />
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
