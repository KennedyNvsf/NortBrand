/**
 * Pseudo-localization for messages/pt.json until the professional translation arrives
 * (CLAUDE.md, "Content, translation and assets").
 *
 * A pseudo string is the English source, unchanged, wrapped in `[[ ]]` and padded about
 * 30% longer. Keeping the source verbatim keeps ICU arguments, plurals and rich-text
 * tags intact. The padding is short space-separated runs so text still wraps like real
 * Portuguese would, instead of forcing an unbreakable overflow.
 */

export type MessageTree = { [key: string]: string | MessageTree };

const OPEN = "[[";
const CLOSE = "]]";
const PAD_RATIO = 0.3;
const PAD_RUN = 4;

export function pseudoLocalize(source: string): string {
  const padLength = Math.max(1, Math.round(source.length * PAD_RATIO));
  const runs: string[] = [];
  for (let left = padLength; left > 0; left -= PAD_RUN) {
    runs.push("~".repeat(Math.min(PAD_RUN, left)));
  }
  return `${OPEN}${source} ${runs.join(" ")}${CLOSE}`;
}

export function isPseudo(value: string): boolean {
  return value.startsWith(OPEN) && value.endsWith(CLOSE);
}

/**
 * Builds pt messages with exactly the keys of `en`, in the same order. Real translations
 * already in `pt` are kept unless `reset` is set, so a partial delivery from the
 * translator survives a regeneration. Everything else becomes a pseudo string.
 */
export function buildPseudoMessages(
  en: MessageTree,
  pt: MessageTree | undefined,
  { reset = false }: { reset?: boolean } = {},
): MessageTree {
  const result: MessageTree = {};
  for (const [key, source] of Object.entries(en)) {
    const existing = pt?.[key];
    if (typeof source === "string") {
      result[key] =
        !reset && typeof existing === "string" && !isPseudo(existing)
          ? existing
          : pseudoLocalize(source);
    } else {
      result[key] = buildPseudoMessages(
        source,
        typeof existing === "object" ? existing : undefined,
        { reset },
      );
    }
  }
  return result;
}

/** Dotted key paths of every leaf string, e.g. `Common.close`. */
export function flattenKeys(tree: MessageTree, prefix = ""): string[] {
  return Object.entries(tree).flatMap(([key, value]) =>
    typeof value === "string"
      ? [`${prefix}${key}`]
      : flattenKeys(value, `${prefix}${key}.`),
  );
}

/** Dotted key paths of every leaf that is still a pseudo string. */
export function findPseudoKeys(tree: MessageTree, prefix = ""): string[] {
  return Object.entries(tree).flatMap(([key, value]) => {
    if (typeof value === "string") {
      return isPseudo(value) ? [`${prefix}${key}`] : [];
    }
    return findPseudoKeys(value, `${prefix}${key}.`);
  });
}
