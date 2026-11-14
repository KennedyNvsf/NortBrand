import { CircleAlert } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { ICON_STROKE } from "@/lib/icons";

import type { PortalLocale } from "../format";

/*
 * The error state for a portal page whose data didn't load (#134). The read failed on
 * the server (reported to Sentry, error code only); the page renders this in place of
 * its content, with the shell still around it, so the client can navigate or refresh.
 */
export async function LoadFailed({ locale }: { locale: PortalLocale }) {
  const t = await getTranslations({ locale, namespace: "Portal.overview" });
  return (
    <p
      role="alert"
      className="flex max-w-reading items-start gap-2.5 rounded-md bg-action-primary-subtle px-md py-3 text-small text-text-error"
    >
      <CircleAlert
        aria-hidden
        strokeWidth={ICON_STROKE}
        className="mt-0.5 size-4 shrink-0"
      />
      <span>{t("loadFailed")}</span>
    </p>
  );
}
