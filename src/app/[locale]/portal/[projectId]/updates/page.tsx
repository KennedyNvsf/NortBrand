import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { UpdatesView } from "@/features/portal/overview/components/updates-view";
import { PageSkeleton } from "@/features/portal/states/skeletons";
import { routing } from "@/i18n/routing";

/* Updates (#135). The layout guards the session and the project. */

type Props = PageProps<"/[locale]/portal/[projectId]/updates">;

export default async function Page({ params }: Props) {
  const t = await getTranslations("Portal.shell");
  return (
    <Suspense fallback={<PageSkeleton label={t("loading")} />}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: Pick<Props, "params">) {
  const { locale, projectId } = await params;
  return (
    <UpdatesView
      publicId={projectId}
      locale={locale === "en" ? "en" : routing.defaultLocale}
    />
  );
}
