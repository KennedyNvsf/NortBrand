import type { Messages } from "next-intl";
import type { ReactElement } from "react";
import { render } from "react-email";

import type { Locale } from "@/i18n/routing";

import en from "../../../messages/en.json";
import pt from "../../../messages/pt.json";

export type RenderedEmail = { subject: string; html: string; text: string };

/**
 * Every locale's messages, imported rather than loaded per request: emails render after
 * the response (`after()`), where there is no next-intl request context.
 */
export const emailMessages: Record<Locale, Messages> = { en, pt };

/** A subject is one line: collapse any line breaks a visitor typed into a field. */
export function oneLine(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/** Renders a React Email template to the HTML and plain-text parts of one email. */
export async function toEmail(
  subject: string,
  element: ReactElement,
): Promise<RenderedEmail> {
  const [html, text] = await Promise.all([
    render(element),
    render(element, { plainText: true }),
  ]);
  return { subject: oneLine(subject), html, text };
}
