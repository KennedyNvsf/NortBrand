import type { ReactNode } from "react";

/*
 * Headline emphasis from Figma: a red keyword (action/primary), a green keyword
 * (action/secondary) and a green 2 px underline. Used with next-intl rich text so the
 * emphasis follows the word in every language:
 *
 *   "title": "Websites built like <green>products</green>, not brochures."
 *   t.rich("title", highlightTags)
 *
 * Only for large display text: red/500 and green/700 meet contrast at heading sizes.
 */
export const highlightTags = {
  red: (chunks: ReactNode) => (
    <span className="text-action-primary">{chunks}</span>
  ),
  green: (chunks: ReactNode) => (
    <span className="text-action-secondary">{chunks}</span>
  ),
  underline: (chunks: ReactNode) => (
    <span className="underline decoration-action-secondary decoration-2 underline-offset-[0.15em]">
      {chunks}
    </span>
  ),
};
