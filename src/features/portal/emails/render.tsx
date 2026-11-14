import { createTranslator } from "next-intl";

import { site } from "@/content/site";
import type { Locale } from "@/i18n/routing";
import { emailMessages, toEmail, type RenderedEmail } from "@/lib/email/render";

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
