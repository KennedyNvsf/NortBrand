import { z } from "zod";

import { routing } from "@/i18n/routing";

/**
 * Client sign-in fields (#131), shared by the form and the server actions. The rules
 * match the database: emails are stored lowercase, and Project IDs are `NB-0000`
 * (projects.public_id CHECK). Messages are keys under `Portal.signIn.errors`.
 */

export const signInErrorKeys = [
  "emailInvalid",
  "projectIdInvalid",
  "codeInvalid",
] as const;
export type SignInErrorKey = (typeof signInErrorKeys)[number];

const email = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, "emailInvalid")
  .pipe(z.email("emailInvalid"));

// People type "nb-4821" or " NB-4821 "; the database compares the normalised form.
const projectId = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^NB-\d{4}$/, "projectIdInvalid");

export const requestCodeSchema = z.object({
  email,
  projectId,
  locale: z.enum(routing.locales),
});

export const verifyCodeSchema = requestCodeSchema.extend({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "codeInvalid"),
});

export type RequestCodeInput = z.input<typeof requestCodeSchema>;
export type RequestCode = z.output<typeof requestCodeSchema>;
export type VerifyCodeInput = z.input<typeof verifyCodeSchema>;
export type VerifyCode = z.output<typeof verifyCodeSchema>;

/** "ana@atlantico.pt" → "a•••@atlantico.pt": enough to recognise, not to harvest. */
export function maskEmail(address: string): string {
  const at = address.lastIndexOf("@");
  if (at < 1) return "•••";
  return `${address.slice(0, 1)}•••${address.slice(at)}`;
}
