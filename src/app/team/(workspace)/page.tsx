import type { Metadata } from "next";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import { teamPagesCopy, teamShellCopy } from "@/features/portal/team/copy";
import { getTeamShell } from "@/features/portal/team/shell-data";
import { EmptyState } from "@/features/portal/states/empty-state";
import { PageSkeleton } from "@/features/portal/states/skeletons";

/*
 * Projects, the team's landing page (#133). The projects table is the projects ticket
 * (#136); until then: the first-run state (TM-09 "Projects · first run") when there are
 * none, otherwise the count. "New project" is for admins and arrives with #136.
 */

export const metadata: Metadata = { title: teamPagesCopy.projects.title };

export default function ProjectsPage() {
  return (
    <Suspense fallback={<PageSkeleton label={teamShellCopy.loading} />}>
      <ProjectsContent />
    </Suspense>
  );
}

async function ProjectsContent() {
  const data = await getTeamShell();
  if (!data) return null;
  const copy = teamPagesCopy.projects;
  const isAdmin = data.viewer.role === "admin";

  return (
    <div className="flex flex-col gap-lg">
      <h1 className="text-h3 text-text-primary">{copy.title}</h1>
      {data.counts.projects === 0 ? (
        <EmptyState
          title={copy.emptyTitle}
          body={isAdmin ? copy.emptyBody : copy.emptyMemberBody}
          action={
            isAdmin ? (
              <Button type="button" disabled title={copy.listNote}>
                {copy.newProject}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <p className="text-body text-text-muted">
          {data.counts.projects} {copy.title.toLowerCase()} · {copy.listNote}
        </p>
      )}
    </div>
  );
}
