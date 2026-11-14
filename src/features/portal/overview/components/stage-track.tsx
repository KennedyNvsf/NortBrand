"use client";

import { Check } from "lucide-react";
import { m } from "motion/react";

import { motionTokens } from "@/lib/motion";
import { cn } from "@/lib/utils";

import type { StageState } from "../domain";
import { useSessionMoment } from "./use-session-moment";

/*
 * The project stages (#134; CP-03 horizontal track, CP-T03 re-spaced, CP-M03 vertical
 * stepper). Done stages are green with a check, the current one red with "Now", the rest
 * outlined. Motion (14 Portal — Motion, "Stage track draw-on", once a session): the line
 * draws to the current stage over 900 ms and each node pops 0.6 → 1 as the line reaches
 * it; reduced motion shows the final state.
 */

export type TrackStage = {
  id: string;
  name: string;
  range: string;
  state: StageState;
};

function Node({
  state,
  play,
  delay,
}: {
  state: StageState;
  play: boolean;
  delay: number;
}) {
  return (
    <m.span
      aria-hidden
      initial={false}
      animate={play ? { scale: [0.6, 1] } : { scale: 1 }}
      transition={{
        duration: play ? motionTokens.duration.fast : 0,
        delay: play ? delay : 0,
      }}
      className={cn(
        "relative z-10 grid size-5 shrink-0 place-items-center rounded-full border-2 bg-bg-surface",
        state === "done" &&
          "border-action-secondary bg-action-secondary text-text-on-accent",
        state === "current" && "border-action-primary",
        state === "upcoming" && "border-text-disabled",
      )}
    >
      {state === "done" ? <Check strokeWidth={3} className="size-3" /> : null}
      {state === "current" ? (
        <span className="size-2 rounded-full bg-action-primary" />
      ) : null}
    </m.span>
  );
}

export function StageTrack({
  projectId,
  stages,
  labels,
}: {
  projectId: string;
  stages: TrackStage[];
  labels: { now: string; done: string; upcoming: string; current: string };
}) {
  const play = useSessionMoment(`stages:${projectId}`) === true;
  const reached = Math.max(
    0,
    stages.findIndex((stage) => stage.state === "current"),
  );
  const last = Math.max(stages.length - 1, 1);
  const fraction = stages.every((stage) => stage.state === "done")
    ? 1
    : reached / last;
  const draw = motionTokens.duration.draw;

  return (
    <ol className="relative flex flex-col gap-5 md:flex-row md:justify-between md:gap-0">
      {/* The line: vertical on mobile, horizontal from tablet up. */}
      <span
        aria-hidden
        className="absolute top-2.5 bottom-2.5 left-[9px] w-0.5 bg-border-default md:hidden"
      >
        <m.span
          className="absolute inset-0 origin-top bg-action-secondary"
          initial={false}
          animate={play ? { scaleY: [0, fraction] } : { scaleY: fraction }}
          transition={{
            duration: play ? draw : 0,
            ease: motionTokens.ease.emphasized,
          }}
        />
      </span>
      <span
        aria-hidden
        className="absolute top-[9px] hidden h-0.5 bg-border-default md:block"
        style={{
          left: `calc(100% / ${String(2 * stages.length)})`,
          right: `calc(100% / ${String(2 * stages.length)})`,
        }}
      >
        <m.span
          className="absolute inset-0 origin-left bg-action-secondary"
          initial={false}
          animate={play ? { scaleX: [0, fraction] } : { scaleX: fraction }}
          transition={{
            duration: play ? draw : 0,
            ease: motionTokens.ease.emphasized,
          }}
        />
      </span>
      {stages.map((stage, index) => (
        <li
          key={stage.id}
          className="relative flex items-start gap-3 md:flex-1 md:flex-col md:items-center md:gap-2 md:text-center"
        >
          <Node state={stage.state} play={play} delay={(index / last) * draw} />
          <span className="flex flex-col gap-0.5">
            <span className="flex items-center gap-2 text-[14px] font-medium text-text-primary md:justify-center">
              {stage.name}
              <span className="sr-only">
                {stage.state === "done"
                  ? labels.done
                  : stage.state === "current"
                    ? labels.current
                    : labels.upcoming}
              </span>
              {stage.state === "current" ? (
                <span
                  aria-hidden
                  className="rounded-full bg-action-primary-subtle px-1.5 py-px text-[11px] font-medium text-text-error md:absolute md:-top-6 md:left-1/2 md:-translate-x-1/2"
                >
                  {labels.now}
                </span>
              ) : null}
            </span>
            <span className="text-[12px] text-text-muted">{stage.range}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
