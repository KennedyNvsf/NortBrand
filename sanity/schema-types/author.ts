import { User } from "lucide-react";
import { defineField, defineType } from "sanity";

/* A post's author (Figma 05 Blog › Post › Author 287:22): name, role, photo, short bio. */
export const author = defineType({
  name: "author",
  title: "Author",
  type: "document",
  icon: User,
  fields: [
    defineField({
      name: "name",
      title: "Name",
      type: "string",
      validation: (rule) => rule.required().max(80),
    }),
    defineField({
      name: "role",
      title: "Role",
      type: "internationalizedArrayString",
    }),
    defineField({
      name: "image",
      title: "Photo",
      type: "image",
      options: { hotspot: true },
      fields: [
        defineField({
          name: "alt",
          title: "Alternative text",
          type: "string",
          description: "Describe the photo for people who cannot see it.",
          validation: (rule) => rule.required(),
        }),
      ],
    }),
    defineField({
      name: "bio",
      title: "Short bio",
      type: "internationalizedArrayString",
    }),
  ],
  preview: { select: { title: "name", media: "image" } },
});
