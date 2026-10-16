import { describe, expect, it } from "vitest";

import { routing } from "@/i18n/routing";

import { languages } from "../../../sanity/languages";
import { schemaTypes } from "../../../sanity/schema-types";

type Field = {
  name: string;
  type: string;
  fields?: Field[];
  of?: Field[];
  validation?: unknown;
};

/** Every image field anywhere in the schema, with the path that leads to it. */
function imageFields(
  fields: Field[],
  path: string[] = [],
): { path: string; field: Field }[] {
  return fields.flatMap((field) => {
    const here = [...path, field.name || field.type];
    const own = field.type === "image" ? [{ path: here.join("."), field }] : [];
    return [
      ...own,
      ...imageFields(field.fields ?? [], here),
      ...imageFields(field.of ?? [], here),
    ];
  });
}

describe("Sanity schema", () => {
  it("offers exactly the site's locales as blog languages", () => {
    expect(languages.map((language) => language.id)).toEqual([
      ...routing.locales,
    ]);
  });

  it("holds blog content only (ADR-003)", () => {
    expect(schemaTypes.map((type) => type.name).sort()).toEqual([
      "author",
      "category",
      "post",
    ]);
  });

  it("requires alternative text on every image", () => {
    const images = schemaTypes.flatMap((type) =>
      imageFields((type as unknown as { fields: Field[] }).fields, [type.name]),
    );
    expect(images.map((image) => image.path).sort()).toEqual([
      "author.image",
      "post.body.image",
      "post.cover",
    ]);
    for (const { path, field } of images) {
      const alt = field.fields?.find((child) => child.name === "alt");
      expect(alt, `${path} has no alt field`).toBeDefined();
      expect(alt?.validation, `${path}.alt is not validated`).toBeTypeOf(
        "function",
      );
    }
  });
});
