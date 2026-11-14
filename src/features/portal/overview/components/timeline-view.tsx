import * as Sentry from "@sentry/nextjs";
import { getTranslations } from "next-intl/server";
import { connection } from "next/server";

import { spanPosition, stageProgress, timelineSpan } from "../content";
import {
  getMilestones,
  getProjectView,
  type Milestone,
  type ProjectView,
} from "../data";
import { currentStage, lisbonToday, stageState } from "../domain";
import {
  formatDate,
  formatDay,
  formatRange,
  type PortalLocale,
} from "../format";
import { Gantt } from "./gantt";
import { LoadFailed } from "./load-failed";
import { StatusPill } from "./status";

/*
 * The client timeline (#135; Figma CP-05 523:171, CP-T05 558:672, CP-M05 555:705): the
 * stages on a month grid (a stage list with range bars below 1024 px), today's line, the
 * current stage's progress, and the milestones. Finished stages are done and read-only;
 * clients never edit anything here. Server-rendered under RLS; only the chart's
 * once-a-session motion runs in the browser.
 */

const MONTHS_EN = [
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
];
const MONTHS_PT = [
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
];

function monthLabel(
  iso: string,
  locale: PortalLocale,
  firstOfYear: boolean,
): string {
  const month = Number(iso.slice(5, 7));
  const name = (locale === "pt" ? MONTHS_PT : MONTHS_EN)[month - 1] ?? "";
  return firstOfYear ? `${name} ${iso.slice(0, 4)}` : name;
}

export async function TimelineView({
  publicId,
  locale,
}: {
  publicId: string;
  locale: PortalLocale;
}) {
  await connection();
  let view: ProjectView | null;
  let milestones: Milestone[] = [];
  try {
    view = await getProjectView(publicId);
    if (view) milestones = await getMilestones(view.id);
  } catch (error) {
    Sentry.captureException(error, { tags: { feature: "portal-timeline" } });
    return <LoadFailed locale={locale} />;
  }
  if (!view) return null;

  const [t, health] = await Promise.all([
    getTranslations("Portal.timeline"),
    getTranslations("Portal.health"),
  ]);
  const today = lisbonToday(new Date());
  const current = currentStage(view.stages);
  const span = timelineSpan(view.stages, view.launchesOn);
  const firstStart = view.stages[0]?.startsOn ?? span.start;

  return (
    <div className="flex flex-col gap-lg">
      <header className="flex flex-col gap-2">
        <p className="text-[12px] font-medium tracking-[0.08em] text-text-muted uppercase">
          {t("eyebrow")}
        </p>
        <h1 className="text-h3 text-text-primary">{t("title")}</h1>
        <p className="text-[15px] text-text-muted">
          {t("summary", {
            stages: view.stages.length,
            start: formatDay(firstStart, locale),
            launch: formatDate(view.launchesOn, locale),
            health: health(view.health).toLowerCase(),
          })}
        </p>
      </header>

      {view.stages.length === 0 ? (
        <p className="text-body text-text-muted">{t("empty")}</p>
      ) : (
        <Gantt
          projectId={view.publicId}
          months={span.months.map((month, index) => ({
            key: month,
            label: monthLabel(
              month,
              locale,
              index > 0 && month.slice(5, 7) === "01",
            ),
            left: spanPosition(span, month),
          }))}
          rows={view.stages.map((stage) => {
            const state = stageState(stage, current);
            const left = spanPosition(span, stage.startsOn);
            const end = stage.endsOn ?? span.end;
            return {
              id: stage.id,
              name: stage.name,
              range: formatRange(
                stage.startsOn,
                stage.endsOn,
                locale,
                t("from"),
              ),
              state,
              left,
              width: spanPosition(span, end) - left,
              open: stage.endsOn === null,
              progress:
                state === "current"
                  ? stageProgress(view.tickets, stage.id)
                  : null,
            };
          })}
          today={
            today >= span.start && today < span.end
              ? {
                  left: spanPosition(span, today),
                  label: t("today", { day: formatDay(today, locale) }),
                }
              : null
          }
          labels={{
            stage: t("stage"),
            today: t("today", { day: formatDay(today, locale) }),
            done: String(t.raw("done")),
            state: {
              done: t("stateDone"),
              current: t("stateCurrent"),
              upcoming: t("stateUpcoming"),
            },
            chart: t("chartLabel", {
              start: formatDate(span.start, locale),
              end: formatDate(view.launchesOn, locale),
            }),
          }}
        />
      )}

      <section
        aria-labelledby="timeline-milestones"
        className="flex flex-col gap-md rounded-lg border border-border-default bg-bg-surface p-lg"
      >
        <div className="flex flex-col gap-1">
          <h2 id="timeline-milestones" className="text-label text-text-primary">
            {t("milestonesTitle")}
          </h2>
          <p className="text-[13px] text-text-muted">{t("milestonesIntro")}</p>
        </div>
        {milestones.length === 0 ? (
          <p className="text-small text-text-muted">{t("milestonesEmpty")}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border-default border-t border-border-default">
            {milestones.map((milestone) => (
              <li
                key={milestone.id}
                className="grid grid-cols-[1fr_auto] items-center gap-x-md gap-y-1 py-3 md:grid-cols-[80px_1fr_auto]"
              >
                <span className="text-[13px] text-text-muted md:text-[14px] md:text-text-primary">
                  {formatDay(milestone.dueOn, locale)}
                </span>
                <span className="col-span-2 row-start-2 flex flex-col gap-0.5 md:col-span-1 md:row-start-auto">
                  <span className="text-[14px] font-medium text-text-primary">
                    {milestone.title}
                  </span>
                  {milestone.body ? (
                    <span className="text-[13px] text-text-muted">
                      {milestone.body}
                    </span>
                  ) : null}
                </span>
                <StatusPill
                  status={milestone.done ? "done" : "todo"}
                  label={
                    milestone.done ? t("milestoneDone") : t("milestoneUpcoming")
                  }
                  className="row-start-1 justify-self-end md:row-start-auto"
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
