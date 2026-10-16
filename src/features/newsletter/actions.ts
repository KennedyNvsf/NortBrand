"use server";

import * as Sentry from "@sentry/nextjs";
import { headers } from "next/headers";
import { after } from "next/server";

import { getServerEnv, publicEnv } from "@/env";
import { clientIp, hashIp } from "@/lib/ip-hash";
import { removeContact, sendEmail, upsertSegmentContact } from "@/lib/resend";
import { getSupabase } from "@/lib/supabase/server";

import { confirmSubscription, type ConfirmResult } from "./confirm";
import { renderNewsletterConfirmation } from "./emails/render";
import { confirmUrl, unsubscribeUrl } from "./links";
import {
  addToSegment,
  removeFromSegment,
  sendConfirmationEmail,
  type SegmentDependencies,
} from "./notify";
import { subscribeToNewsletter, type SubscribeResult } from "./subscribe";
import { unsubscribe, type UnsubscribeResult } from "./unsubscribe";

/*
 * The newsletter's server actions (#40). Each input is untrusted and validated again in
 * the core function, whatever the browser did. Only Postgres error codes and Resend
 * error names are ever reported: `error.details` echoes the row, email included.
 */

function report(step: string, code: string) {
  Sentry.captureMessage("Newsletter step failed", {
    level: "error",
    tags: { feature: "newsletter", step, code },
  });
}

function segmentDependencies(): SegmentDependencies {
  const secret = getServerEnv().NEWSLETTER_TOKEN_SECRET;
  return {
    unsubscribeUrl: (email, locale) =>
      unsubscribeUrl(publicEnv.NEXT_PUBLIC_SITE_URL, locale, email, secret),
    upsert: upsertSegmentContact,
    remove: removeContact,
    reportFailure: report,
  };
}

/** The signup form (#41): `{ email, locale, website }`. */
export async function subscribeNewsletter(
  input: unknown,
): Promise<SubscribeResult> {
  const env = getServerEnv();
  const requestHeaders = await headers();

  return subscribeToNewsletter(input, {
    ipHash: () => hashIp(clientIp(requestHeaders), env.IP_HASH_SALT),
    subscribe: async ({ email, locale }, ipHash) => {
      const { data, error } = await getSupabase().rpc("subscribe_newsletter", {
        p_email: email,
        p_locale: locale,
        p_ip_hash: ipHash,
      });
      if (error) return { error: { code: error.code } };
      return { issuedAt: data };
    },
    reportFailure: (code) => {
      report("subscribe", code);
    },
    // The email goes out after the response, so a slow or failing Resend never shows.
    onSubscribed: (subscription, issuedAt) => {
      after(() =>
        sendConfirmationEmail(subscription, issuedAt, {
          confirmUrl: ({ email, locale }, issued) =>
            confirmUrl(
              publicEnv.NEXT_PUBLIC_SITE_URL,
              locale,
              email,
              issued,
              env.NEWSLETTER_TOKEN_SECRET,
            ),
          render: renderNewsletterConfirmation,
          send: sendEmail,
          reportFailure: report,
        }),
      );
    },
  });
}

/** The confirm page's button (#41): `{ email, issued, token, locale }` from its URL. */
export async function confirmNewsletter(
  input: unknown,
): Promise<ConfirmResult> {
  return confirmSubscription(input, {
    now: () => Math.floor(Date.now() / 1000),
    tokenSecret: getServerEnv().NEWSLETTER_TOKEN_SECRET,
    confirm: async ({ email, issued, token }) => {
      const { data, error } = await getSupabase().rpc("confirm_newsletter", {
        p_email: email,
        p_issued_at: issued,
        p_token: token,
      });
      if (error) return { error: { code: error.code } };
      return { confirmed: data };
    },
    reportFailure: (code) => {
      report("confirm", code);
    },
    onConfirmed: ({ email, locale }) => {
      after(() => addToSegment(email, locale, segmentDependencies()));
    },
  });
}

/**
 * The unsubscribe page's button (#41) and the one-click endpoint
 * (src/app/api/newsletter/unsubscribe): `{ email, token }` from the link.
 */
export async function unsubscribeNewsletter(
  input: unknown,
): Promise<UnsubscribeResult> {
  return unsubscribe(input, {
    tokenSecret: getServerEnv().NEWSLETTER_TOKEN_SECRET,
    unsubscribe: async ({ email, token }) => {
      const { data, error } = await getSupabase().rpc(
        "unsubscribe_newsletter",
        { p_email: email, p_token: token },
      );
      if (error) return { error: { code: error.code } };
      return { unsubscribed: data };
    },
    reportFailure: (code) => {
      report("unsubscribe", code);
    },
    onUnsubscribed: ({ email }) => {
      after(() => removeFromSegment(email, segmentDependencies()));
    },
  });
}
