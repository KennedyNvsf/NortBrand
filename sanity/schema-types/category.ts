import { Tag } from "lucide-react";
import { defineField, defineType } from "sanity";

/*
 * A blog category (the listing's filter chips). One document for both languages: the
 * name is a short label, so it is an internationalized array (one value per language)
 * rather than a document per language like posts (ADR-003).
 */
export const category = defineType({
  name: "category",
  title: "Category",
  type: "document",
  icon: Tag,
  fields: [
    defineField({
      name: "name",
      title: "Name",
      type: "internationalizedArrayString",
      validation: (rule) =>
        rule.custom((values: { value?: string }[] | undefined) =>
          values?.length === 2 && values.every((entry) => entry.value?.trim())
            ? true
            : "Give the category a name in English and in Portuguese.",
        ),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      description:
        "Used in the blog filter URL (?category=…). Same in both languages.",
      options: { source: "name.0.value", maxLength: 48 },
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: { title: "name.0.value", subtitle: "slug.current" },
  },
});
