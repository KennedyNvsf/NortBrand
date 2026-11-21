import { fill } from "../../auth/components/copy";
import { lisbonToday } from "../../overview/domain";
import { formatDay, formatLisbonTime } from "../../overview/format";

/*
 * "Last active" on the Team table (#142; Figma TM-12): Now (under 5 minutes), "12 min
 * ago", "3 h ago" (same Lisbon day, under 12 h), "Today, 10:02", else the date.
 */

export function lastActiveLabel(
  at: string | null,
  now: Date,
  copy: {
    never: string;
    now: string;
    minutesAgo: string;
    hoursAgo: string;
    today: string;
  },
): string {
  if (!at) return copy.never;
  const then = new Date(at);
  const minutes = Math.floor((now.getTime() - then.getTime()) / 60_000);
  if (minutes < 5) return copy.now;
  const sameDay = lisbonToday(then) === lisbonToday(now);
  if (minutes < 60) return fill(copy.minutesAgo, { count: minutes });
  if (sameDay && minutes < 12 * 60) {
    return fill(copy.hoursAgo, { count: Math.floor(minutes / 60) });
  }
  if (sameDay) return fill(copy.today, { time: formatLisbonTime(at) });
  return formatDay(lisbonToday(then), "en");
}
