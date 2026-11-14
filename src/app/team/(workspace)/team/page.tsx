import type { Metadata } from "next";
import { Suspense } from "react";

import { getTeamViewer, listTeammates } from "@/features/portal/team/access";
import { TeamRoster } from "@/features/portal/team/components/team-roster";
import { teamPageCopy, teamShellCopy } from "@/features/portal/team/copy";
import { PageSkeleton } from "@/features/portal/states/skeletons";

/*
 * Team (#132, inside the #133 shell): the role summary and the team list with invite and
 * remove. The full TM-12 table (projects, open tickets, last active) is the My tickets /
 * Team / Settings ticket. The workspace layout guards the session.
 */

export const metadata: Metadata = { title: teamPageCopy.metaTitle };

export default function TeamPage() {
  return (
    <Suspense fallback={<PageSkeleton label={teamShellCopy.loading} />}>
      <TeamContent />
    </Suspense>
  );
}

async function TeamContent() {
  const viewer = await getTeamViewer();
  if (viewer.status !== "signed_in") return null;
  const team = await listTeammates();
  const copy = teamPageCopy;

  return (
    <div className="flex flex-col gap-lg">
      <h1 className="text-h3 text-text-primary">{copy.title}</h1>
      <div className="grid gap-md md:grid-cols-2">
        <div className="rounded-lg border border-border-default p-lg">
          <h2 className="text-label text-text-primary">{copy.admin}</h2>
          <p className="text-small text-text-muted">{copy.adminSummary}</p>
        </div>
        <div className="rounded-lg border border-border-default p-lg">
          <h2 className="text-label text-text-primary">{copy.member}</h2>
          <p className="text-small text-text-muted">{copy.memberSummary}</p>
        </div>
      </div>
      <TeamRoster
        copy={copy}
        team={team}
        viewer={{ userId: viewer.userId, role: viewer.role }}
      />
    </div>
  );
}
