import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { locale as rootLocale } from "next/root-params";

import { localeAlternates } from "@/i18n/metadata";
import { routing, type Locale } from "@/i18n/routing";

import { ContactFaq } from "./_components/contact-faq";
import { ContactHero } from "./_components/contact-hero";
import { ContactSteps } from "./_components/contact-steps";

/*
 * Contact (Figma 06 — Contact, 278:69): Hero (intro + consultation form card) · What
 * happens next · FAQ. No CTA band and no sticky CTA: this is the booking page.
 * The form is layout only until the consultation form ticket (see
 * consultation-form-layout.tsx). Static for both locales.
 */

async function currentLocale(): Promise<Locale> {
  const locale = await rootLocale();
  return routing.locales.find((l) => l === locale) ?? routing.defaultLocale;
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Metadata");
  return {
    title: t("contactTitle"),
    description: t("contactDescription"),
    alternates: localeAlternates(await currentLocale(), "/contact"),
  };
}

export default function ContactPage() {
  return (
    <main id="main">
      <ContactHero />
      <ContactSteps />
      <ContactFaq />
    </main>
  );
}
