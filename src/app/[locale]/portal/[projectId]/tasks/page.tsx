import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { TasksView } from "@/features/portal/overview/components/tasks-view";
import { PageSkeleton } from "@/features/portal/states/skeletons";
import { routing } from "@/i18n/routing";

/* Tasks (CP-04, #134): ?status= filters, ?task=N opens the detail. */

type Props = PageProps<"/[locale]/portal/[projectId]/tasks">;

export default async function TasksPage({ params, searchParams }: Props) {
  const t = await getTranslations("Portal.shell");
  return (
    <Suspense fallback={<PageSkeleton label={t("loading")} />}>
      <Tasks params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Tasks({ params, searchParams }: Props) {
  const [{ locale, projectId }, search] = await Promise.all([
    params,
    searchParams,
  ]);
  return (
    <TasksView
      publicId={projectId}
      locale={locale === "en" ? "en" : routing.defaultLocale}
      statusParam={search.status}
      taskParam={search.task}
    />
  );
}
