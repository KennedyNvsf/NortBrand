import { cn } from "@/lib/utils";

import { fill } from "../../../auth/components/copy";
import { lisbonToday } from "../../../overview/domain";
import { formatDay, formatLisbonTime } from "../../../overview/format";
import type { TeamAccessCopy } from "../../copy";
import {
  isAlertEvent,
  type AccessEvent,
  type ClientPerson,
} from "../access-rules";

/*
 * Sign-in activity (#141; Figma TM-06): the last 30 days, team only. People are named
 * when they're on the project; otherwise their email. A pause is shown in red, with its
 * text, so colour is never the only signal. Server-rendered.
 */

export function ActivityCard({
  copy,
  events,
  people,
  lockoutMinutes,
  now,
}: {
  copy: TeamAccessCopy;
  events: AccessEvent[];
  people: ClientPerson[];
  lockoutMinutes: number;
  now: Date;
}) {
  const today = lisbonToday(now);
  const nameFor = (email: string | null) =>
    (email && people.find((person) => person.email === email)?.name) ??
    email ??
    "";

  return (
    <section
      aria-labelledby="access-activity"
      className="flex flex-col gap-md rounded-lg border border-border-default bg-bg-surface p-lg"
    >
      <div className="flex flex-col gap-1">
        <h2 id="access-activity" className="text-h4 text-text-primary">
          {copy.activity.title}
        </h2>
        <p className="text-[14px] text-text-muted">{copy.activity.intro}</p>
      </div>
      {events.length === 0 ? (
        <p className="border-t border-border-default pt-md text-[14px] text-text-muted">
          {copy.activity.empty}
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-border-default border-t border-border-default">
          {events.map((event) => {
            const day = lisbonToday(new Date(event.occurredAt));
            const alert = isAlertEvent(event.kind);
            return (
              <li
                key={event.id}
                className="flex flex-col gap-1 py-3 md:flex-row md:items-baseline md:justify-between md:gap-md"
              >
                <span
                  className={cn(
                    "flex items-baseline gap-3 text-[14px]",
                    alert ? "text-text-error" : "text-text-primary",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "size-1.5 shrink-0 -translate-y-0.5 rounded-full",
                      alert ? "bg-text-error" : "bg-text-muted",
                    )}
                  />
                  {fill(copy.activity.events[event.kind], {
                    person: nameFor(event.email),
                    email: event.email ?? "",
                    actor: event.actorName ?? copy.activity.someone,
                    minutes: lockoutMinutes,
                  })}
                </span>
                <time
                  dateTime={event.occurredAt}
                  className="shrink-0 pl-[18px] text-[13px] whitespace-nowrap text-text-muted md:pl-0"
                >
                  {fill(copy.activity.when, {
                    day:
                      day === today
                        ? copy.activity.today
                        : formatDay(day, "en"),
                    time: formatLisbonTime(event.occurredAt),
                  })}
                </time>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
