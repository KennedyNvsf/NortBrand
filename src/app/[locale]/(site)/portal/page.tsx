import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { locale as rootLocale } from "next/root-params";
import { Suspense } from "react";

import { AuthCard } from "@/features/portal/auth/components/auth-card";
import { BrandPanel } from "@/features/portal/auth/components/brand-panel";
import { ClientSignIn } from "@/features/portal/auth/components/client-sign-in";
import type { SignInCopy } from "@/features/portal/auth/components/copy";
import {
  getClientProjects,
  getPortalViewer,
} from "@/features/portal/auth/access";
import { redirect } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";

/*
 * Client Portal ("Track Project" until #77): the client portal's sign-in (Figma CP-01/CP-02, CP-08; #131), inside
 * the site's nav and footer with Client Portal active. Dynamic by design (ADR-009): it
 * reads the session, so a signed-in client goes straight to their project. Noindex, out
 * of the sitemap and disallowed in robots.txt, like the newsletter link pages.
 */

/** A message with `{placeholders}`, unformatted, for the browser to fill (copy.ts). */
function rawTemplate(value: unknown): string {
  if (typeof value !== "string")
    throw new Error("Expected a string message template");
  return value;
}

const STAGES = [
  "discovery",
  "design",
  "development",
  "review",
  "launch",
  "care",
] as const;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Metadata");
  // Like the newsletter link pages: noindex, no canonical or hreflang, no Referer.
  return {
    title: t("portalTitle"),
    description: t("portalDescription"),
    robots: { index: false, follow: false },
    referrer: "no-referrer",
  };
}

export default async function PortalSignInPage({
  searchParams,
}: PageProps<"/[locale]/portal">) {
  const requested = await rootLocale();
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  const t = await getTranslations("Portal.signIn");

  const copy: SignInCopy = {
    eyebrow: t("eyebrow"),
    title: t("title"),
    intro: t("intro"),
    email: t("email"),
    emailPlaceholder: t("emailPlaceholder"),
    projectId: t("projectId"),
    projectIdPlaceholder: t("projectIdPlaceholder"),
    projectIdHint: t("projectIdHint"),
    send: t("send"),
    sending: t("sending"),
    sendNote: t("sendNote"),
    lostId: t("lostId"),
    contactUs: t("contactUs"),
    noMatch: t("noMatch"),
    locked: t("locked"),
    rateLimited: t("rateLimited"),
    failed: t("failed"),
    codeTitle: t("codeTitle"),
    codeIntro: rawTemplate(t.raw("codeIntro")),
    codeLabel: t("codeLabel"),
    codeSubmit: t("codeSubmit"),
    codeChecking: t("codeChecking"),
    codeWrongOne: t("codeWrongOne"),
    codeWrongOther: rawTemplate(t.raw("codeWrongOther")),
    resendWait: t("resendWait"),
    resendPrompt: t("resendPrompt"),
    resendAction: t("resendAction"),
    codeSentAgain: t("codeSentAgain"),
    wrongAddress: t("wrongAddress"),
    useDifferentEmail: t("useDifferentEmail"),
    expiredTitle: t("expiredTitle"),
    expiredBody: rawTemplate(t.raw("expiredBody")),
    expiredAction: t("expiredAction"),
    signedOutTitle: t("signedOutTitle"),
    signedOutBody: t("signedOutBody"),
    signedOutAction: t("signedOutAction"),
    errors: {
      emailInvalid: t("errors.emailInvalid"),
      projectIdInvalid: t("errors.projectIdInvalid"),
      codeInvalid: t("errors.codeInvalid"),
    },
  };

  return (
    <main
      id="main"
      className="bg-bg-surface pb-16 md:px-(--gutter) md:pt-16 md:pb-24 lg:py-24"
    >
      <AuthCard
        form={
          <>
            {/* Static: the form renders and hydrates with the page, never waiting
                for the session. */}
            <ClientSignIn copy={copy} locale={locale} />
            {/* The session is request data (Cache Components): it streams in beside
                the form and only ever redirects. */}
            <Suspense fallback={null}>
              <SessionGate locale={locale} searchParams={searchParams} />
            </Suspense>
          </>
        }
        brand={
          <BrandPanel
            className="lg:flex-1"
            eyebrow={t("brandEyebrow")}
            title={t.rich("brandTitle", { br: () => <br /> })}
            body={t("brandBody")}
            stages={STAGES.map((stage) => t(`stages.${stage}`))}
          />
        }
      />
    </main>
  );
}

/*
 * Renders nothing. A signed-in client goes straight to their project; a session that
 * has ended (30 days, or signed out elsewhere) gets ?reason=signed-out, which the form
 * turns into "You've been signed out".
 */
async function SessionGate({
  locale,
  searchParams,
}: {
  locale: Locale;
  searchParams: PageProps<"/[locale]/portal">["searchParams"];
}) {
  const viewer = await getPortalViewer();
  if (viewer.status === "signed_in") {
    const [project] = await getClientProjects();
    if (project) redirect({ href: `/portal/${project.publicId}`, locale });
  }
  if (viewer.status === "signed_out") {
    const { reason } = await searchParams;
    if (reason !== "signed-out") {
      redirect({ href: "/portal?reason=signed-out", locale });
    }
  }
  return null;
}
