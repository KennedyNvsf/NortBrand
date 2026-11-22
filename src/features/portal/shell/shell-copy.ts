import { getTranslations } from "next-intl/server";

import type { Locale } from "@/i18n/routing";

import type { ClientShellCopy } from "./client-shell";

/**
 * The client shell's strings in one language. The locale is passed explicitly so the
 * team's preview (#160), which lives outside the /[locale] routes, can render either.
 */
export async function getClientShellCopy(
  locale: Locale,
): Promise<ClientShellCopy> {
  const t = await getTranslations({ locale, namespace: "Portal.shell" });
  return {
    projectLabel: t("projectLabel"),
    navLabel: t("navLabel"),
    nav: {
      overview: t("nav.overview"),
      tasks: t("nav.tasks"),
      timeline: t("nav.timeline"),
      files: t("nav.files"),
      updates: t("nav.updates"),
    },
    yourTeam: t("yourTeam"),
    messageTeam: t("messageTeam"),
    messageShort: t("messageShort"),
    account: t("account"),
    signOut: t("signOut"),
    switchProject: t("switchProject"),
  };
}
