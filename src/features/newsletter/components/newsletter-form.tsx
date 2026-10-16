"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { hasLocale, useLocale, useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { trackEvent } from "@/lib/analytics";
import { ICON_STROKE, icons } from "@/lib/icons";

import { subscribeNewsletter } from "../actions";
import { subscribeSchema, type SubscribeInput } from "../schema";

/*
 * The Newsletter card's form and its states (Figma Newsletter States 408:182): default,
 * error (red/300 on the dark card), sending ("Subscribing…", locked) and success (the
 * form is replaced by "You're in."). Rate limited and failed are not in Figma: they
 * reuse the error message style under the row (docs/tech-debt.md).
 * - Client validation with the shared zod schema; the server action validates again.
 * - Input and button stack on mobile and sit in one row from tablet.
 * - A polite live region announces sending, success and failures. Success moves focus
 *   to its title; a server-side email error moves focus to the field.
 * - Bots: a honeypot field. No fill-time token: the card is on many pages (#40).
 */

type Status = "idle" | "sending" | "sent" | "rate-limited" | "failed";

export function NewsletterForm() {
  const t = useTranslations("Newsletter");
  const locale = useLocale();
  const id = useId();
  const [status, setStatus] = useState<Status>("idle");
  const [sentTo, setSentTo] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const honeypot = useRef<HTMLInputElement>(null);
  const successTitle = useRef<HTMLHeadingElement>(null);

  const {
    register,
    handleSubmit,
    setError,
    setFocus,
    formState: { errors },
  } = useForm<SubscribeInput>({
    resolver: zodResolver(subscribeSchema),
    defaultValues: {
      email: "",
      locale: hasLocale(routing.locales, locale)
        ? locale
        : routing.defaultLocale,
    },
    shouldFocusError: true,
  });

  useEffect(() => {
    if (status === "sent") successTitle.current?.focus();
  }, [status]);

  const onSubmit = async (values: SubscribeInput) => {
    if (status === "sending") return;
    setStatus("sending");
    setAnnouncement(t("card.submitting"));

    try {
      const result = await subscribeNewsletter({
        ...values,
        website: honeypot.current?.value ?? "",
      });
      switch (result.status) {
        case "success":
          // No parameters: the address never reaches analytics.
          trackEvent("newsletter_subscribed", {});
          setSentTo(values.email.trim().toLowerCase());
          setStatus("sent");
          setAnnouncement(t("card.successTitle"));
          return;
        case "validation":
          setStatus("idle");
          setAnnouncement("");
          setError("email", { message: result.fieldErrors.email });
          setFocus("email");
          return;
        case "rate-limited":
          setStatus("rate-limited");
          setAnnouncement(t("card.rateLimited"));
          return;
        case "failed":
          setStatus("failed");
          setAnnouncement(t("card.failed"));
          return;
      }
    } catch {
      // The action could not be reached (offline, deploy in progress).
      setStatus("failed");
      setAnnouncement(t("card.failed"));
    }
  };

  const sending = status === "sending";
  const emailError = errors.email ? t("errors.emailInvalid") : null;
  const formError =
    status === "rate-limited"
      ? t("card.rateLimited")
      : status === "failed"
        ? t("card.failed")
        : null;
  const describedBy =
    [emailError && `${id}-error`, formError && `${id}-form-error`]
      .filter(Boolean)
      .join(" ") || undefined;
  const Check = icons.check;

  return (
    <>
      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>

      {status === "sent" ? (
        <div data-state="sent" className="flex flex-col gap-lg">
          <div className="flex items-start gap-3.5">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-action-secondary">
              <Check
                className="size-6 text-text-on-accent"
                strokeWidth={ICON_STROKE}
                aria-hidden
              />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <h3
                ref={successTitle}
                tabIndex={-1}
                className="text-[20px] leading-normal font-semibold text-text-on-accent outline-none"
              >
                {t("card.successTitle")}
              </h3>
              <p className="text-body [overflow-wrap:anywhere] text-text-on-dark-muted">
                {t("card.successBody", { email: sentTo })}
              </p>
            </div>
          </div>
          <p className="text-[13px] leading-[1.45] text-text-on-dark-subtle">
            {t("card.successNote")}
          </p>
        </div>
      ) : (
        <form
          noValidate
          aria-label={t("card.submit")}
          onSubmit={(event) => void handleSubmit(onSubmit)(event)}
          className="flex flex-col gap-lg"
        >
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

          <div className="flex flex-col gap-3 md:flex-row md:items-start md:gap-md">
            <div className="flex min-w-0 flex-col gap-sm md:flex-1 lg:w-82.5 lg:flex-none">
              {/* Figma shows the placeholder only; the label is for screen readers. */}
              <Label htmlFor={`${id}-email`} className="sr-only">
                {t("card.emailLabel")}
              </Label>
              <Input
                {...register("email")}
                id={`${id}-email`}
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder={t("card.emailPlaceholder")}
                disabled={sending}
                aria-invalid={emailError ? true : undefined}
                aria-describedby={describedBy}
              />
              {emailError ? (
                <FieldError id={`${id}-error`}>{emailError}</FieldError>
              ) : null}
            </div>
            <Button
              type="submit"
              showIcon
              loading={sending}
              className="w-full md:w-auto"
            >
              {sending ? t("card.submitting") : t("card.submit")}
            </Button>
          </div>

          {formError ? (
            <FieldError id={`${id}-form-error`} data-state={status}>
              {formError}
            </FieldError>
          ) : null}

          <p className="text-[13px] leading-[1.45] text-text-on-dark-subtle">
            {t.rich("card.consent", {
              link: (chunks) => (
                <Link
                  href="/legal/privacy"
                  className="font-medium text-text-on-accent underline underline-offset-2"
                >
                  {chunks}
                </Link>
              ),
            })}
          </p>
        </form>
      )}
    </>
  );
}
