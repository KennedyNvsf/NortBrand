"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { ICON_STROKE, icons } from "@/lib/icons";

/*
 * Figma Contact › Request sent (desktop 321:73, tablet 379:310, mobile 379:386): a green
 * check, the headline, the reply promise, a recap of the address we will reply to, and
 * two ways on. The buttons sit side by side from tablet and stack full width on mobile.
 * The heading takes focus when the state appears, so screen readers start here.
 */
export function ConsultationSent({ email }: { email: string }) {
  const t = useTranslations("Contact.form.sent");
  const heading = useRef<HTMLHeadingElement>(null);
  const Check = icons.check;

  useEffect(() => {
    heading.current?.focus();
  }, []);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4.5 pt-3 pb-2 text-center lg:gap-5.5 lg:pt-4">
      <div className="flex size-21 items-center justify-center rounded-full bg-action-secondary-subtle">
        <Check
          className="size-12 text-action-secondary"
          strokeWidth={ICON_STROKE}
          aria-hidden
        />
      </div>
      <h2
        ref={heading}
        tabIndex={-1}
        className="text-h2 font-bold tracking-[-0.008em] text-text-primary outline-none"
      >
        {t("title")}
      </h2>
      <p className="text-body leading-[1.56] text-text-muted lg:text-[17px]">
        {t("body")}
      </p>
      <div className="flex w-full flex-col items-center gap-1 rounded-md border border-border-default px-lg py-3.5">
        <p className="text-overline text-text-muted">{t("replyTo")}</p>
        <p className="text-lead font-semibold [overflow-wrap:anywhere] text-text-primary">
          {email}
        </p>
      </div>
      <div className="flex w-full flex-col gap-2.5 pt-sm md:w-auto md:flex-row md:gap-md">
        <Button
          asChild
          variant="secondary"
          showIcon
          className="w-full md:w-auto"
        >
          <Link href="/">{t("home")}</Link>
        </Button>
        <Button asChild variant="ghost" showIcon className="w-full md:w-auto">
          <Link href="/blog">{t("blog")}</Link>
        </Button>
      </div>
    </div>
  );
}
