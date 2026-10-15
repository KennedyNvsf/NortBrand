import { z } from "zod";

import { serviceSlugs } from "@/content/services";
import { routing } from "@/i18n/routing";

/**
 * The consultation request fields, shared by the form (client validation) and the
 * server action. Every rule mirrors a CHECK constraint on
 * `public.consultation_requests` (supabase/migrations), so a value that passes here
 * also passes in the database. Change both together.
 *
 * Each message is a key under `Contact.form.errors` in messages/*.json, so the form
 * translates it; nothing user-facing is written here.
 */

/** Same pattern as the `phone` CHECK: optional `+`, then 6–31 digits, spaces or `().-`. */
const PHONE_PATTERN = /^\+?[0-9 ().-]{6,31}$/;

export const consultationErrorKeys = [
  "nameRequired",
  "nameTooLong",
  "emailInvalid",
  "phoneInvalid",
  "serviceRequired",
  "messageRequired",
  "messageTooShort",
  "messageTooLong",
] as const;

export type ConsultationErrorKey = (typeof consultationErrorKeys)[number];

export const consultationSchema = z.object({
  name: z.string().trim().min(1, "nameRequired").max(120, "nameTooLong"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(254, "emailInvalid")
    .pipe(z.email("emailInvalid")),
  // Optional: an empty field becomes undefined, anything else must look like a number.
  phone: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || undefined)
    .pipe(z.string().regex(PHONE_PATTERN, "phoneInvalid").optional()),
  service: z.enum(serviceSlugs, "serviceRequired"),
  message: z
    .string()
    .trim()
    .min(1, "messageRequired")
    .min(10, "messageTooShort")
    .max(5000, "messageTooLong"),
  locale: z.enum(routing.locales),
});

/** What the form holds (strings), before trimming and normalising. */
export type ConsultationInput = z.input<typeof consultationSchema>;
/** What the server stores, after trimming and normalising. */
export type ConsultationRequest = z.output<typeof consultationSchema>;

export type ConsultationField = Exclude<keyof ConsultationInput, "locale">;
export type ConsultationFieldErrors = Partial<
  Record<ConsultationField, ConsultationErrorKey>
>;

/** Used when zod reports a type error (e.g. a field that is not a string at all). */
const fallbackKeys: Record<ConsultationField, ConsultationErrorKey> = {
  name: "nameRequired",
  email: "emailInvalid",
  phone: "phoneInvalid",
  service: "serviceRequired",
  message: "messageRequired",
};

function isErrorKey(value: string): value is ConsultationErrorKey {
  return (consultationErrorKeys as readonly string[]).includes(value);
}

function isField(value: PropertyKey | undefined): value is ConsultationField {
  return typeof value === "string" && Object.hasOwn(fallbackKeys, value);
}

/**
 * The translation key for a field's error message: the message itself when it is one of
 * ours, otherwise the field's fallback. The form uses it for client-side errors too.
 */
export function toErrorKey(
  field: ConsultationField,
  message: string | undefined,
): ConsultationErrorKey {
  return message !== undefined && isErrorKey(message)
    ? message
    : fallbackKeys[field];
}

/** The first error key per field, as the form shows one message per field. */
export function toFieldErrors(
  error: z.ZodError<ConsultationInput>,
): ConsultationFieldErrors {
  const fieldErrors: ConsultationFieldErrors = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (!isField(field)) continue;
    fieldErrors[field] ??= toErrorKey(field, issue.message);
  }
  return fieldErrors;
}
