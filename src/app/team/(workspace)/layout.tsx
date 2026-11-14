import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";

import { TeamShell } from "@/features/portal/team/components/team-shell";
import { teamShellCopy } from "@/features/portal/team/copy";
import { getTeamShell } from "@/features/portal/team/shell-data";
import { ShellSkeleton } from "@/features/portal/states/skeletons";

/*
 * The team workspace (#133): guard + shell for every signed-in team page. No valid
 * session, or not (or no longer) an active teammate: back to sign-in. Per request and
 * per user (ADR-009); the fallback is the shell skeleton, shown only after 300 ms.
 */
export default function TeamWorkspaceLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <Suspense fallback={<ShellSkeleton label={teamShellCopy.loading} />}>
      <WorkspaceGate>{children}</WorkspaceGate>
    </Suspense>
  );
}

async function WorkspaceGate({ children }: { children: ReactNode }) {
  const data = await getTeamShell();
  if (!data) redirect("/team/sign-in");
  return <TeamShell data={data}>{children}</TeamShell>;
}
