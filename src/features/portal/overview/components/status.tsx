import {
  CircleCheck,
  CircleDot,
  Circle,
  Contrast,
  Square,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";

import { ICON_STROKE } from "@/lib/icons";
import { cn } from "@/lib/utils";

import type { ProjectHealth } from "../data";
import type { TicketStatus } from "../domain";

/*
 * Status and health badges (#134; Figma CP-03/CP-04). Each pairs an icon with text, so
 * colour is never the only signal. Blocked and "Waiting on you" use the error colours;
 * done and on track the green identity colour.
 */

const STATUS_ICON: Record<TicketStatus, LucideIcon> = {
  todo: Circle,
  in_progress: Contrast,
  in_review: CircleDot,
  done: CircleCheck,
  blocked: Square,
};

export function StatusPill({
  status,
  label,
  className,
}: {
  status: TicketStatus;
  label: string;
  className?: string;
}) {
  const Icon = STATUS_ICON[status];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-medium whitespace-nowrap",
        status === "blocked"
          ? "bg-action-primary-subtle text-text-error"
          : status === "done"
            ? "bg-action-secondary-subtle text-action-secondary"
            : "bg-bg-primary text-text-primary",
        className,
      )}
    >
      <Icon
        aria-hidden
        strokeWidth={ICON_STROKE}
        className={cn("size-3.5", status === "blocked" && "fill-current")}
      />
      {label}
    </span>
  );
}

const HEALTH_ICON: Record<ProjectHealth, LucideIcon> = {
  on_track: CircleCheck,
  at_risk: TriangleAlert,
  waiting_on_client: Square,
};

export function HealthBadge({
  health,
  label,
}: {
  health: ProjectHealth;
  label: string;
}) {
  const Icon = HEALTH_ICON[health];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-medium whitespace-nowrap",
        health === "waiting_on_client" &&
          "bg-action-primary-subtle text-text-error",
        health === "on_track" &&
          "bg-action-secondary-subtle text-action-secondary",
        health === "at_risk" && "bg-bg-primary text-text-primary",
      )}
    >
      <Icon
        aria-hidden
        strokeWidth={ICON_STROKE}
        className={cn(
          "size-3.5",
          (health === "waiting_on_client" || health === "at_risk") &&
            "fill-current",
        )}
      />
      {label}
    </span>
  );
}

export function Avatar({
  initials,
  className,
}: {
  initials: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-7 shrink-0 place-items-center rounded-full border border-border-default bg-bg-primary text-[11px] font-semibold text-text-primary",
        className,
      )}
    >
      {initials}
    </span>
  );
}
