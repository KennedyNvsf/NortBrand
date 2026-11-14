import * as Sentry from "@sentry/nextjs";
import { cookies } from "next/headers";

import { getServerEnv, publicEnv } from "@/env";

import {
  createSessionMarker,
  PORTAL_SESSION_COOKIE,
  PORTAL_SESSION_MAX_AGE_SECONDS,
} from "./session-marker";

/*
 * Server helpers shared by the client (#131) and team (#132) sign-in actions. Not a
 * "use server" module: nothing here is callable from the browser.
 */

export const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export const BEGIN_ANSWERS = ["ok", "no_match", "locked"] as const;
export const CODE_STATES = ["active", "expired", "locked"] as const;

export function oneOf<T extends string>(
  allowed: readonly T[],
  value: unknown,
): value is T {
  return (
    typeof value === "string" && (allowed as readonly string[]).includes(value)
  );
}

/**
 * Reports a failed step to Sentry with the Postgres error code only: never
 * `error.details` or `error.message`, which can echo what was submitted.
 */
export function reportPortalFailure(
  feature: "portal-sign-in" | "portal-team-sign-in" | "portal-team-admin",
) {
  return (where: string, code: string | undefined) => {
    Sentry.captureMessage("Portal step failed", {
      level: "error",
      tags: { feature, step: where, code: code ?? "none" },
    });
  };
}

/** Starts the 30-day session marker (session-marker.ts) for a signed-in user. */
export async function setSessionMarker(userId: string) {
  const cookieStore = await cookies();
  cookieStore.set(
    PORTAL_SESSION_COOKIE,
    createSessionMarker(
      getServerEnv().NEWSLETTER_TOKEN_SECRET,
      userId,
      Date.now(),
    ),
    {
      httpOnly: true,
      // https in every deployed environment; plain http only on a local machine, where
      // WebKit would otherwise drop the cookie.
      secure: publicEnv.NEXT_PUBLIC_SITE_URL.startsWith("https://"),
      sameSite: "lax",
      path: "/",
      maxAge: PORTAL_SESSION_MAX_AGE_SECONDS,
    },
  );
}
