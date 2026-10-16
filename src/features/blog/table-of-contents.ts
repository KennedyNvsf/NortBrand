/**
 * The post's table of contents (Figma 05 Blog › Post, sticky on desktop) comes from its
 * h2 blocks. Ids are made from the heading text, unique within the post, so the TOC's
 * links and the rendered headings (portable-text.tsx) always agree.
 */

type Span = { _type?: string; text?: string };
type Block = {
  _type?: string;
  style?: string;
  _key?: string;
  children?: Span[];
};

export type TocEntry = { id: string; text: string };

export function blockText(block: Block): string {
  return (block.children ?? [])
    .map((child) => child.text ?? "")
    .join("")
    .trim();
}

export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 64) || "section"
  );
}

/** Heading ids by block key, deduplicated in document order ("intro", "intro-2"). */
export function headingIds(
  body: readonly Block[] | null | undefined,
): Map<string, string> {
  const ids = new Map<string, string>();
  const seen = new Map<string, number>();
  for (const block of body ?? []) {
    if (block._type !== "block" || !block._key) continue;
    if (block.style !== "h2" && block.style !== "h3") continue;
    const base = slugify(blockText(block));
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);
    ids.set(block._key, count === 1 ? base : `${base}-${count}`);
  }
  return ids;
}

export function tableOfContents(
  body: readonly Block[] | null | undefined,
): TocEntry[] {
  const ids = headingIds(body);
  return (body ?? [])
    .filter(
      (block) => block._type === "block" && block.style === "h2" && block._key,
    )
    .map((block) => ({
      id: ids.get(block._key ?? "") ?? "",
      text: blockText(block),
    }))
    .filter((entry) => entry.id && entry.text);
}
