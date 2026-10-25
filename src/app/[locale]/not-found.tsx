import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { highlightTags } from "@/components/site/highlight";
import { NotFoundContent } from "@/components/site/not-found-content";
import { SiteNav } from "@/components/site/site-nav";
import { Button } from "@/components/ui/button";
import { BOOKING_HREF } from "@/content/navigation";
import { Link } from "@/i18n/navigation";

/*
 * Localized 404 for every unknown path under /en and /pt (rendered by the catch-all
 * [...rest] route, and by any notFound() call inside [locale]). It sits outside the
 * (site) route group on purpose: the nav stays, but there is no footer and no sticky
 * CTA (Handoff: "Footer: shared by every page except the 404"). noindex, and no
 * canonical or hreflang: a 404 has no URL worth indexing.
 *
 * The <title> is also rendered here (React 19 hoists it into the head): with Cache
 * Components the notFound() boundary renders in the browser and its metadata title
 * never arrives, so the tab kept the Home title (WCAG 2.4.2, #94; see tech-debt).
 */

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Metadata");
  return { title: t("notFoundTitle"), robots: { index: false } };
}

export default async function LocaleNotFound() {
  const [t, tMeta] = await Promise.all([
    getTranslations("NotFound"),
    getTranslations("Metadata"),
  ]);

  return (
    <div className="flex min-h-dvh flex-col">
      <title>{`${tMeta("notFoundTitle")} · ${tMeta("siteName")}`}</title>
      <SiteNav />
      <NotFoundContent
        title={t.rich("title", highlightTags)}
        lead={t("lead")}
        actions={
          <>
            <Button asChild showIcon className="w-full md:w-auto">
              <Link href="/">{t("home")}</Link>
            </Button>
            <Button
              asChild
              variant="secondary"
              showIcon
              className="w-full md:w-auto"
            >
              <Link href={BOOKING_HREF}>{t("contact")}</Link>
            </Button>
          </>
        }
      />
    </div>
  );
}
