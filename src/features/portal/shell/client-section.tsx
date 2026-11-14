import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";

import { EmptyState } from "../states/empty-state";
import { PageSkeleton } from "../states/skeletons";
import { getClientShell } from "./client-data";

/*
 * A client portal section until its content ships (#133; content in #134/#135): the
 * section's H1 and the day-one state from CP-08 ("We're setting up your project."), which
 * is what a brand-new project shows anyway. Overview's H1 is the project name (CP-03).
 */

export type ClientSection =
  "overview" | "tasks" | "timeline" | "files" | "updates";

export function ClientSectionPage({
  params,
  section,
}: {
  params: Promise<{ projectId: string }>;
  section: ClientSection;
}) {
  return (
    <Suspense fallback={<SectionFallback />}>
      <SectionContent params={params} section={section} />
    </Suspense>
  );
}

async function SectionFallback() {
  const t = await getTranslations("Portal.shell");
  return <PageSkeleton label={t("loading")} />;
}

async function SectionContent({
  params,
  section,
}: {
  params: Promise<{ projectId: string }>;
  section: ClientSection;
}) {
  const { projectId } = await params;
  // The layout guards the session and the project; this read is shared with it (cache).
  const data = await getClientShell(projectId);
  if (!data) return null;

  const [shell, states] = await Promise.all([
    getTranslations("Portal.shell"),
    getTranslations("Portal.states"),
  ]);
  const title =
    section === "overview" ? data.project.name : shell(`nav.${section}`);
  const mailto = `mailto:${data.messageTo}?subject=${encodeURIComponent(
    `${data.project.name} (${data.project.publicId})`,
  )}`;

  return (
    <div className="flex flex-col gap-lg">
      <h1 className="text-h3 text-text-primary">{title}</h1>
      <EmptyState
        mark
        title={states("setupTitle")}
        body={states("setupBody")}
        action={
          <Button asChild variant="secondary" showIcon>
            <a href={mailto}>{states("setupAction")}</a>
          </Button>
        }
      />
    </div>
  );
}
