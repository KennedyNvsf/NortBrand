"use server";

import { cookies, headers } from "next/headers";

import { getServerEnv } from "@/env";
import { routing } from "@/i18n/routing";
import { isFakeBackendEnabled } from "@/lib/e2e-backend";
import { clientIp, hashIp } from "@/lib/ip-hash";
import { getPortalSupabase } from "@/lib/supabase/auth";
import { getSupabase } from "@/lib/supabase/server";

import {
  E2E_PORTAL_COOKIE,
  e2eUserId,
  fakeBegin,
  fakeCodeState,
  fakeRegisterWrongCode,
  fakeVerify,
} from "./e2e-backend";
import {
  BEGIN_ANSWERS,
  CODE_STATES,
  oneOf,
  reportPortalFailure,
  setSessionMarker,
  sleep,
} from "./server";
import { PORTAL_SESSION_COOKIE } from "./session-marker";
import {
  requestCode,
  verifyCode,
  type RequestCodeResult,
  type VerifyCodeResult,
} from "./sign-in";

/*
 * Client sign-in server actions (#131). Inputs are untrusted and validated again in
 * sign-in.ts. Only Postgres error codes are ever reported: never `error.details` or
 * `error.message`, which can echo what was submitted (CLAUDE.md, Data model).
 */

const reportFailure = reportPortalFailure("portal-sign-in");

export async function requestClientCode(
  input: unknown,
): Promise<RequestCodeResult> {
  if (isFakeBackendEnabled()) {
    return requestCode(input, {
      begin: fakeBegin,
      sendCode: () => Promise.resolve({ ok: true }),
      sleep: () => Promise.resolve(),
      now: Date.now,
      reportFailure: () => undefined,
    });
  }

  const env = getServerEnv();
  const ipHash = hashIp(clientIp(await headers()), env.IP_HASH_SALT);

  return requestCode(input, {
    begin: async (request) => {
      const { data, error } = await getSupabase().rpc(
        "portal_begin_client_sign_in",
        {
          p_email: request.email,
          p_public_id: request.projectId,
          p_ip_hash: ipHash,
        },
      );
      if (error) return { error: { code: error.code } };
      return oneOf(BEGIN_ANSWERS, data)
        ? data
        : { error: { code: "unexpected_answer" } };
    },
    sendCode: async (request) => {
      const { error } = await getSupabase().auth.signInWithOtp({
        email: request.email,
        options: { shouldCreateUser: false },
      });
      if (!error) return { ok: true };
      return { ok: false, rateLimited: error.status === 429 };
    },
    sleep,
    now: Date.now,
    reportFailure,
  });
}

export async function verifyClientCode(
  input: unknown,
): Promise<VerifyCodeResult> {
  if (isFakeBackendEnabled()) {
    let signedInEmail = "";
    return verifyCode(input, {
      codeState: fakeCodeState,
      verify: async (request) => {
        signedInEmail = request.email;
        return fakeVerify(request);
      },
      registerWrongCode: fakeRegisterWrongCode,
      complete: () => Promise.resolve("00000000-0000-4000-b000-00000000e2e0"),
      signOut: () => Promise.resolve(),
      startSession: async () => {
        await setSessionMarker(e2eUserId(signedInEmail));
        (await cookies()).set(E2E_PORTAL_COOKIE, signedInEmail, {
          httpOnly: true,
          path: "/",
          sameSite: "lax",
        });
      },
      reportFailure: () => undefined,
    });
  }

  const portal = await getPortalSupabase();

  return verifyCode(input, {
    codeState: async (request) => {
      const { data, error } = await getSupabase().rpc("portal_code_state", {
        p_email: request.email,
        p_public_id: request.projectId,
      });
      if (error) return { error: { code: error.code } };
      return oneOf(CODE_STATES, data)
        ? data
        : { error: { code: "unexpected_answer" } };
    },
    verify: async (request) => {
      const { error } = await portal.auth.verifyOtp({
        email: request.email,
        token: request.code,
        type: "email",
      });
      if (!error) return "ok";
      // Supabase answers a wrong or used code with 403 / otp_expired.
      return error.status === 403 || error.code === "otp_expired"
        ? "mismatch"
        : "error";
    },
    registerWrongCode: async (request) => {
      const { data, error } = await getSupabase().rpc(
        "portal_register_wrong_code",
        {
          p_email: request.email,
          p_public_id: request.projectId,
        },
      );
      if (error) return { error: { code: error.code } };
      return data;
    },
    complete: async (request) => {
      const { data, error } = await portal.rpc(
        "portal_complete_client_sign_in",
        {
          p_public_id: request.projectId,
        },
      );
      if (error) return { error: { code: error.code } };
      return data;
    },
    signOut: async () => {
      await portal.auth.signOut();
    },
    startSession: async () => {
      const { data } = await portal.auth.getUser();
      if (data.user) await setSessionMarker(data.user.id);
    },
    reportFailure,
  });
}

/**
 * Signs the client out on this device and returns where to go next. The caller loads
 * that page in full (SignOutButton), so nothing from the signed-in page can be restored
 * from the router's cache.
 */
export async function signOutClient(locale: unknown): Promise<string> {
  const target =
    routing.locales.find((value) => value === locale) ?? routing.defaultLocale;
  const cookieStore = await cookies();
  cookieStore.delete(PORTAL_SESSION_COOKIE);
  cookieStore.delete(E2E_PORTAL_COOKIE);
  if (!isFakeBackendEnabled()) {
    await (await getPortalSupabase()).auth.signOut();
  }
  return `/${target}/portal`;
}
