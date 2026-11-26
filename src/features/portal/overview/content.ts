import {
  daysUntil,
  lisbonToday,
  type PortalStage,
  type PortalTicket,
} from "./domain";

/*
 * Rules for the client timeline, files and updates (#135), free of React and Supabase
 * so they're unit-tested. Calendar days are YYYY-MM-DD; "today" is Lisbon's.
 */

// ---------------------------------------------------------------------------
// Timeline (CP-05)
// ---------------------------------------------------------------------------

export type TimelineSpan = {
  start: string;
  end: string;
  /** First day of each month the span covers, YYYY-MM-01. */
  months: string[];
};

function monthStart(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}

function nextMonth(iso: string): string {
  const [year = 1970, month = 1] = iso.split("-").map(Number);
  const next = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };
  return `${String(next.y)}-${String(next.m).padStart(2, "0")}-01`;
}

/**
 * The months the Gantt shows: from the first stage's month to the month after the last
 * known date (the launch, or the last stage end), so an open-ended "Support" has room.
 */
export function timelineSpan(
  stages: readonly PortalStage[],
  launchesOn: string,
): TimelineSpan {
  const starts = stages.map((stage) => stage.startsOn);
  const ends = stages.flatMap((stage) =>
    stage.endsOn ? [stage.endsOn] : [stage.startsOn],
  );
  const first = [...starts, launchesOn].sort()[0] ?? launchesOn;
  const last = [...ends, launchesOn].sort().at(-1) ?? launchesOn;
  const start = monthStart(first);
  const end = nextMonth(nextMonth(monthStart(last)));
  const months: string[] = [];
  for (let month = start; month < end; month = nextMonth(month))
    months.push(month);
  return { start, end, months };
}

/** Where a date sits across the span, 0–1. */
export function spanPosition(span: TimelineSpan, iso: string): number {
  const total = daysUntil(span.end, span.start);
  if (total <= 0) return 0;
  return Math.min(1, Math.max(0, daysUntil(iso, span.start) / total));
}

/** A stage's share of done tasks, 0–100 (0 with no tasks). */
export function stageProgress(
  tickets: readonly PortalTicket[],
  stageId: string,
): number {
  const own = tickets.filter((ticket) => ticket.stageId === stageId);
  if (own.length === 0) return 0;
  return Math.round(
    (own.filter((ticket) => ticket.status === "done").length / own.length) *
      100,
  );
}

// ---------------------------------------------------------------------------
// Files (CP-06)
// ---------------------------------------------------------------------------

export type FileKind = "pdf" | "zip" | "image";
export type FileGroup = "design" | "documents";

export function fileKind(contentType: string): FileKind {
  if (contentType === "application/pdf") return "pdf";
  if (contentType === "application/zip") return "zip";
  return "image";
}

/**
 * Design (images and archives: designs, brand assets) or Documents (PDFs: proposals,
 * agreements, briefs). project_files has no category column; the type is a good proxy.
 */
export function fileGroup(contentType: string): FileGroup {
  return fileKind(contentType) === "pdf" ? "documents" : "design";
}

/** "4.2 MB", "320 KB" (pt: "4,2 MB"). */
export function formatSize(bytes: number, locale: "en" | "pt"): string {
  const decimal = (value: number) =>
    new Intl.NumberFormat(locale === "pt" ? "pt-PT" : "en-GB", {
      maximumFractionDigits: value < 10 ? 1 : 0,
    }).format(value);
  if (bytes >= 1_000_000) return `${decimal(bytes / 1_000_000)} MB`;
  return `${String(Math.max(1, Math.round(bytes / 1000)))} KB`;
}

// ---------------------------------------------------------------------------
// Updates (CP-07)
// ---------------------------------------------------------------------------

export type UpdateDayGroup = "today" | "yesterday" | "thisWeek" | "earlier";

/** Which heading an update sits under, by its Lisbon calendar day. */
export function updateDayGroup(createdAt: string, now: Date): UpdateDayGroup {
  const ago = daysUntil(lisbonToday(now), lisbonToday(new Date(createdAt)));
  if (ago <= 0) return "today";
  if (ago === 1) return "yesterday";
  if (ago < 7) return "thisWeek";
  return "earlier";
}

/** Updates in feed order (newest first), split into their day groups, empty groups dropped. */
export function groupUpdatesByDay<T extends { createdAt: string }>(
  updates: readonly T[],
  now: Date,
): { group: UpdateDayGroup; updates: T[] }[] {
  const order: UpdateDayGroup[] = ["today", "yesterday", "thisWeek", "earlier"];
  const sorted = [...updates].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
  return order
    .map((group) => ({
      group,
      updates: sorted.filter(
        (update) => updateDayGroup(update.createdAt, now) === group,
      ),
    }))
    .filter((entry) => entry.updates.length > 0);
}
