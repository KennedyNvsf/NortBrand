import { Suspense } from "react";

import { TasksView } from "@/features/portal/overview/components/tasks-view";
import { previewBase } from "@/features/portal/preview/gate";
import { PageSkeleton } from "@/features/portal/states/skeletons";
import { teamShellCopy } from "@/features/portal/team/copy";

/* View as client (#160) · Tasks (CP-04): ?status= filters, ?task=N opens the detail, as the project's client sees it. */

type Props = PageProps<"/team/projects/[projectId]/preview/[lang]/tasks">;

export default function PreviewPage({ params, searchParams }: Props) {
  return (
    <Suspense fallback={<PageSkeleton label={teamShellCopy.loading} />}>
      <Content params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Content({ params, searchParams }: Props) {
  const [{ projectId, lang }, search] = await Promise.all([
    params,
    searchParams,
  ]);
  const locale = lang === "en" ? "en" : "pt";
  const publicId = projectId.toUpperCase();
  return (
    <TasksView
      publicId={publicId}
      locale={locale}
      preview={{ base: previewBase(publicId, locale), publicId }}
      statusParam={search.status}
      taskParam={search.task}
    />
  );
}
