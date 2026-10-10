import type { Metadata } from "next";

import { legalDocuments } from "@/content/legal";
import { localizedPageMetadata } from "@/i18n/page-metadata";

import { termsCopy } from "../_components/legal-copy";
import { LegalDocument } from "../_components/legal-document";

/* Terms of Use (Figma 323:121). Draft text until legal review (src/content/legal.ts). */

export function generateMetadata(): Promise<Metadata> {
  return localizedPageMetadata(legalDocuments.terms.path, (t) => ({
    title: t("termsTitle"),
    description: t("termsDescription"),
  }));
}

export default async function TermsPage() {
  return <LegalDocument document="terms" copy={await termsCopy()} />;
}
