import { CheckSquare, Square } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { ICON_STROKE } from "@/lib/icons";
import { cn } from "@/lib/utils";

import { initials } from "../../shell/client-data";
import { getChecklist, type ProjectView } from "../data";
import { daysUntil, type PortalTicket } from "../domain";
import { formatDay, formatUpdateTime, type PortalLocale } from "../format";
import { Avatar, StatusPill } from "./status";

/*
 * A task's detail (#134; CP-04 right panel, CP-M04b sheet): status and due date, stage,
 * owner, start and due, the description, the checklist (read-only for clients) and the
 * updates linked to it. Server-rendered under RLS; the checklist comes back empty for a
 * task the client can't see.
 */
export async function TaskDetail({
  view,
  ticket,
  stageName,
  locale,
  today,
  now,
}: {
  view: ProjectView;
  ticket: PortalTicket;
  stageName: string;
  locale: PortalLocale;
  today: string;
  now: Date;
}) {
  const [t, status, overview, checklist] = await Promise.all([
    getTranslations("Portal.tasks"),
    getTranslations("Portal.status"),
    getTranslations("Portal.overview"),
    getChecklist(ticket.id),
  ]);
  const linked = view.updates.filter((update) =>
    update.ticketIds.includes(ticket.id),
  );
  const doneItems = checklist.filter((item) => item.done).length;
  const days = ticket.dueOn ? daysUntil(ticket.dueOn, today) : null;
  const owner = ticket.ownerName ?? t("noOwner");

  const rows: [string, React.ReactNode][] = [
    [t("stage"), stageName],
    [
      t("owner"),
      <span key="owner" className="flex items-center gap-2">
        <Avatar initials={initials(owner)} className="size-6 text-[10px]" />
        {owner}
      </span>,
    ],
    [t("started"), formatDay(ticket.createdOn, locale)],
  ];
  if (ticket.dueOn) rows.push([t("dueLabel"), formatDay(ticket.dueOn, locale)]);

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-1 border-b border-border-default px-lg pt-lg pr-16 pb-md">
        <p className="text-[11px] font-medium tracking-[0.08em] text-text-muted uppercase">
          {t("detailMeta", {
            stage: stageName,
            number: ticket.number,
            total: view.tickets.length,
          })}
        </p>
        <h2 className="text-h4 text-text-primary">{ticket.title}</h2>
      </div>
      <div className="flex flex-col gap-lg px-lg py-lg">
        <div className="flex flex-wrap items-center gap-3">
          <StatusPill status={ticket.status} label={status(ticket.status)} />
          {ticket.dueOn && days !== null ? (
            <span className="text-[13px] text-text-muted">
              {days === 0
                ? t("dueToday")
                : days > 0
                  ? t("dueIn", { day: formatDay(ticket.dueOn, locale), days })
                  : t("duePast", { day: formatDay(ticket.dueOn, locale) })}
            </span>
          ) : null}
        </div>
        {ticket.waitingOnClient ? (
          <p className="rounded-md bg-action-primary-subtle px-md py-3 text-small text-text-error">
            {overview("waitingOnYou")}
          </p>
        ) : null}

        <dl className="flex flex-col divide-y divide-border-default border-y border-border-default">
          {rows.map(([label, value]) => (
            <div
              key={label}
              className="grid grid-cols-[120px_1fr] items-center gap-md py-3 text-[14px]"
            >
              <dt className="text-text-muted">{label}</dt>
              <dd className="font-medium text-text-primary">{value}</dd>
            </div>
          ))}
        </dl>

        {ticket.description ? (
          <section className="flex flex-col gap-2">
            <h3 className="text-[11px] font-medium tracking-[0.08em] text-text-muted uppercase">
              {t("about")}
            </h3>
            <p className="text-[15px] whitespace-pre-line text-text-primary">
              {ticket.description}
            </p>
          </section>
        ) : null}

        {checklist.length > 0 ? (
          <section className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-medium tracking-[0.08em] text-text-muted uppercase">
                {t("checklist")}
              </h3>
              <span className="text-[12px] text-text-muted">
                {t("checklistCount", {
                  done: doneItems,
                  total: checklist.length,
                })}
              </span>
            </div>
            <ul className="flex flex-col gap-2">
              {checklist.map((item) => {
                const Icon = item.done ? CheckSquare : Square;
                return (
                  <li
                    key={item.id}
                    className="flex items-center gap-2.5 text-[14px] text-text-primary"
                  >
                    <Icon
                      aria-hidden
                      strokeWidth={ICON_STROKE}
                      className={cn(
                        "size-[18px] shrink-0",
                        item.done ? "text-action-secondary" : "text-text-muted",
                      )}
                    />
                    <span>{item.label}</span>
                    <span className="sr-only">
                      {item.done ? status("done") : status("todo")}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        {linked.length > 0 ? (
          <section className="flex flex-col gap-2">
            <h3 className="text-[11px] font-medium tracking-[0.08em] text-text-muted uppercase">
              {t("latest")}
            </h3>
            <ul className="flex flex-col gap-2">
              {linked.map((update) => {
                const author = update.authorName ?? overview("team");
                return (
                  <li
                    key={update.id}
                    className="flex gap-3 rounded-md bg-bg-primary p-md"
                  >
                    <Avatar initials={initials(author)} />
                    <div className="flex flex-col gap-1">
                      <p className="text-[14px] text-text-primary">
                        {update.body}
                      </p>
                      <p className="text-[12px] text-text-muted">
                        {author} ·{" "}
                        {formatUpdateTime(update.createdAt, now, locale, {
                          today: overview("today"),
                          yesterday: overview("yesterday"),
                        })}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}
