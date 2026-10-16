"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { highlightTags, plainTags } from "@/components/site/highlight";
import { LogoMark } from "@/components/site/logo";
import { SystemState } from "@/components/site/system-state";
import { Button } from "@/components/ui/button";
import { site } from "@/content/site";
import { Link } from "@/i18n/navigation";

import { unsubscribeNewsletter } from "../actions";
import { unsubscribeLinkSchema } from "../schema";
import type { UnsubscribeResult } from "../unsubscribe";
import { useLinkParams } from "./use-link-params";

/*
 * /[locale]/newsletter/unsubscribe, the `unsubscribe_url` in every newsletter (#40).
 * Like the confirm page, opening it changes nothing: the visitor presses Unsubscribe.
 * Mail clients' one-click unsubscribe posts to /api/newsletter/unsubscribe instead.
 * Layout: the 404's system state (no Figma frame; docs/tech-debt.md).
 */

type State = "ready" | "unsubscribing" | UnsubscribeResult["status"];
type TitleKey = "readyTitle" | "doneTitle" | "invalidTitle" | "failedTitle";

export function UnsubscribeNewsletter() {
  const t = useTranslations("Newsletter.unsubscribe");
  const params = useLinkParams();
  const [state, setState] = useState<State>("ready");
  const title = useRef<HTMLHeadingElement>(null);

  const link = params && {
    email: params.get("email") ?? "",
    token: params.get("token") ?? "",
  };
  const malformed =
    link !== null && !unsubscribeLinkSchema.safeParse(link).success;
  const shown: State = malformed ? "invalid" : state;

  useEffect(() => {
    if (state !== "ready" && state !== "unsubscribing") title.current?.focus();
  }, [state]);

  const run = async () => {
    if (!link || state === "unsubscribing") return;
    setState("unsubscribing");
    try {
      setState((await unsubscribeNewsletter(link)).status);
    } catch {
      setState("failed");
    }
  };

  const home = (variant: "primary" | "secondary") => (
    <Button asChild variant={variant} showIcon className="w-full md:w-auto">
      <Link href="/">{t("home")}</Link>
    </Button>
  );
  const studioEmail = site.contact.email.value;

  const view: Record<
    State,
    { title: TitleKey; lead?: ReactNode; actions?: ReactNode }
  > = {
    ready: {
      title: "readyTitle",
      lead: link ? t("readyLead", { email: link.email }) : undefined,
      actions: (
        <Button
          showIcon
          disabled={!link}
          onClick={() => void run()}
          className="w-full md:w-auto"
        >
          {t("unsubscribe")}
        </Button>
      ),
    },
    unsubscribing: {
      title: "readyTitle",
      lead: link ? t("readyLead", { email: link.email }) : undefined,
      actions: (
        <Button showIcon loading className="w-full md:w-auto">
          {t("unsubscribing")}
        </Button>
      ),
    },
    unsubscribed: {
      title: "doneTitle",
      lead: t("doneLead"),
      actions: home("primary"),
    },
    invalid: {
      title: "invalidTitle",
      lead: t.rich("invalidLead", {
        address: studioEmail,
        email: (chunks) => (
          <a
            href={`mailto:${studioEmail}`}
            className="font-medium text-text-accent underline underline-offset-2"
          >
            {chunks}
          </a>
        ),
      }),
      actions: home("primary"),
    },
    failed: {
      title: "failedTitle",
      lead: t("failedLead"),
      actions: (
        <>
          <Button
            showIcon
            onClick={() => void run()}
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

  return (
    <SystemState
      visual={<LogoMark draw="once" className="size-21 md:size-35" />}
      titleRef={title}
      title={t.rich(current.title, highlightTags)}
      lead={current.lead}
      actions={current.actions}
    >
      <p role="status" aria-live="polite" className="sr-only">
        {shown === "unsubscribing"
          ? t("unsubscribing")
          : shown === "ready"
            ? ""
            : t.rich(current.title, plainTags)}
      </p>
    </SystemState>
  );
}
