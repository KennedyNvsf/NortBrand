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
  /* Services details dialog (317:73): green keyword with a 3 px green underline. */
  greenUnderline: (chunks: ReactNode) => (
    <span className="text-action-secondary underline decoration-action-secondary decoration-3 underline-offset-[0.15em]">
      {chunks}
    </span>
  ),
};

/*
 * Body-copy emphasis (Figma About 312:33, 301:50): key words in SemiBold, text/primary,
 * inside muted paragraphs. `"... the <strong>brand</strong> ..."` with t.rich.
 */
export const emphasisTags = {
  strong: (chunks: ReactNode) => (
    <strong className="font-semibold text-text-primary">{chunks}</strong>
  ),
};

/** Renders every highlight tag as plain text, for places that show a title unstyled. */
export const plainTags = {
  red: (chunks: ReactNode) => chunks,
  green: (chunks: ReactNode) => chunks,
  underline: (chunks: ReactNode) => chunks,
  greenUnderline: (chunks: ReactNode) => chunks,
} satisfies Record<
  keyof typeof highlightTags,
  (chunks: ReactNode) => ReactNode
>;

/*
 * A headline line that starts further in (Figma About 301:48, Contact 283:42). The
 * message wraps the line in <indent>, so the sentence stays whole for translators;
 * each page passes its own indent per breakpoint.
 */
export function indentTag(className: string) {
  return {
    indent: (chunks: ReactNode) => <span className={className}>{chunks}</span>,
  };
}
