import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";

import { highlightTags } from "@/components/site/highlight";
import { legalDocuments } from "@/content/legal";
import { site } from "@/content/site";

/*
 * Resolves each legal document's copy into plain data for LegalDocument. There is one
 * builder per document on purpose: inside its own namespace every message key is
 * checked by next-intl's types (a shared builder would need `${doc}.sections.${key}`,
 * which TypeScript can only reject or cast).
 */

export type LegalSectionCopy = {
  id: string;
  title: string;
  body: ReactNode;
  items?: string[];
};

export type LegalCopy = {
  title: ReactNode;
  lead: string;
  sections: LegalSectionCopy[];
};

/* The contact email, always from site.ts (CLAUDE.md), for the <email></email> tag. */
export const emailTag = {
  email: () => {
    const email = site.contact.email.value;
    return (
      <a
        href={`mailto:${email}`}
        className="font-medium text-text-accent underline underline-offset-2 hover:text-action-primary-hover"
      >
        {email}
      </a>
    );
  },
};

export async function privacyCopy(): Promise<LegalCopy> {
  const t = await getTranslations("Legal.privacy");
  return {
    title: t.rich("title", highlightTags),
    lead: t("lead"),
    sections: legalDocuments.privacy.sections.map((section) => ({
      id: section.id,
      title: t(`sections.${section.key}.title`),
      body: t.rich(`sections.${section.key}.body`, emailTag),
      items:
        "items" in section
          ? section.items.map((item) =>
              t(`sections.${section.key}.items.${item}`),
            )
          : undefined,
    })),
  };
}

export async function termsCopy(): Promise<LegalCopy> {
  const t = await getTranslations("Legal.terms");
  return {
    title: t.rich("title", highlightTags),
    lead: t("lead"),
    sections: legalDocuments.terms.sections.map((section) => ({
      id: section.id,
      title: t(`sections.${section.key}.title`),
      body: t.rich(`sections.${section.key}.body`, emailTag),
    })),
  };
}
