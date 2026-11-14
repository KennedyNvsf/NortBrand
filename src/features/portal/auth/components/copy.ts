import type { SignInErrorKey } from "../schema";

/**
 * Client sign-in strings (messages › Portal.signIn), translated on the server and passed
 * in, so the namespace stays out of the client bundle every page ships
 * (CLIENT_MESSAGE_PATHS). Strings with a `{placeholder}` are raw templates, filled with
 * `fill()` once the value is known in the browser.
 */
export type SignInCopy = FlowCopy & {
  projectId: string;
  projectIdPlaceholder: string;
  projectIdHint: string;
  lostId: string;
  contactUs: string;
};

/** The strings the shared flow uses (sign-in-flow.tsx); team sign-in supplies these. */
export type FlowCopy = {
  eyebrow: string;
  title: string;
  intro: string;
  email: string;
  emailPlaceholder: string;
  send: string;
  sending: string;
  sendNote: string;
  noMatch: string;
  locked: string;
  rateLimited: string;
  failed: string;
  codeTitle: string;
  /** Template: {email} */
  codeIntro: string;
  codeLabel: string;
  codeSubmit: string;
  codeChecking: string;
  codeWrongOne: string;
  /** Template: {tries} */
  codeWrongOther: string;
  resendWait: string;
  resendPrompt: string;
  resendAction: string;
  codeSentAgain: string;
  wrongAddress: string;
  useDifferentEmail: string;
  expiredTitle: string;
  /** Template: {email} */
  expiredBody: string;
  expiredAction: string;
  signedOutTitle: string;
  signedOutBody: string;
  signedOutAction: string;
  errors: Record<SignInErrorKey, string>;
};

/** Replaces `{name}` placeholders in a raw message template. */
export function fill(
  template: string,
  values: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in values ? String(values[name]) : match,
  );
}
