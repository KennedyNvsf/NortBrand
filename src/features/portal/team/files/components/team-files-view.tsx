import {
  Download,
  FileArchive,
  FileText,
  Image as ImageIcon,
  type LucideIcon,
} from "lucide-react";

import { ICON_STROKE } from "@/lib/icons";
import { cn } from "@/lib/utils";

import { fill } from "../../../auth/components/copy";
import {
  fileGroup,
  fileKind,
  formatSize,
  type FileGroup,
  type FileKind,
} from "../../../overview/content";
import { lisbonToday } from "../../../overview/domain";
import { formatDay } from "../../../overview/format";
import type { TeamFilesCopy } from "../../copy";
import type { TeamFile } from "../data";
import { FileMenu } from "./file-menu";
import { Uploader } from "./uploader";

/*
 * The team's Files tab (#140; Figma TM-08 544:789): the drop zone, then every file
 * grouped Design / Documents with type, size, who added it and when, whether the client
 * sees it, Download and the file's menu. Tablet drops "added by"; mobile stacks each file
 * (Portal · Responsive rules). Server-rendered; the uploader and menus are client code.
 */

const ICON: Record<FileKind, LucideIcon> = {
  pdf: FileText,
  zip: FileArchive,
  image: ImageIcon,
};
const GROUPS: FileGroup[] = ["design", "documents"];

export function TeamFilesView({
  copy,
  projectId,
  clientName,
  files,
  now,
}: {
  copy: TeamFilesCopy;
  projectId: string;
  clientName: string;
  files: TeamFile[];
  now: Date;
}) {
  const today = lisbonToday(now);
  const dayOf = (createdAt: string) => {
    const day = lisbonToday(new Date(createdAt));
    return day === today ? "today" : formatDay(day, "en");
  };

  return (
    <div className="flex flex-col gap-lg">
      <Uploader copy={copy} projectId={projectId} />

      {files.length === 0 ? (
        <p className="text-body text-text-muted">{copy.empty}</p>
      ) : (
        GROUPS.map((group) => {
          const items = files.filter(
            (file) => fileGroup(file.contentType) === group,
          );
          if (items.length === 0) return null;
          return (
            <section
              key={group}
              aria-labelledby={`team-files-${group}`}
              className="flex flex-col gap-md rounded-lg border border-border-default bg-bg-surface p-lg"
            >
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h2
                  id={`team-files-${group}`}
                  className="text-label text-text-primary"
                >
                  {copy.groups[group]}
                </h2>
                <p className="text-[13px] text-text-muted">
                  {copy.groupIntro[group]}
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
                            {copy.kinds[kind]} ·{" "}
                            {formatSize(file.sizeBytes, "en")}
                            <span className="lg:hidden">
                              {" "}
                              · {dayOf(file.createdAt)}
                            </span>
                          </span>
                        </span>
                      </div>
                      {file.uploaderName ? (
                        <span className="hidden w-44 text-[13px] text-text-muted lg:block">
                          {fill(copy.by, {
                            name: file.uploaderName,
                            day: dayOf(file.createdAt),
                          })}
                        </span>
                      ) : null}
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            "inline-flex w-36 items-center gap-1.5 text-[13px]",
                            file.shared ? "text-text-muted" : "",
                          )}
                        >
                          {file.shared ? (
                            <>
                              <span
                                aria-hidden
                                className="size-1.5 rounded-full bg-action-secondary"
                              />
                              {copy.visible}
                            </>
                          ) : (
                            <span className="rounded-sm border border-border-default px-1.5 py-0.5 text-[12px] text-text-primary">
                              {copy.teamOnly}
                            </span>
                          )}
                        </span>
                        <span className="flex-1 md:hidden" />
                        <a
                          href={`/api/portal/files/${file.id}`}
                          aria-label={fill(copy.downloadLabel, {
                            name: file.name,
                          })}
                          className="flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-md border border-border-default px-md text-[14px] font-medium text-text-primary hover:bg-bg-primary md:min-h-10"
                        >
                          {copy.download}
                          <Download
                            aria-hidden
                            strokeWidth={ICON_STROKE}
                            className="size-4"
                          />
                        </a>
                        <FileMenu
                          copy={copy}
                          projectId={projectId}
                          clientName={clientName}
                          file={{
                            id: file.id,
                            name: file.name,
                            shared: file.shared,
                          }}
                        />
                      </div>
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
