"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { highlightTags, plainTags } from "@/components/site/highlight";
import { LogoMark } from "@/components/site/logo";
import { SystemState } from "@/components/site/system-state";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

import { confirmNewsletter } from "../actions";
import type { ConfirmResult } from "../confirm";
import { confirmLinkSchema } from "../schema";
import { useLinkParams } from "./use-link-params";

/*
 * /[locale]/newsletter/confirm, where the confirmation email's link lands (#40).
 * Opening the page changes nothing: the subscription is confirmed only when the
 * visitor presses Confirm, so a mail scanner that follows links cannot subscribe
 * anyone. Layout: the 404's system state (no Figma frame; docs/tech-debt.md).
 * - A malformed link is invalid at once; the server checks the signature and expiry.
 * - Expired and invalid links offer the Newsletter card to subscribe again.
 * - Each result moves focus to the H1, which says what happened.
 */

type State = "ready" | "confirming" | ConfirmResult["status"];
type TitleKey =
  | "readyTitle"
  | "confirmedTitle"
  | "expiredTitle"
  | "invalidTitle"
  | "failedTitle";

export function ConfirmSubscription({
  newsletterCard,
}: {
  newsletterCard: ReactNode;
}) {
  const t = useTranslations("Newsletter.confirm");
  const locale = useLocale();
  const params = useLinkParams();
  const [state, setState] = useState<State>("ready");
  const title = useRef<HTMLHeadingElement>(null);

  const link = params && {
    email: params.get("email") ?? "",
    issued: params.get("issued") ?? "",
    token: params.get("token") ?? "",
    locale,
  };
  const malformed = link !== null && !confirmLinkSchema.safeParse(link).success;
  const shown: State = malformed ? "invalid" : state;

  useEffect(() => {
    if (state !== "ready" && state !== "confirming") title.current?.focus();
  }, [state]);

  const confirm = async () => {
    if (!link || state === "confirming") return;
    setState("confirming");
    try {
      setState((await confirmNewsletter(link)).status);
    } catch {
      setState("failed");
    }
  };

  const home = (variant: "primary" | "secondary") => (
    <Button asChild variant={variant} showIcon className="w-full md:w-auto">
      <Link href="/">{t("home")}</Link>
    </Button>
  );

  const view: Record<
    State,
    { title: TitleKey; lead?: ReactNode; actions?: ReactNode; card?: boolean }
  > = {
    ready: {
      title: "readyTitle",
      lead: link ? t("readyLead", { email: link.email }) : undefined,
      actions: (
        <Button
          showIcon
          disabled={!link}
          onClick={() => void confirm()}
          className="w-full md:w-auto"
        >
          {t("confirm")}
        </Button>
      ),
    },
    confirming: {
      title: "readyTitle",
      lead: link ? t("readyLead", { email: link.email }) : undefined,
      actions: (
        <Button showIcon loading className="w-full md:w-auto">
          {t("confirming")}
        </Button>
      ),
    },
    confirmed: {
      title: "confirmedTitle",
      lead: t("confirmedLead"),
      actions: home("primary"),
    },
    expired: { title: "expiredTitle", lead: t("expiredLead"), card: true },
    invalid: { title: "invalidTitle", lead: t("invalidLead"), card: true },
    failed: {
      title: "failedTitle",
      lead: t("failedLead"),
      actions: (
        <>
          <Button
            showIcon
            onClick={() => void confirm()}
            className="w-full md:w-auto"
          >
            {t("tryAgain")}
          </Button>
          {home("secondary")}
        </>
      ),
    },
  };
  const current = view[shown];
  const titleKey = current.title;

  return (
    <SystemState
      visual={<LogoMark draw="once" className="size-21 md:size-35" />}
      titleRef={title}
      title={t.rich(titleKey, highlightTags)}
      lead={current.lead}
      actions={current.actions}
    >
      <p role="status" aria-live="polite" className="sr-only">
        {shown === "confirming"
          ? t("confirming")
          : shown === "ready"
            ? ""
            : t.rich(titleKey, plainTags)}
      </p>
      {current.card ? (
        <div className="w-full max-w-(--container-content) pt-sm">
          {newsletterCard}
        </div>
      ) : null}
    </SystemState>
  );
}
