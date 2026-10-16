import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

type MetadataTranslator = Awaited<
  ReturnType<typeof getTranslations<"Metadata">>
>;

/**
 * Metadata for the newsletter link pages. They are reached only from an email link
 * that carries the address and a token, so they are noindex (and left out of the
 * sitemap), have no canonical or hreflang, and send no Referer: the link's query
 * string never reaches another site.
 */
export async function newsletterPageMetadata(
  copy: (t: MetadataTranslator) => { title: string; description: string },
): Promise<Metadata> {
  const t = await getTranslations("Metadata");
  return {
    ...copy(t),
    robots: { index: false, follow: false },
    referrer: "no-referrer",
  };
}
