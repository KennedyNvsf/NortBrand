import type { ReactNode } from "react";
import { Suspense } from "react";

import { PreviewGate } from "@/features/portal/preview/gate";
import { ShellSkeleton } from "@/features/portal/states/skeletons";
import { teamShellCopy } from "@/features/portal/team/copy";

/*
 * View as client (#160): the client portal frame for the team, per request and per user
 * like every portal page (ADR-009), outside the team workspace shell. Read-only: the
 * screens have no actions, and nothing here calls a write.
 */

type Props = LayoutProps<"/team/projects/[projectId]/preview/[lang]">;

export default function PreviewLayout({ children, params }: Props) {
  return (
    <Suspense fallback={<ShellSkeleton label={teamShellCopy.loading} />}>
      <Gate params={params}>{children}</Gate>
    </Suspense>
  );
}

async function Gate({
  params,
  children,
}: {
  params: Props["params"];
  children: ReactNode;
}) {
  const { projectId, lang } = await params;
  return (
    <PreviewGate publicId={projectId} lang={lang}>
      {children}
    </PreviewGate>
  );
}
