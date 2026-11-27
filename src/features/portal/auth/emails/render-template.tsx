import { createTranslator } from "next-intl";

import { site } from "@/content/site";
import type { Locale } from "@/i18n/routing";
import { emailMessages, toEmail } from "@/lib/email/render";

import { PortalCodeEmail } from "./portal-code";

/*
 * Supabase's sign-in code email template (#131): both languages in one file, chosen by
 * the user's metadata. Invitations (#136, #141) store `locale` in user_metadata;
 * anything else gets Portuguese, the primary market (ADR-006).
 *
 * The output is committed as supabase/templates/portal-code.html. The file snapshot test
 * (render-template.test.ts) fails when it drifts from this component; regenerate with
 * `pnpm test -- -u`, then paste the file into each hosted project's Auth email template
 * (environments guide § 2).
 */

/** Supabase replaces this with the code when it sends the email. */
export const SUPABASE_TOKEN = "{{ .Token }}";

/** One subject for both languages: Supabase's subject line can't branch reliably. */
export const PORTAL_CODE_SUBJECT = `${site.name}: your sign-in code / o teu código de acesso`;

async function renderLocale(locale: Locale): Promise<string> {
  const t = createTranslator({
    locale,
    messages: emailMessages[locale],
    namespace: "Emails.portalCode",
  });
  const { html } = await toEmail(
    PORTAL_CODE_SUBJECT,
    <PortalCodeEmail
      locale={locale}
      studio={site.name}
      code={SUPABASE_TOKEN}
      copy={{
        preview: t("preview"),
        heading: t("heading"),
        intro: t("intro", { studio: site.name }),
        codeLabel: t("codeLabel"),
        expiry: t("expiry"),
        ignore: t("ignore"),
        footer: t("footer", { site: site.name }),
      }}
    />,
  );
  return html;
}

export async function renderPortalCodeTemplate(): Promise<string> {
  const [en, pt] = await Promise.all([renderLocale("en"), renderLocale("pt")]);
  return `{{ if eq .Data.locale "en" }}\n${en}\n{{ else }}\n${pt}\n{{ end }}\n`;
}
