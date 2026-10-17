import { z } from "zod";

/**
 * The blog listing's URL state (brief › Frontend: q, category, sort, page in
 * searchParams). The URL is untrusted input, so every value is parsed and bounded here;
 * anything malformed falls back to its default instead of erroring or reaching GROQ.
 */

export const PAGE_SIZE = 8;
export const sortOptions = ["latest", "oldest"] as const;
export type BlogSort = (typeof sortOptions)[number];

export type ListingParams = {
  /** Trimmed, at most 80 characters; "" for no search. */
  q: string;
  /** A category slug, or "" for all. */
  category: string;
  sort: BlogSort;
  /** 1-based. */
  page: number;
};

/** A repeated query key (`?q=a&q=b`) counts once: the first value. */
const first = (value: unknown): unknown =>
  Array.isArray(value) ? (value[0] as unknown) : value;

const schema = z.object({
  q: z.preprocess(first, z.string().trim().max(80).catch("")).catch(""),
  category: z
    .preprocess(
      first,
      z
        .string()
        .regex(/^[a-z0-9-]{1,48}$/)
        .catch(""),
    )
    .catch(""),
  sort: z
    .preprocess(first, z.enum(sortOptions).catch("latest"))
    .catch("latest"),
  page: z
    .preprocess(first, z.coerce.number().int().min(1).max(1000).catch(1))
    .catch(1),
});

export function parseListingParams(
  searchParams: Record<string, string | string[] | undefined>,
): ListingParams {
  return schema.parse(searchParams);
}

/**
 * The GROQ `match` pattern for a search: each word must match the start of a word in
 * the title or excerpt ("bra ref" finds "brand refresh"). GROQ treats `*` as a
 * wildcard, so any user-typed `*` is removed first.
 */
export function searchPattern(q: string): string[] | "" {
  const words = q.replace(/\*/g, " ").split(/\s+/).filter(Boolean).slice(0, 8);
  return words.length ? words.map((word) => `${word}*`) : "";
}

/** The slice of results for a page: GROQ's [$start...$end] (end exclusive). */
export function pageRange(page: number): { start: number; end: number } {
  const start = (page - 1) * PAGE_SIZE;
  return { start, end: start + PAGE_SIZE };
}

/**
 * The query string for a listing link: the current state with some values changed.
 * Defaults are left out (`/blog`, not `/blog?sort=latest&page=1`), and any change to
 * the search, category or sort goes back to page 1.
 */
export function listingQuery(
  current: ListingParams,
  change: Partial<ListingParams>,
): Record<string, string> {
  const next: ListingParams = {
    ...current,
    ...change,
    page:
      change.page ??
      (change.q !== undefined ||
      change.category !== undefined ||
      change.sort !== undefined
        ? 1
        : current.page),
  };
  const query: Record<string, string> = {};
  if (next.q) query.q = next.q;
  if (next.category) query.category = next.category;
  if (next.sort !== "latest") query.sort = next.sort;
  if (next.page > 1) query.page = String(next.page);
  return query;
}

/** Whether the visitor is looking at a filtered view (search or category). */
export function isFiltered(params: ListingParams): boolean {
  return params.q !== "" || params.category !== "";
}
