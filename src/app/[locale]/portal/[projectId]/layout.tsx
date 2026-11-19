import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { locale as rootLocale } from "next/root-params";
import { Suspense, type ReactNode } from "react";

import {
  getClientProjects,
  getPortalViewer,
} from "@/features/portal/auth/access";
import { getClientShell } from "@/features/portal/shell/client-data";
import {
  ClientShell,
  type ClientShellCopy,
} from "@/features/portal/shell/client-shell";
import { ShellSkeleton } from "@/features/portal/states/skeletons";
import { redirect } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";

/*
 * The signed-in client portal (#133): guard + shell for every section of one project.
 * - No valid session (or the 30-day marker ran out): back to sign-in, which shows
 *   "You've been signed out" (CP-08).
 * - A Project ID this user can't read: 404. RLS decides; a guessed ID looks missing.
 *   With no readable project at all (the ID was rotated, #141): signed out.
 * - Per request and per user (ADR-009): read inside Suspense; the fallback is the shell
 *   skeleton, shown only after 300 ms. Noindex.
 */

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

type Params = LayoutProps<"/[locale]/portal/[projectId]">["params"];

export default async function ClientPortalLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Params;
}) {
  const requested = await rootLocale();
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;
  const t = await getTranslations("Portal.shell");

  return (
    <Suspense fallback={<ShellSkeleton label={t("loading")} />}>
      <ShellGate params={params} locale={locale}>
        {children}
      </ShellGate>
    </Suspense>
  );
}

async function ShellGate({
  params,
  locale,
  children,
}: {
  params: Params;
  locale: Locale;
  children: ReactNode;
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

  const data = await getClientShell(projectId);
  if (!data) {
    // Signed in, but no project is readable at all: the Project ID was rotated, which
    // ends every client session for the project in SQL (#141). Treat it as signed out.
    if ((await getClientProjects()).length === 0) {
      redirect({ href: "/portal?reason=signed-out", locale });
    }
    notFound();
  }

  const t = await getTranslations("Portal.shell");
  const copy: ClientShellCopy = {
    projectLabel: t("projectLabel"),
    navLabel: t("navLabel"),
    nav: {
      overview: t("nav.overview"),
      tasks: t("nav.tasks"),
      timeline: t("nav.timeline"),
      files: t("nav.files"),
      updates: t("nav.updates"),
    },
    yourTeam: t("yourTeam"),
    messageTeam: t("messageTeam"),
    messageShort: t("messageShort"),
    account: t("account"),
    signOut: t("signOut"),
    switchProject: t("switchProject"),
  };

  return (
    <ClientShell data={data} locale={locale} copy={copy}>
      {children}
    </ClientShell>
  );
}
