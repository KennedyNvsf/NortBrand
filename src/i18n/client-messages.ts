import type { AbstractIntlMessages } from "next-intl";

/*
 * The messages client components read. Only these go to NextIntlClientProvider, so
 * each page's HTML carries a few KiB of strings instead of the whole catalogue
 * (Legal, Emails, page copy…), which server components read on the server (#105).
 *
 * A path is a namespace ("Nav") or a nested one ("Contact.form"). When a client
 * component uses a new namespace, add it here: client-messages.test.ts fails until
 * you do.
 */
export const CLIENT_MESSAGE_PATHS = [
  "Common",
  "Nav",
  "LocaleSwitcher",
  "StickyCta",
  "ServiceNames",
  "Consent",
  "Newsletter",
  "Blog",
  "Contact.form",
] as const;

/** The subset of `messages` at `paths`, keeping their nesting. Missing paths are skipped. */
export function pickMessages(
  messages: AbstractIntlMessages,
  paths: readonly string[] = CLIENT_MESSAGE_PATHS,
): AbstractIntlMessages {
  const picked: AbstractIntlMessages = {};
  for (const path of paths) {
    const parts = path.split(".");
    const leaf = parts.pop();
    if (leaf === undefined) continue;

    let source: AbstractIntlMessages | string | undefined = messages;
    for (const part of parts) {
      source = typeof source === "object" ? source[part] : undefined;
    }
    const value = typeof source === "object" ? source[leaf] : undefined;
    if (value === undefined) continue;

    let target = picked;
    for (const part of parts) {
      const next = target[part];
      target = typeof next === "object" ? next : (target[part] = {});
    }
    target[leaf] = value;
  }
  return picked;
}
