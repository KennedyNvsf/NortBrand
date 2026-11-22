import * as Sentry from "@sentry/nextjs";
import {
  Download,
  FileArchive,
  FileText,
  Image as ImageIcon,
  type LucideIcon,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { connection } from "next/server";

import { ICON_STROKE } from "@/lib/icons";

import {
  fileGroup,
  fileKind,
  formatSize,
  type FileGroup,
  type FileKind,
} from "../content";
import {
  getProjectFiles,
  getProjectView,
  type PortalFile,
  type ProjectView,
} from "../data";
import { lisbonToday } from "../domain";
import { formatDay, type PortalLocale } from "../format";
import type { PreviewTarget } from "../scope";
import { LoadFailed } from "./load-failed";

/*
 * The client's files (#135; Figma CP-06 524:223, CP-T06 558:809, CP-M06 556:519): shared
 * files only (project_files RLS), grouped Design / Documents, with type, size, who added
 * it and when. Downloads are plain links to /api/portal/files/<id>, which checks again
 * and hands out a 60-second signed URL. Tablet drops the "added by" column; mobile stacks
 * each file as a card.
 */

const ICON: Record<FileKind, LucideIcon> = {
  pdf: FileText,
  zip: FileArchive,
  image: ImageIcon,
};
const GROUPS: FileGroup[] = ["design", "documents"];

export async function FilesView({
  publicId,
  locale,
  preview,
}: {
  publicId: string;
  locale: PortalLocale;
  /** View as client (#160): render the team's preview of this project. */
  preview?: PreviewTarget;
}) {
  await connection();
  let view: ProjectView | null;
  let files: PortalFile[] = [];
  try {
    view = await getProjectView(publicId, Boolean(preview));
    if (view) files = await getProjectFiles(view.id, preview?.publicId);
  } catch (error) {
    Sentry.captureException(error, { tags: { feature: "portal-files" } });
    return <LoadFailed locale={locale} />;
  }
  if (!view) return null;

  const t = await getTranslations({ locale, namespace: "Portal.files" });
  const today = lisbonToday(new Date());
  const latest = files[0];
  const dayOf = (createdAt: string) => {
    const day = lisbonToday(new Date(createdAt));
    return day === today ? t("today") : formatDay(day, locale);
  };

  return (
    <div className="flex flex-col gap-lg">
      <header className="flex flex-col gap-2">
        <p className="text-[12px] font-medium tracking-[0.08em] text-text-muted uppercase">
          {t("eyebrow")}
        </p>
        <h1 className="text-h3 text-text-primary">{t("title")}</h1>
        <p className="text-[15px] text-text-muted">
          {latest
            ? t("summary", {
                count: files.length,
                day: dayOf(latest.createdAt),
              })
            : t("summaryEmpty")}
        </p>
      </header>

      {files.length === 0 ? (
        <p className="text-body text-text-muted">{t("empty")}</p>
      ) : (
        GROUPS.map((group) => {
          const items = files.filter(
            (file) => fileGroup(file.contentType) === group,
          );
          if (items.length === 0) return null;
          return (
            <section
              key={group}
              aria-labelledby={`files-${group}`}
              className="flex flex-col gap-md rounded-lg border border-border-default bg-bg-surface p-lg"
            >
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h2
                  id={`files-${group}`}
                  className="text-label text-text-primary"
                >
                  {t(`groups.${group}`)}
                </h2>
                <p className="text-[13px] text-text-muted">
                  {t(`groupIntro.${group}`)}
                </p>
              </div>
              <ul className="flex flex-col divide-y divide-border-default border-t border-border-default">
                {items.map((file) => {
                  const kind = fileKind(file.contentType);
                  const Icon = ICON[kind];
                  return (
                    <li
                      key={file.id}
                      className="flex flex-col gap-3 py-3 md:flex-row md:items-center md:gap-md"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <span
                          aria-hidden
                          className="grid size-10 shrink-0 place-items-center rounded-md bg-bg-primary"
                        >
                          <Icon
                            strokeWidth={ICON_STROKE}
                            className="size-[18px]"
                          />
                        </span>
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate text-[14px] font-medium text-text-primary">
                            {file.name}
                          </span>
                          <span className="text-[12px] text-text-muted">
                            {t(`kinds.${kind}`)} ·{" "}
                            {formatSize(file.sizeBytes, locale)}
                            <span className="lg:hidden">
                              {" "}
                              · {dayOf(file.createdAt)}
                            </span>
                          </span>
                        </span>
                      </div>
                      {file.uploaderName ? (
                        <span className="hidden w-48 text-[13px] text-text-muted lg:block">
                          {t("by", {
                            name: file.uploaderName,
                            day: dayOf(file.createdAt),
                          })}
                        </span>
                      ) : null}
                      <a
                        href={`/api/portal/files/${file.id}`}
                        aria-label={t("downloadLabel", { name: file.name })}
                        className="flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-md border border-border-default px-md text-[14px] font-medium text-text-primary hover:bg-bg-primary md:min-h-10"
                      >
                        {t("download")}
                        <Download
                          aria-hidden
                          strokeWidth={ICON_STROKE}
                          className="size-4"
                        />
                      </a>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })
      )}
    </div>
  );
}
