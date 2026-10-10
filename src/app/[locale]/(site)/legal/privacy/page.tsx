import type { Metadata } from "next";

import { legalDocuments } from "@/content/legal";
import { localizedPageMetadata } from "@/i18n/page-metadata";

import { privacyCopy } from "../_components/legal-copy";
import { LegalDocument } from "../_components/legal-document";

/* Privacy Policy (Figma 323:3). Draft text until legal review (src/content/legal.ts). */

export function generateMetadata(): Promise<Metadata> {
  return localizedPageMetadata(legalDocuments.privacy.path, (t) => ({
    title: t("privacyTitle"),
    description: t("privacyDescription"),
  }));
}

export default async function PrivacyPage() {
  return <LegalDocument document="privacy" copy={await privacyCopy()} />;
}
