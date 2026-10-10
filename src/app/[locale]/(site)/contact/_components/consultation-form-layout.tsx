import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { services } from "@/content/services";
import { site } from "@/content/site";

/*
 * Figma Contact › Form Card (278:114, tablet 378:134, mobile 378:353): the consultation
 * request form's LAYOUT ONLY. The server action, validation, Supabase RPC, emails and
 * the Sending / Sent / Failed states come with the form ticket (docs/tech-debt.md).
 * - Nothing here can submit: there is no <form> element, and every control sits in a
 *   disabled <fieldset>, so fields and the button are disabled, unfocusable and shown
 *   in their designed Disabled state. The note under the button says why and gives
 *   the email address instead (draft copy, removed with the form ticket).
 * - Field names, ids, input types and autocomplete are already the real ones, and the
 *   service options use the consultation slugs, so the form ticket only adds behaviour.
 * - data-form-slot marks the card for that ticket.
 */
export async function ConsultationFormLayout() {
  const t = await getTranslations("Contact.form");
  const names = await getTranslations("ServiceNames");
  const email = site.contact.email.value;

  return (
    <div
      id="consultation"
      data-form-slot="consultation"
      className="flex flex-col gap-4.5 rounded-lg border border-border-default bg-bg-surface p-6 shadow-card md:p-8 lg:w-140 lg:shrink-0 lg:gap-lg lg:p-9"
    >
      <div className="flex flex-col gap-1.5">
        <h2 id="consultation-title" className="text-h3 text-text-primary">
          {t("title")}
        </h2>
        <p className="text-small text-text-muted">{t("subtitle")}</p>
      </div>

      <fieldset
        disabled
        aria-describedby="consultation-unavailable"
        className="flex min-w-0 flex-col gap-4.5 lg:gap-lg"
      >
        <legend className="sr-only">{t("title")}</legend>

        <div className="flex flex-col gap-4.5 md:flex-row md:gap-lg">
          <Field id="contact-name" label={t("name")}>
            <Input
              id="contact-name"
              name="name"
              autoComplete="name"
              placeholder={t("namePlaceholder")}
            />
          </Field>
          <Field id="contact-email" label={t("email")}>
            <Input
              id="contact-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder={t("emailPlaceholder")}
            />
          </Field>
        </div>

        <Field id="contact-phone" label={t("phone")}>
          <Input
            id="contact-phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            placeholder={t("phonePlaceholder")}
          />
        </Field>

        <Field id="contact-service" label={t("service")}>
          <Select name="service" disabled>
            <SelectTrigger id="contact-service">
              <SelectValue placeholder={t("servicePlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {services.map(({ slug, key }) => (
                <SelectItem key={slug} value={slug}>
                  {names(key)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field id="contact-message" label={t("message")}>
          <Textarea
            id="contact-message"
            name="message"
            placeholder={t("messagePlaceholder")}
          />
        </Field>

        <Button disabled showIcon className="w-full">
          {t("submit")}
        </Button>
      </fieldset>

      <p
        id="consultation-unavailable"
        className="text-center text-caption text-text-muted"
      >
        {t.rich("unavailable", {
          email: () => (
            <a
              href={`mailto:${email}`}
              className="font-medium text-text-accent underline underline-offset-2"
            >
              {email}
            </a>
          ),
        })}
      </p>
    </div>
  );
}

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-sm">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}
