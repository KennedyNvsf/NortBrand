import { createTranslator } from "next-intl";

import { site } from "@/content/site";
import type { Locale } from "@/i18n/routing";
import { emailMessages, toEmail, type RenderedEmail } from "@/lib/email/render";

import { PortalUpdateEmail } from "./portal-update";
import { PortalWelcomeEmail } from "./portal-welcome";

export type PortalWelcome = {
  email: string;
  locale: Locale;
  projectId: string;
  projectName: string;
  clientName: string;
  leadName: string;
  /** The site's origin, e.g. https://nortbrand.pt (passed in so this stays env-free). */
  siteUrl: string;
};

/** The welcome email, in the client's language, linking that language's sign-in page. */
export function renderPortalWelcome(
  welcome: PortalWelcome,
): Promise<RenderedEmail> {
  const t = createTranslator({
    locale: welcome.locale,
    messages: emailMessages[welcome.locale],
    namespace: "Emails.portalWelcome",
  });
  const signInUrl = `${welcome.siteUrl.replace(/\/$/, "")}/${welcome.locale}/portal`;

  return toEmail(
    t("subject", { project: welcome.projectName }),
    <PortalWelcomeEmail
      locale={welcome.locale}
      studio={site.name}
      projectId={welcome.projectId}
      signInUrl={signInUrl}
      copy={{
        preview: t("preview", { projectId: welcome.projectId }),
        heading: t("heading", { project: welcome.projectName }),
        intro: t("intro", {
          lead: welcome.leadName,
          client: welcome.clientName,
          studio: site.name,
        }),
        idLabel: t("idLabel"),
        howTo: t("howTo", { email: welcome.email }),
        button: t("button"),
        fallback: t("fallback"),
        footer: t("footer", { studio: site.name, email: welcome.email }),
      }}
    />,
  );
}

export type PortalUpdateNotice = {
  locale: Locale;
  projectName: string;
  publicId: string;
  authorName: string;
  body: string;
  /** The site's origin, e.g. https://nortbrand.pt. */
  siteUrl: string;
};

/** A team update, in the client's language, linking that project's portal. */
export function renderPortalUpdate(
  notice: PortalUpdateNotice,
): Promise<RenderedEmail> {
  const t = createTranslator({
    locale: notice.locale,
    messages: emailMessages[notice.locale],
    namespace: "Emails.portalUpdate",
  });
  const portalUrl = `${notice.siteUrl.replace(/\/$/, "")}/${notice.locale}/portal/${notice.publicId}`;
  const values = {
    project: notice.projectName,
    author: notice.authorName,
    studio: site.name,
  };

  return toEmail(
    t("subject", values),
    <PortalUpdateEmail
      locale={notice.locale}
      studio={site.name}
      body={notice.body}
      portalUrl={portalUrl}
      copy={{
        preview: t("preview", values),
        heading: t("heading", values),
        byline: t("byline", values),
        button: t("button"),
        fallback: t("fallback"),
        footer: t("footer", values),
      }}
    />,
  );
}
