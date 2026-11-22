import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { loadPreview, previewBase } from "@/features/portal/preview/gate";
import { ShellSkeleton } from "@/features/portal/states/skeletons";
import { teamShellCopy } from "@/features/portal/team/copy";

/*
 * View as client (#160): /team/projects/<NB-xxxx>/preview opens the preview in the
 * language most of the project's clients use (EN or PT).
 */

type Props = PageProps<"/team/projects/[projectId]/preview">;

export default function PreviewEntry({ params }: Props) {
  return (
    <Suspense fallback={<ShellSkeleton label={teamShellCopy.loading} />}>
      <Entry params={params} />
    </Suspense>
  );
}

async function Entry({ params }: { params: Props["params"] }): Promise<null> {
  const { projectId } = await params;
  const bundle = await loadPreview(projectId);
  if (bundle === null) notFound();
  return redirect(
    previewBase(projectId, bundle === "failed" ? "pt" : bundle.clientLocale),
  );
}
