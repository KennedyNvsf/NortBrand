"use client";

import { animate, m, useMotionValue } from "motion/react";
import { useEffect, useState } from "react";

import { motionTokens } from "@/lib/motion";

import { useSessionMoment } from "./use-session-moment";

/*
 * The overall progress ring (#134; CP-03). Motion (14 Portal — Motion, "Progress ring",
 * once a session): the ring fills and the number counts up over 900 ms. On a later visit
 * it starts from the last value this browser saw, so the change itself is visible. It
 * never counts up on every view; reduced motion shows the final value.
 */

const SIZE = 56;
const STROKE = 6;
const RADIUS = (SIZE - STROKE) / 2;

function readLastSeen(key: string): number | null {
  try {
    const stored = window.localStorage.getItem(key);
    const value = Number(stored);
    return stored !== null && Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

function storeSeen(key: string, value: number) {
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    // Storage unavailable: the next visit simply animates from zero.
  }
}

export function ProgressRing({
  percent,
  projectId,
  label,
}: {
  percent: number;
  projectId: string;
  /** Accessible text, e.g. "44% of tasks done". */
  label: string;
}) {
  const decision = useSessionMoment(`progress:${projectId}`);
  const length = useMotionValue(percent / 100);
  const [shown, setShown] = useState(percent);

  useEffect(() => {
    if (decision === null) return;
    const key = `nb-portal-progress:${projectId}`;
    if (!decision) {
      storeSeen(key, percent);
      return;
    }
    const start = readLastSeen(key) ?? 0;
    storeSeen(key, percent);
    const timing = {
      duration: motionTokens.duration.draw,
      ease: motionTokens.ease.emphasized,
    };
    length.jump(start / 100);
    const ring = animate(length, percent / 100, timing);
    const count = animate(start, percent, {
      ...timing,
      onUpdate: (value) => {
        setShown(Math.round(value));
      },
    });
    return () => {
      ring.stop();
      count.stop();
    };
  }, [decision, percent, projectId, length]);

  return (
    <div className="flex items-center gap-md">
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${String(SIZE)} ${String(SIZE)}`}
        className="shrink-0 -rotate-90"
        role="img"
        aria-label={label}
      >
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          strokeWidth={STROKE}
          className="stroke-bg-primary"
        />
        <m.circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          strokeWidth={STROKE}
          strokeLinecap="round"
          className="stroke-action-secondary"
          style={{ pathLength: length }}
        />
      </svg>
      <span aria-hidden className="text-h3 text-text-primary tabular-nums">
        {shown}%
      </span>
    </div>
  );
}
