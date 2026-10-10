import { serializeJsonLd } from "@/lib/seo/structured-data";

/* Server-rendered structured data. The serializer escapes `<`, so the JSON is inert. */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
