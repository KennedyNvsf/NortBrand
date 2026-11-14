import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { OverviewView } from "@/features/portal/overview/components/overview-view";
import { PageSkeleton } from "@/features/portal/states/skeletons";
import { routing } from "@/i18n/routing";

/* Overview (CP-03, #134). The layout guards the session and the project. */

export default async function OverviewPage({
  params,
}: PageProps<"/[locale]/portal/[projectId]">) {
  const t = await getTranslations("Portal.shell");
  return (
    <Suspense fallback={<PageSkeleton label={t("loading")} />}>
      <Overview params={params} />
    </Suspense>
  );
}

async function Overview({
  params,
}: {
  params: PageProps<"/[locale]/portal/[projectId]">["params"];
}) {
  const { locale, projectId } = await params;
  return (
    <OverviewView
      publicId={projectId}
      locale={locale === "en" ? "en" : routing.defaultLocale}
    />
  );
}
