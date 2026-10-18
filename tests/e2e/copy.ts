import en from "../../messages/en.json";
import pt from "../../messages/pt.json";
import type { Locale } from "../../src/i18n/routing";

/*
 * Copy for specs, read from messages/ instead of typed into the spec (#76). The
 * wording keeps changing until launch, in both languages; a spec that asserts a
 * heading or finds a button by its label should follow the message, and fail only
 * when the page stops rendering it.
 */

const messages = { en, pt };

type Values = Record<string, string | number>;

function isTree(node: unknown): node is Record<string, unknown> {
  return typeof node === "object" && node !== null;
}

function raw(locale: Locale, key: string): string {
  let node: unknown = messages[locale];
  for (const part of key.split("."))
    node = isTree(node) ? node[part] : undefined;
  if (typeof node !== "string")
    throw new Error(`No message "${key}" in ${locale}`);
  return node;
}

function fill(message: string, values: Values): string {
  return message.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in values ? String(values[name]) : match,
  );
}

/** A message as the page shows it: rich-text tags dropped (their text stays), `{args}` filled. */
export function copy(locale: Locale, key: string, values: Values = {}): string {
  return fill(raw(locale, key), values).replace(/<\/?[A-Za-z]\w*>/g, "");
}

/** The text inside one rich-text tag, e.g. the `<link>` of a consent line. */
export function tagText(locale: Locale, key: string, tag: string): string {
  const match = new RegExp(`<${tag}>(.*?)</${tag}>`).exec(raw(locale, key));
  if (!match?.[1]) throw new Error(`No <${tag}> in "${key}" (${locale})`);
  return match[1];
}

/** The locale a path like `/pt/contact` is in. */
export function localeOf(path: string): Locale {
  return path.startsWith("/pt") ? "pt" : "en";
}
