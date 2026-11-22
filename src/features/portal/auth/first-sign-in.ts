import "server-only";

import * as Sentry from "@sentry/nextjs";

import { publicEnv } from "@/env";
import { sendEmail } from "@/lib/resend";

import { renderPortalFirstSignIn } from "../emails/render";
import type { FirstSignInNotice } from "./completion";

/*
 * Tells the project lead that a client signed in for the first time (#159; Settings ›
 * "Tell me when a client signs in for the first time"). Runs after the sign-in response
 * (`after()`), so a slow or failed email never delays or breaks the client's sign-in.
 * Only the provider's error code is reported, never an address.
 */
export async function notifyFirstSignIn(notice: FirstSignInNotice) {
  const email = await renderPortalFirstSignIn({
    leadName: notice.leadName,
    clientEmail: notice.clientEmail,
    projectName: notice.projectName,
    publicId: notice.publicId,
    siteUrl: publicEnv.NEXT_PUBLIC_SITE_URL,
  });
  const result = await sendEmail({ to: notice.leadEmail, ...email });
  if (!result.ok) {
    Sentry.captureMessage("Portal first sign-in email failed", {
      level: "error",
      tags: {
        feature: "portal-sign-in",
        step: "first_sign_in_email",
        code: result.code,
      },
    });
  }
}
