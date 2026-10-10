import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { locale as rootLocale } from "next/root-params";

import { legalDocuments } from "@/content/legal";
import { localeAlternates } from "@/i18n/metadata";
import { routing, type Locale } from "@/i18n/routing";

import { privacyCopy } from "../_components/legal-copy";
import { LegalDocument } from "../_components/legal-document";

/* Privacy Policy (Figma 323:3). Draft text until legal review (src/content/legal.ts). */

async function currentLocale(): Promise<Locale> {
  const locale = await rootLocale();
  return routing.locales.find((l) => l === locale) ?? routing.defaultLocale;
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Metadata");
  return {
    title: t("privacyTitle"),
    description: t("privacyDescription"),
    alternates: localeAlternates(
      await currentLocale(),
      legalDocuments.privacy.path,
    ),
  };
}

export default async function PrivacyPage() {
  return <LegalDocument document="privacy" copy={await privacyCopy()} />;
}
