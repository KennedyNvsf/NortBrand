/**
 * Contact page FAQ (Figma 280:59), in display order. Questions and answers live in
 * messages under `Contact.faq.items.<key>.question | answer` (CLAUDE.md: FAQ is typed
 * content in the repository, not Sanity). The SEO ticket reuses this list for FAQPage
 * structured data.
 */
export const faqKeys = [
  "cost",
  "timeline",
  "content",
  "international",
  "afterLaunch",
] as const;

export type FaqKey = (typeof faqKeys)[number];
