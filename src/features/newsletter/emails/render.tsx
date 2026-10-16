import { createTranslator } from "next-intl";

import { site } from "@/content/site";
import type { Locale } from "@/i18n/routing";
import { emailMessages, toEmail, type RenderedEmail } from "@/lib/email/render";

import { NewsletterConfirmationEmail } from "./newsletter-confirmation";

/** The double opt-in email, in the locale the visitor subscribed in. */
export function renderNewsletterConfirmation(
  email: string,
  locale: Locale,
  confirmUrl: string,
): Promise<RenderedEmail> {
  const t = createTranslator({
    locale,
    messages: emailMessages[locale],
    namespace: "Emails.newsletterConfirmation",
  });

  return toEmail(
    t("subject", { studio: site.name }),
    <NewsletterConfirmationEmail
      locale={locale}
      studio={site.name}
      confirmUrl={confirmUrl}
      copy={{
        preview: t("preview"),
        heading: t("heading"),
        intro: t("intro", { studio: site.name, email }),
        button: t("button"),
        expiry: t("expiry"),
        fallback: t("fallback"),
        ignore: t("ignore"),
        footer: t("footer", { site: site.name }),
      }}
    />,
  );
}
