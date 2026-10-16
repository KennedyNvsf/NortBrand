import { createTranslator } from "next-intl";

import { services } from "@/content/services";
import { site } from "@/content/site";
import { localeNames, type Locale } from "@/i18n/routing";
import {
  emailMessages as messages,
  toEmail,
  type RenderedEmail,
} from "@/lib/email/render";

import type { ConsultationRequest } from "../schema";
import { ConsultationAlertEmail } from "./consultation-alert";
import { ConsultationConfirmationEmail } from "./consultation-confirmation";

export type { RenderedEmail };

function serviceName(locale: Locale, slug: ConsultationRequest["service"]) {
  const t = createTranslator({
    locale,
    messages: messages[locale],
    namespace: "ServiceNames",
  });
  const service = services.find((entry) => entry.slug === slug);
  return service ? t(service.key) : slug;
}

/** Lisbon wall-clock time (CLAUDE.md: store UTC, show Lisbon time in emails). */
export function formatLisbonTime(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: site.timeZone,
  }).format(date);
}

/** The team alert: English, every field, the Lisbon receive time and the row id. */
export function renderConsultationAlert(
  request: ConsultationRequest,
  requestId: string,
  receivedAt: Date,
): Promise<RenderedEmail> {
  const t = createTranslator({
    locale: "en",
    messages: messages.en,
    namespace: "Emails.consultationAlert",
  });
  const service = serviceName("en", request.service);
  const received = t("receivedAt", { date: formatLisbonTime(receivedAt) });

  return toEmail(
    t("subject", { name: request.name, service }),
    <ConsultationAlertEmail
      studio={site.name}
      message={request.message}
      copy={{
        preview: t("preview", { service, receivedAt: received }),
        heading: t("heading"),
        footer: t("footer", { name: request.name }),
        messageLabel: t("messageLabel"),
        rows: [
          { label: t("nameLabel"), value: request.name },
          {
            label: t("emailLabel"),
            value: request.email,
            href: `mailto:${request.email}`,
          },
          request.phone
            ? {
                label: t("phoneLabel"),
                value: request.phone,
                href: `tel:${request.phone.replace(/[^\d+]/g, "")}`,
              }
            : { label: t("phoneLabel"), value: t("noPhone") },
          { label: t("serviceLabel"), value: service },
          { label: t("localeLabel"), value: localeNames[request.locale] },
          { label: t("receivedLabel"), value: received },
          { label: t("referenceLabel"), value: requestId },
        ],
      }}
    />,
  );
}

/** The visitor confirmation, in the request's locale. */
export function renderConsultationConfirmation(
  request: ConsultationRequest,
): Promise<RenderedEmail> {
  const { locale } = request;
  const t = createTranslator({
    locale,
    messages: messages[locale],
    namespace: "Emails.consultationConfirmation",
  });
  const service = serviceName(locale, request.service);
  const rows = [{ label: t("serviceLabel"), value: service }];
  if (request.phone)
    rows.push({ label: t("phoneLabel"), value: request.phone });

  return toEmail(
    t("subject"),
    <ConsultationConfirmationEmail
      locale={locale}
      studio={site.name}
      message={request.message}
      copy={{
        preview: t("preview"),
        greeting: t("greeting", { name: request.name }),
        intro: t("intro", { service }),
        summaryTitle: t("summaryTitle"),
        rows,
        messageLabel: t("messageLabel"),
        signoff: t("signoff"),
        team: t("team", { studio: site.name }),
        footer: t("footer", {
          site: site.name,
          email: site.contact.email.value,
        }),
      }}
    />,
  );
}
