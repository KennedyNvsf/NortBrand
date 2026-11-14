import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { locale as rootLocale } from "next/root-params";
import { Suspense } from "react";

import { Logo } from "@/components/site/logo";
import { SignOutButton } from "@/features/portal/auth/components/sign-out-button";
import {
  getClientProject,
  getPortalViewer,
} from "@/features/portal/auth/access";
import { redirect } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";

/*
 * A client's project (#131). For now only the guard and a placeholder: the portal shell
 * (#133) and the overview (#134) replace the content. Logged in docs/tech-debt.md.
 * - No valid session (or the 30-day marker ran out): back to sign-in, which shows
 *   "You've been signed out" (CP-08).
 * - A Project ID this user can't read: 404. RLS decides; a guessed ID looks missing.
 * - Rendering (Cache Components): the shell (logo) is static; the session is request
 *   data, read inside a Suspense boundary and rendered per request. Nothing about a
 *   project is cached: the content is per user (ADR-009). Noindex.
 */

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

type Params = PageProps<"/[locale]/portal/[projectId]">["params"];

export default async function ClientProjectPage({
  params,
}: {
  params: Params;
}) {
  const requested = await rootLocale();
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return (
    <main
      id="main"
      className="mx-auto flex min-h-dvh w-full max-w-reading flex-col gap-lg px-(--gutter) py-16"
    >
      <Logo />
      <Suspense fallback={<div aria-hidden className="h-40" />}>
        <ProjectContent params={params} locale={locale} />
      </Suspense>
    </main>
  );
}

async function ProjectContent({
  params,
  locale,
}: {
  params: Params;
  locale: Locale;
}) {
  const { projectId } = await params;
  const viewer = await getPortalViewer();
  if (viewer.status !== "signed_in") {
    redirect({
      href:
        viewer.status === "signed_out"
          ? "/portal?reason=signed-out"
          : "/portal",
      locale,
    });
  }

  const project = await getClientProject(projectId);
  if (!project) notFound();

  const t = await getTranslations("Portal.project");

  return (
    <>
      <div className="flex flex-col gap-3">
        <p className="text-overline text-action-secondary">{t("eyebrow")}</p>
        <h1 className="text-h1 text-text-primary">{project.name}</h1>
        <p className="text-body text-text-muted">{t("comingSoon")}</p>
      </div>
      <SignOutButton label={t("signOut")} locale={locale} />
    </>
  );
}
