import { daysUntil, lisbonToday } from "./domain";

/*
 * Dates for the client portal (#134), with Intl only (no date library).
 * - Calendar days (YYYY-MM-DD: due dates, stage dates) are formatted in UTC, so a date
 *   never shifts by a day.
 * - Timestamps (updates) are shown in Lisbon time (CLAUDE.md).
 */

export type PortalLocale = "en" | "pt";

const LISBON = "Europe/Lisbon";

// Fixed names: Intl's short Portuguese months differ between ICU builds ("nov" vs "11").
const MONTHS: Record<PortalLocale, readonly string[]> = {
  en: [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ],
  pt: [
    "jan",
    "fev",
    "mar",
    "abr",
    "mai",
    "jun",
    "jul",
    "ago",
    "set",
    "out",
    "nov",
    "dez",
  ],
};
const WEEKDAYS: Record<PortalLocale, readonly string[]> = {
  en: [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ],
  pt: [
    "domingo",
    "segunda-feira",
    "terça-feira",
    "quarta-feira",
    "quinta-feira",
    "sexta-feira",
    "sábado",
  ],
};
const SHORT_WEEKDAYS: Record<PortalLocale, readonly string[]> = {
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  pt: ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"],
};

function parts(iso: string): {
  year: number;
  month: number;
  day: number;
  weekday: number;
} {
  const [year = 1970, month = 1, day = 1] = iso.split("-").map(Number);
  return {
    year,
    month,
    day,
    weekday: new Date(Date.UTC(year, month - 1, day)).getUTCDay(),
  };
}

/** "14 Nov" */
export function formatDay(iso: string, locale: PortalLocale): string {
  const { month, day } = parts(iso);
  return `${String(day)} ${MONTHS[locale][month - 1] ?? ""}`;
}

/** "12 Feb 2027" */
export function formatDate(iso: string, locale: PortalLocale): string {
  return `${formatDay(iso, locale)} ${String(parts(iso).year)}`;
}

/** "Thursday · 12 Nov 2026" (the eyebrow; shown in capitals by CSS). */
export function formatToday(now: Date, locale: PortalLocale): string {
  const iso = lisbonToday(now);
  return `${WEEKDAYS[locale][parts(iso).weekday] ?? ""} · ${formatDate(iso, locale)}`;
}

/** "3 Nov – 15 Dec", or "From 15 Feb" with no end. */
export function formatRange(
  start: string,
  end: string | null,
  locale: PortalLocale,
  fromLabel: string,
): string {
  if (!end) return `${fromLabel} ${formatDay(start, locale)}`;
  if (end === start) return formatDay(start, locale);
  return `${formatDay(start, locale)} – ${formatDay(end, locale)}`;
}

/** "Today 10:20", "Yesterday 17:45", "Mon 09:12" (this week), else "3 Nov". */
export function formatUpdateTime(
  timestamp: string,
  now: Date,
  locale: PortalLocale,
  labels: { today: string; yesterday: string },
): string {
  const at = new Date(timestamp);
  const day = lisbonToday(at);
  const ago = daysUntil(lisbonToday(now), day);
  const time = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: LISBON,
  }).format(at);
  if (ago <= 0) return `${labels.today} ${time}`;
  if (ago === 1) return `${labels.yesterday} ${time}`;
  if (ago < 7) {
    return `${SHORT_WEEKDAYS[locale][parts(day).weekday] ?? ""} ${time}`;
  }
  return formatDay(day, locale);
}

/** "14:15", Lisbon time (24-hour in both languages). */
export function formatLisbonTime(timestamp: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: LISBON,
  }).format(new Date(timestamp));
}
