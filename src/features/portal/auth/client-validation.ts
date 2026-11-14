import type { SignInErrorKey } from "./schema";

/*
 * Quick checks for the sign-in form in the browser, without zod (CLAUDE.md, what loads
 * before the first paint: no zod in client components). They mirror schema.ts, which
 * the server actions run on every request; these only save a round trip.
 */

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const PROJECT_ID = /^NB-\d{4}$/;

/** `projectId` is null for team sign-in, which has no Project ID. */
export function checkDetails(values: {
  email: string;
  projectId: string | null;
}): Partial<Record<"email" | "projectId", SignInErrorKey>> {
  const errors: Partial<Record<"email" | "projectId", SignInErrorKey>> = {};
  const email = values.email.trim();
  if (email.length > 254 || !EMAIL.test(email)) errors.email = "emailInvalid";
  if (
    values.projectId !== null &&
    !PROJECT_ID.test(values.projectId.trim().toUpperCase())
  )
    errors.projectId = "projectIdInvalid";
  return errors;
}
