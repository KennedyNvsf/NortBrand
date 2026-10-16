import { FileText } from "lucide-react";
import {
  defineArrayMember,
  defineField,
  defineType,
  type SlugValidationContext,
} from "sanity";

import { apiVersion } from "../api-version";

/*
 * A blog post (Figma 05 Blog › Post 285:3). One document per language, linked to its
 * translation by @sanity/document-internationalization (ADR-003): each language has its
 * own slug, title, excerpt and SEO fields, and a post may exist in one language only.
 * The plugin owns the hidden `language` field.
 *
 * Every image needs alternative text before it can be published (nb-se 2.1).
 */

const altText = defineField({
  name: "alt",
  title: "Alternative text",
  type: "string",
  description:
    "What the image shows, for people who cannot see it. Leave nothing decorative here: every post image carries meaning.",
  validation: (rule) => rule.required().max(160),
});

/** A slug is unique within its language: /en/blog/x and /pt/blog/x may share it. */
async function isUniqueInLanguage(
  slug: string,
  context: SlugValidationContext,
) {
  const { document, getClient } = context;
  if (!document) return true;
  const id = document._id.replace(/^drafts\./, "");
  const count = await getClient({ apiVersion }).fetch<number>(
    `count(*[_type == "post" && slug.current == $slug && language == $language && !(_id in [$draft, $published])])`,
    {
      slug,
      language: document.language ?? null,
      draft: `drafts.${id}`,
      published: id,
    },
  );
  return count === 0;
}

export const post = defineType({
  name: "post",
  title: "Post",
  type: "document",
  icon: FileText,
  groups: [
    { name: "content", title: "Content", default: true },
    { name: "seo", title: "SEO" },
  ],
  fields: [
    defineField({
      name: "language",
      type: "string",
      readOnly: true,
      hidden: true,
    }),
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      group: "content",
      validation: (rule) => rule.required().max(120),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      group: "content",
      description:
        "The post's address: /en/blog/<slug>. Changing it breaks shared links.",
      options: { source: "title", maxLength: 96, isUnique: isUniqueInLanguage },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "excerpt",
      title: "Excerpt",
      type: "text",
      rows: 3,
      group: "content",
      description: "One or two sentences for the cards and search results.",
      validation: (rule) => rule.required().max(220),
    }),
    defineField({
      name: "cover",
      title: "Cover image",
      type: "image",
      group: "content",
      options: { hotspot: true },
      fields: [altText],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "category",
      title: "Category",
      type: "reference",
      group: "content",
      to: [{ type: "category" }],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "author",
      title: "Author",
      type: "reference",
      group: "content",
      to: [{ type: "author" }],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "publishedAt",
      title: "Published on",
      type: "datetime",
      group: "content",
      description:
        "Shown on the post and used to sort the blog (newest first).",
      initialValue: () => new Date().toISOString(),
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "body",
      title: "Body",
      type: "array",
      group: "content",
      of: [
        defineArrayMember({
          type: "block",
          // Headings h2–h3 only: the page has one H1 (the title), and the table of
          // contents lists h2 sections.
          styles: [
            { title: "Paragraph", value: "normal" },
            { title: "Heading", value: "h2" },
            { title: "Subheading", value: "h3" },
            { title: "Quote", value: "blockquote" },
          ],
          lists: [
            { title: "Bullets", value: "bullet" },
            { title: "Numbers", value: "number" },
          ],
          marks: {
            decorators: [
              { title: "Bold", value: "strong" },
              { title: "Italic", value: "em" },
            ],
            annotations: [
              defineArrayMember({
                name: "link",
                title: "Link",
                type: "object",
                fields: [
                  defineField({
                    name: "href",
                    title: "URL",
                    type: "url",
                    validation: (rule) =>
                      rule.required().uri({
                        scheme: ["https", "mailto"],
                        allowRelative: true,
                      }),
                  }),
                ],
              }),
            ],
          },
        }),
        defineArrayMember({
          type: "image",
          options: { hotspot: true },
          fields: [
            altText,
            defineField({ name: "caption", title: "Caption", type: "string" }),
          ],
        }),
      ],
      validation: (rule) => rule.required().min(1),
    }),
    defineField({
      name: "seo",
      title: "Search and sharing",
      type: "object",
      group: "seo",
      description: "Optional. Falls back to the title and excerpt.",
      fields: [
        defineField({
          name: "title",
          title: "Title",
          type: "string",
          validation: (rule) => rule.max(60),
        }),
        defineField({
          name: "description",
          title: "Description",
          type: "text",
          rows: 2,
          validation: (rule) => rule.max(160),
        }),
      ],
    }),
  ],
  orderings: [
    {
      title: "Newest first",
      name: "publishedAtDesc",
      by: [{ field: "publishedAt", direction: "desc" }],
    },
  ],
  // The language code as the subtitle tells the EN and PT versions apart in lists.
  preview: { select: { title: "title", subtitle: "language", media: "cover" } },
});
