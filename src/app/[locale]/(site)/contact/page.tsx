import type { Metadata } from "next";

import { localizedPageMetadata } from "@/i18n/page-metadata";

import { ContactFaq } from "./_components/contact-faq";
import { ContactHero } from "./_components/contact-hero";
import { ContactSteps } from "./_components/contact-steps";

/*
 * Contact (Figma 06 — Contact, 278:69): Hero (intro + consultation form card) · What
 * happens next · FAQ. No CTA band and no sticky CTA: this is the booking page.
 * The consultation form (src/features/consultation) is the page's only client
 * boundary; the page itself stays static for both locales.
 */

export function generateMetadata(): Promise<Metadata> {
  return localizedPageMetadata("/contact", (t) => ({
    title: t("contactTitle"),
    description: t("contactDescription"),
  }));
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
