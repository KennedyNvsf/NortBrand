import { Suspense } from "react";

import { TimelineView } from "@/features/portal/overview/components/timeline-view";
import { previewBase } from "@/features/portal/preview/gate";
import { PageSkeleton } from "@/features/portal/states/skeletons";
import { teamShellCopy } from "@/features/portal/team/copy";

/* View as client (#160) · Timeline (CP-05), as the project's client sees it. */

type Props = PageProps<"/team/projects/[projectId]/preview/[lang]/timeline">;

export default function PreviewPage({ params }: Props) {
  return (
    <Suspense fallback={<PageSkeleton label={teamShellCopy.loading} />}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: { params: Props["params"] }) {
  const { projectId, lang } = await params;
  const locale = lang === "en" ? "en" : "pt";
  const publicId = projectId.toUpperCase();
  return (
    <TimelineView
      publicId={publicId}
      locale={locale}
      preview={{ base: previewBase(publicId, locale), publicId }}
    />
  );
}
