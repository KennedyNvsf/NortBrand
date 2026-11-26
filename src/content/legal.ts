/**
 * Legal documents (Figma 09 — Legal, 323:2). Structure only: the copy lives in messages
 * under `Legal.<document>`, and the contact email comes from site.ts through an
 * <email></email> tag, never typed into the text.
 *
 * - `id` is the section's anchor (/legal/privacy#your-rights) and its table-of-contents
 *   target; `key` names the copy (`Legal.<document>.sections.<key>.title | body`).
 * - `items` adds a bullet list (`…sections.<key>.items.<item>`).
 * - `status: "draft"` means the text awaits legal review; `pnpm check:release` fails
 *   while any document is a draft. Both were reviewed on 2026-11-26 (#78).
 *
 * Imported by scripts/check-release.mts, so keep it free of path-alias imports.
 */

type LegalSection = {
  id: string;
  key: string;
  items?: readonly string[];
};

type LegalDocument = {
  path: `/legal/${string}`;
  /** ISO date (YYYY-MM-DD) shown as "Last updated". */
  updated: string;
  status: "draft" | "reviewed";
  sections: readonly LegalSection[];
};

export const legalDocuments = {
  privacy: {
    path: "/legal/privacy",
    updated: "2026-11-25",
    status: "reviewed",
    sections: [
      { id: "who-we-are", key: "whoWeAre" },
      {
        id: "information-we-collect",
        key: "collect",
        items: ["contactForm", "newsletter", "portal", "usage", "technical"],
      },
      {
        id: "how-we-use-your-information",
        key: "use",
        items: [
          "reply",
          "deliver",
          "newsletter",
          "analytics",
          "security",
          "legal",
        ],
      },
      {
        id: "cookies-and-analytics",
        key: "cookies",
        items: [
          "consent",
          "locale",
          "portalSession",
          "portalAuth",
          "analytics",
        ],
      },
      {
        id: "sharing-your-information",
        key: "sharing",
        items: ["vercel", "supabase", "resend", "sentry", "google", "sanity"],
      },
      {
        id: "how-long-we-keep-it",
        key: "retention",
        items: [
          "requests",
          "clients",
          "newsletter",
          "analytics",
          "security",
          "billing",
        ],
      },
      { id: "your-rights", key: "rights" },
      { id: "contact-us", key: "contact" },
    ],
  },
  terms: {
    path: "/legal/terms",
    updated: "2026-11-25",
    status: "reviewed",
    sections: [
      { id: "acceptance", key: "acceptance" },
      { id: "using-the-website", key: "use" },
      { id: "intellectual-property", key: "ip" },
      { id: "enquiries-and-proposals", key: "enquiries" },
      { id: "third-party-links", key: "links" },
      { id: "limitation-of-liability", key: "liability" },
      { id: "changes", key: "changes" },
      { id: "governing-law", key: "law" },
      { id: "contact", key: "contact" },
    ],
  },
} as const satisfies Record<string, LegalDocument>;

export type LegalDocumentKey = keyof typeof legalDocuments;

/** Documents still carrying placeholder text; must be empty before launch. */
export function draftLegalDocuments(
  documents: Record<string, Pick<LegalDocument, "status">> = legalDocuments,
): string[] {
  return Object.entries(documents)
    .filter(([, document]) => document.status === "draft")
    .map(([key]) => key);
}
