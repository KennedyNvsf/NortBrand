import * as Sentry from "@sentry/nextjs";
import { Check, CircleCheck, Square } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { connection } from "next/server";

import { ICON_STROKE } from "@/lib/icons";
import { cn } from "@/lib/utils";

import { initials } from "../../shell/client-data";
import { groupUpdatesByDay } from "../content";
import { getProjectView, type ProjectView } from "../data";
import { formatUpdateTime, type PortalLocale } from "../format";
import { LoadFailed } from "./load-failed";
import { Avatar } from "./status";

/*
 * The client's updates feed (#135; Figma CP-07 524:628, CP-T07 558:957, CP-M07 556:655):
 * newest first, grouped Today / Yesterday / This week / Earlier (Lisbon days). A post
 * that asks something of the client has a red border and "Needs you"; a milestone post is
 * green; an edited post says so. Deleted posts never reach the client (RLS). Linked tasks
 * are chips that open the task. Live arrival of new posts comes with the updates ticket
 * (#139).
 */

export async function UpdatesView({
  publicId,
  locale,
}: {
  publicId: string;
  locale: PortalLocale;
}) {
  await connection();
  let view: ProjectView | null;
  try {
    view = await getProjectView(publicId);
  } catch (error) {
    Sentry.captureException(error, { tags: { feature: "portal-updates" } });
    return <LoadFailed locale={locale} />;
  }
  if (!view) return null;

  const [t, overview] = await Promise.all([
    getTranslations("Portal.updates"),
    getTranslations("Portal.overview"),
  ]);
  const now = new Date();
  const groups = groupUpdatesByDay(view.updates, now);
  const tasks = new Map(view.tickets.map((ticket) => [ticket.id, ticket]));
  const tasksBase = `/${locale}/portal/${view.publicId}/tasks`;

  return (
    <div className="flex max-w-[720px] flex-col gap-lg">
      <header className="flex flex-col gap-2">
        <p className="text-[12px] font-medium tracking-[0.08em] text-text-muted uppercase">
          {t("eyebrow")}
        </p>
        <h1 className="text-h3 text-text-primary">{t("title")}</h1>
        <p className="text-[15px] text-text-muted">{t("intro")}</p>
      </header>

      {groups.length === 0 ? (
        <p className="text-body text-text-muted">{t("empty")}</p>
      ) : (
        groups.map(({ group, updates }) => (
          <section
            key={group}
            aria-labelledby={`updates-${group}`}
            className="flex flex-col gap-3"
          >
            <h2
              id={`updates-${group}`}
              className="text-[12px] font-medium tracking-[0.08em] text-text-muted uppercase"
            >
              {t(`groups.${group}`)}
            </h2>
            <ul className="flex flex-col gap-3">
              {updates.map((update) => {
                const author = update.authorName ?? overview("team");
                const linked = update.ticketIds.flatMap((id) => {
                  const ticket = tasks.get(id);
                  return ticket ? [ticket] : [];
                });
                return (
                  <li key={update.id}>
                    <article
                      className={cn(
                        "flex flex-col gap-3 rounded-lg border p-lg",
                        update.needsClient && "border-action-primary",
                        update.highlight &&
                          !update.needsClient &&
                          "border-transparent bg-action-secondary-subtle",
                        !update.needsClient &&
                          !update.highlight &&
                          "border-border-default bg-bg-surface",
                      )}
                    >
                      <header className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <Avatar initials={initials(author)} />
                        <span className="text-[14px] font-medium text-text-primary">
                          {author}
                        </span>
                        <span className="text-[13px] text-text-muted">
                          {formatUpdateTime(update.createdAt, now, locale, {
                            today: "",
                            yesterday: "",
                          }).trim()}
                          {update.editedAt ? ` · ${t("edited")}` : ""}
                        </span>
                        <span className="flex-1" />
                        {update.needsClient ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-action-primary-subtle px-2.5 py-1 text-[13px] font-medium text-text-error">
                            <Square
                              aria-hidden
                              strokeWidth={ICON_STROKE}
                              className="size-3.5 fill-current"
                            />
                            {t("needsYou")}
                          </span>
                        ) : update.highlight ? (
                          <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-action-secondary">
                            <CircleCheck
                              aria-hidden
                              strokeWidth={ICON_STROKE}
                              className="size-4"
                            />
                            {t("milestone")}
                          </span>
                        ) : null}
                      </header>
                      <p className="text-[15px] whitespace-pre-line text-text-primary">
                        {update.body}
                      </p>
                      {linked.length > 0 ? (
                        <ul className="flex flex-wrap gap-2">
                          {linked.map((ticket) => (
                            <li key={ticket.id}>
                              <Link
                                href={`${tasksBase}?task=${String(ticket.number)}`}
                                aria-label={t("linkedTask", {
                                  title: ticket.title,
                                })}
                                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border-default px-3 text-[13px] font-medium text-text-primary hover:bg-bg-primary md:min-h-9"
                              >
                                <Check
                                  aria-hidden
                                  strokeWidth={ICON_STROKE}
                                  className="size-3.5"
                                />
                                {ticket.title}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </article>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
