"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlert } from "lucide-react";
import { hasLocale, useLocale, useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Controller, useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
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
import { serviceSlugs, services, type ServiceSlug } from "@/content/services";
import { site } from "@/content/site";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { ICON_STROKE } from "@/lib/icons";

import {
  getConsultationFormToken,
  submitConsultationRequest,
} from "../actions";
import {
  consultationSchema,
  toErrorKey,
  type ConsultationField,
  type ConsultationInput,
} from "../schema";
import { ConsultationSent } from "./consultation-sent";

/*
 * Figma Contact › Form Card and its states: Default (278:114), Validation (400:331),
 * Sending (400:522), Send failed (400:694) and Request sent (321:73).
 * - Client validation with the shared zod schema; the server action validates again.
 * - Sending locks every field (the designed Disabled look) and the button shows the
 *   Loading state, so a second submission is impossible.
 * - Send failed and rate limited keep every answer, show the banner and move focus to
 *   it. Request sent replaces the form and moves focus to its heading. A polite live
 *   region announces each change for screen readers.
 * - Bots: a honeypot field and a signed start time fetched on mount (#37).
 */

type Status = "idle" | "sending" | "failed" | "rate-limited" | "sent";

const FIELD_ORDER: ConsultationField[] = [
  "name",
  "email",
  "phone",
  "service",
  "message",
];

function isServiceSlug(value: string | null): value is ServiceSlug {
  return value !== null && (serviceSlugs as readonly string[]).includes(value);
}

export function ConsultationForm() {
  const t = useTranslations("Contact.form");
  const serviceNames = useTranslations("ServiceNames");
  const locale = useLocale();
  const id = useId();
  const [status, setStatus] = useState<Status>("idle");
  const [sentTo, setSentTo] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const formToken = useRef<string | undefined>(undefined);
  const honeypot = useRef<HTMLInputElement>(null);
  const banner = useRef<HTMLDivElement>(null);

  const {
    register,
    control,
    handleSubmit,
    setError,
    setFocus,
    setValue,
    formState: { errors },
  } = useForm<ConsultationInput>({
    resolver: zodResolver(consultationSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      message: "",
      locale: hasLocale(routing.locales, locale)
        ? locale
        : routing.defaultLocale,
    },
    shouldFocusError: true,
  });

  // The signed start time for the fill-time check, and the service from
  // ?service=<slug>. Read after mount: the page is static, so the URL is not known
  // at build time.
  useEffect(() => {
    getConsultationFormToken()
      .then((token) => {
        formToken.current = token;
      })
      .catch(() => {
        // Without a token the server treats the submission as a bot; retry on focus.
      });
    const service = new URLSearchParams(window.location.search).get("service");
    if (isServiceSlug(service)) setValue("service", service);
  }, [setValue]);

  const refreshTokenIfMissing = () => {
    if (formToken.current) return;
    void getConsultationFormToken().then((token) => {
      formToken.current ??= token;
    });
  };

  // Focus follows the outcome: the banner on failure, the heading once sent.
  useEffect(() => {
    if (status === "failed" || status === "rate-limited")
      banner.current?.focus();
  }, [status]);

  const onSubmit = async (values: ConsultationInput) => {
    if (status === "sending") return;
    setStatus("sending");
    setAnnouncement(t("sending"));

    try {
      const result = await submitConsultationRequest({
        ...values,
        website: honeypot.current?.value ?? "",
        formToken: formToken.current,
      });

      switch (result.status) {
        case "success":
          setSentTo(values.email.trim().toLowerCase());
          setStatus("sent");
          setAnnouncement(t("sent.title"));
          return;
        case "validation": {
          setStatus("idle");
          setAnnouncement("");
          const invalid = FIELD_ORDER.filter(
            (field) => result.fieldErrors[field],
          );
          for (const field of invalid) {
            setError(field, { message: result.fieldErrors[field] });
          }
          if (invalid[0]) setFocus(invalid[0]);
          return;
        }
        case "rate-limited":
          setStatus("rate-limited");
          setAnnouncement(t("rateLimited.title"));
          return;
        case "failed":
          setStatus("failed");
          setAnnouncement(t("failed.title"));
          return;
      }
    } catch {
      // The action could not be reached (offline, deploy in progress).
      setStatus("failed");
      setAnnouncement(t("failed.title"));
    }
  };

  const sending = status === "sending";
  const failure =
    status === "failed"
      ? "failed"
      : status === "rate-limited"
        ? "rateLimited"
        : null;
  const email = site.contact.email.value;

  const fieldProps = (field: ConsultationField) => {
    const invalid = Boolean(errors[field]);
    return {
      id: `${id}-${field}`,
      "aria-invalid": invalid || undefined,
      "aria-describedby": invalid ? `${id}-${field}-error` : undefined,
    };
  };

  const fieldError = (field: ConsultationField) => {
    const error = errors[field];
    return error ? (
      <FieldError id={`${id}-${field}-error`}>
        {t(`errors.${toErrorKey(field, error.message)}`)}
      </FieldError>
    ) : null;
  };

  return (
    <div className="flex flex-col">
      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>

      {status === "sent" ? (
        <ConsultationSent email={sentTo} />
      ) : (
        <form
          noValidate
          aria-labelledby={`${id}-title`}
          // Client errors: react-hook-form focuses the first invalid field, whose
          // message is read through aria-describedby.
          onSubmit={(event) => void handleSubmit(onSubmit)(event)}
          onFocus={refreshTokenIfMissing}
          className="flex flex-col gap-4.5 lg:gap-lg"
        >
          <div className="flex flex-col gap-1.5">
            <h2 id={`${id}-title`} className="text-h3 text-text-primary">
              {t("title")}
            </h2>
            <p className="text-small text-text-muted">{t("subtitle")}</p>
          </div>

          {/* Honeypot: off-screen and out of the tab order; people never fill it. */}
          <div
            aria-hidden
            className="absolute -left-[9999px] h-px w-px overflow-hidden"
          >
            <label htmlFor={`${id}-website`}>Website</label>
            <input
              ref={honeypot}
              id={`${id}-website`}
              name="website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              defaultValue=""
            />
          </div>

          <fieldset
            disabled={sending}
            className="flex min-w-0 flex-col gap-4.5 lg:gap-lg"
          >
            <legend className="sr-only">{t("title")}</legend>

            <div className="flex flex-col gap-4.5 md:flex-row md:gap-lg">
              <Field
                label={t("name")}
                htmlFor={`${id}-name`}
                error={fieldError("name")}
              >
                <Input
                  {...register("name")}
                  {...fieldProps("name")}
                  autoComplete="name"
                  placeholder={t("namePlaceholder")}
                />
              </Field>
              <Field
                label={t("email")}
                htmlFor={`${id}-email`}
                error={fieldError("email")}
              >
                <Input
                  {...register("email")}
                  {...fieldProps("email")}
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder={t("emailPlaceholder")}
                />
              </Field>
            </div>

            <Field
              label={t("phone")}
              htmlFor={`${id}-phone`}
              error={fieldError("phone")}
            >
              <Input
                {...register("phone")}
                {...fieldProps("phone")}
                type="tel"
                autoComplete="tel"
                placeholder={t("phonePlaceholder")}
              />
            </Field>

            <Field
              label={t("service")}
              htmlFor={`${id}-service`}
              error={fieldError("service")}
            >
              <Controller
                control={control}
                name="service"
                render={({ field }) => {
                  // react-hook-form types the value as required, but it is empty until the
                  // visitor picks a service; Radix needs "" (not undefined) to stay controlled.
                  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                  const selected = field.value ?? "";
                  return (
                    <Select
                      value={selected}
                      // Radix mirrors the value into a hidden native <select>, which reports ""
                      // when a value (e.g. from ?service=) arrives before its options exist. No
                      // option is empty, so an empty change is never the visitor's choice.
                      onValueChange={(value) => {
                        if (value) field.onChange(value);
                      }}
                      disabled={sending}
                    >
                      <SelectTrigger
                        ref={field.ref}
                        onBlur={field.onBlur}
                        {...fieldProps("service")}
                      >
                        <SelectValue placeholder={t("servicePlaceholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        {services.map(({ slug, key }) => (
                          <SelectItem key={slug} value={slug}>
                            {serviceNames(key)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  );
                }}
              />
            </Field>

            <Field
              label={t("message")}
              htmlFor={`${id}-message`}
              error={fieldError("message")}
            >
              <Textarea
                {...register("message")}
                {...fieldProps("message")}
                placeholder={t("messagePlaceholder")}
              />
            </Field>
          </fieldset>

          {failure ? (
            <div
              ref={banner}
              tabIndex={-1}
              data-state={failure}
              className="flex items-start gap-3 rounded-md border border-action-primary bg-action-primary-subtle px-md py-3.5 outline-none"
            >
              <CircleAlert
                className="mt-0.5 size-[18px] shrink-0 text-text-error"
                strokeWidth={ICON_STROKE}
                aria-hidden
              />
              <div className="flex min-w-0 flex-col gap-1">
                <p className="text-[15px] font-semibold text-text-error">
                  {t(`${failure}.title`)}
                </p>
                <p className="text-small leading-[1.48] text-text-primary">
                  {t.rich(`${failure}.body`, {
                    email: () => (
                      <a
                        href={`mailto:${email}`}
                        className="font-medium underline underline-offset-2"
                      >
                        {email}
                      </a>
                    ),
                  })}
                </p>
              </div>
            </div>
          ) : null}

          <Button type="submit" showIcon loading={sending} className="w-full">
            {sending
              ? t("submitting")
              : status === "failed"
                ? t("tryAgain")
                : t("submit")}
          </Button>

          <div className="flex flex-col gap-1 text-center text-caption text-text-muted">
            <p>{sending ? t("sending") : t("note")}</p>
            <p>
              {t.rich("privacy", {
                link: (chunks) => (
                  <Link
                    href="/legal/privacy"
                    className="font-medium text-text-accent underline underline-offset-2"
                  >
                    {chunks}
                  </Link>
                ),
              })}
            </p>
          </div>
        </form>
      )}
    </div>
  );
}

function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-sm">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error}
    </div>
  );
}
