import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { locale as rootLocale } from "next/root-params";

import { legalDocuments } from "@/content/legal";
import { localeAlternates } from "@/i18n/metadata";
import { routing, type Locale } from "@/i18n/routing";

import { termsCopy } from "../_components/legal-copy";
import { LegalDocument } from "../_components/legal-document";

/* Terms of Use (Figma 323:121). Draft text until legal review (src/content/legal.ts). */

async function currentLocale(): Promise<Locale> {
  const locale = await rootLocale();
  return routing.locales.find((l) => l === locale) ?? routing.defaultLocale;
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Metadata");
  return {
    title: t("termsTitle"),
    description: t("termsDescription"),
    alternates: localeAlternates(
      await currentLocale(),
      legalDocuments.terms.path,
    ),
  };
}

export default async function TermsPage() {
  return <LegalDocument document="terms" copy={await termsCopy()} />;
}
