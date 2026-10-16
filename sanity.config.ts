"use client";

import { documentInternationalization } from "@sanity/document-internationalization";
import { defineConfig } from "sanity";
import { internationalizedArray } from "sanity-plugin-internationalized-array";
import { structureTool } from "sanity/structure";

import { dataset, projectId } from "./sanity/env";
import { languages } from "./sanity/languages";
import { schemaTypes } from "./sanity/schema-types";

/*
 * The Studio embedded at /studio (ADR-003, src/app/studio). Blog content only.
 * - Posts: one document per language, linked as translations
 *   (@sanity/document-internationalization). New posts are created from a language
 *   template, so the plain "Post" template is removed and every post has a language.
 * - Category names, author roles and bios: one document, a value per language
 *   (sanity-plugin-internationalized-array).
 */
export default defineConfig({
  name: "nortbrand",
  title: "NortBrand blog",
  basePath: "/studio",
  projectId,
  dataset,
  schema: {
    types: schemaTypes,
    templates: (previous) =>
      previous.filter((template) => template.id !== "post"),
  },
  plugins: [
    structureTool(),
    documentInternationalization({
      supportedLanguages: [...languages],
      schemaTypes: ["post"],
    }),
    internationalizedArray({
      languages: [...languages],
      fieldTypes: ["string"],
      defaultLanguages: languages.map((language) => language.id),
    }),
  ],
});
