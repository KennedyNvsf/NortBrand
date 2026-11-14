"use server";

import { cookies, headers } from "next/headers";

import { getServerEnv } from "@/env";
import { isFakeBackendEnabled } from "@/lib/e2e-backend";
import { clientIp, hashIp } from "@/lib/ip-hash";
import {
  createAuthUser,
  deleteAuthUser,
  setAuthUserBlocked,
} from "@/lib/supabase/admin";
import { getPortalSupabase } from "@/lib/supabase/auth";
import { getSupabase } from "@/lib/supabase/server";

import {
  BEGIN_ANSWERS,
  CODE_STATES,
  oneOf,
  reportPortalFailure,
  setSessionMarker,
  sleep,
} from "../auth/server";
import { PORTAL_SESSION_COOKIE } from "../auth/session-marker";
import {
  requestTeamCode as runRequestTeamCode,
  verifyTeamCode as runVerifyTeamCode,
  type RequestCodeResult,
  type VerifyCodeResult,
} from "../auth/sign-in";
import { getTeamViewer } from "./access";
import {
  E2E_TEAM_COOKIE,
  e2eTeamUserId,
  fakeAddMember,
  fakeCheckInvite,
  fakeCreateAuthUser,
  fakeRemoveMember,
  fakeTeamBegin,
  fakeTeamCodeState,
  fakeTeamRegisterWrongCode,
  fakeTeamVerify,
} from "./e2e-backend";
import {
  inviteTeammate as runInvite,
  removeTeammate as runRemove,
  type InviteResult,
  type RemoveResult,
} from "./team-admin";

/*
 * Team server actions (#132). Inputs are untrusted and validated again in sign-in.ts and
 * team-admin.ts. Invite and remove check the viewer's role first; the SQL functions
 * check it again. Only Postgres error codes are ever reported.
 */

const reportSignIn = reportPortalFailure("portal-team-sign-in");
const reportAdmin = reportPortalFailure("portal-team-admin");

export async function requestTeamCode(
  input: unknown,
): Promise<RequestCodeResult> {
  if (isFakeBackendEnabled()) {
    return runRequestTeamCode(input, {
      begin: fakeTeamBegin,
      sendCode: () => Promise.resolve({ ok: true }),
      sleep: () => Promise.resolve(),
      now: Date.now,
      reportFailure: () => undefined,
    });
  }

  const ipHash = hashIp(clientIp(await headers()), getServerEnv().IP_HASH_SALT);
  return runRequestTeamCode(input, {
    begin: async (request) => {
      const { data, error } = await getSupabase().rpc(
        "portal_begin_team_sign_in",
        {
          p_email: request.email,
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
    reportFailure: reportSignIn,
  });
}

export async function verifyTeamCode(
  input: unknown,
): Promise<VerifyCodeResult> {
  if (isFakeBackendEnabled()) {
    let signedInEmail = "";
    return runVerifyTeamCode(input, {
      codeState: fakeTeamCodeState,
      verify: async (request) => {
        signedInEmail = request.email;
        return fakeTeamVerify(request);
      },
      registerWrongCode: fakeTeamRegisterWrongCode,
      complete: () => Promise.resolve("member"),
      signOut: () => Promise.resolve(),
      startSession: async () => {
        await setSessionMarker(e2eTeamUserId(signedInEmail));
        (await cookies()).set(E2E_TEAM_COOKIE, signedInEmail, {
          httpOnly: true,
          path: "/",
          sameSite: "lax",
        });
      },
      reportFailure: () => undefined,
    });
  }

  const portal = await getPortalSupabase();
  return runVerifyTeamCode(input, {
    codeState: async (request) => {
      const { data, error } = await getSupabase().rpc(
        "portal_team_code_state",
        {
          p_email: request.email,
        },
      );
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
      return error.status === 403 || error.code === "otp_expired"
        ? "mismatch"
        : "error";
    },
    registerWrongCode: async (request) => {
      const { data, error } = await getSupabase().rpc(
        "portal_register_team_wrong_code",
        {
          p_email: request.email,
        },
      );
      if (error) return { error: { code: error.code } };
      return data;
    },
    complete: async () => {
      const { data, error } = await portal.rpc("portal_complete_team_sign_in");
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
    reportFailure: reportSignIn,
  });
}

/** Signs the teammate out on this device; the caller loads the sign-in page in full. */
export async function signOutTeam(): Promise<string> {
  const cookieStore = await cookies();
  cookieStore.delete(PORTAL_SESSION_COOKIE);
  cookieStore.delete(E2E_TEAM_COOKIE);
  if (!isFakeBackendEnabled()) {
    await (await getPortalSupabase()).auth.signOut();
  }
  return "/team/sign-in";
}

export async function inviteTeammateAction(
  input: unknown,
): Promise<InviteResult> {
  const fake = isFakeBackendEnabled();
  const portal = fake ? null : await getPortalSupabase();

  return runInvite(input, {
    viewer: getTeamViewer,
    checkInvite: async (email) => {
      if (!portal) return fakeCheckInvite(email);
      const { data, error } = await portal.rpc("portal_check_team_invite", {
        p_email: email,
      });
      if (error) return { error: { code: error.code } };
      const row = data.at(0);
      if (row?.status === "ok") return { status: "ok", userId: row.user_id };
      if (
        row?.status === "domain_not_allowed" ||
        row?.status === "already_member"
      ) {
        return { status: row.status };
      }
      return { error: { code: "unexpected_answer" } };
    },
    createAuthUser: (email) =>
      fake ? fakeCreateAuthUser(email) : createAuthUser(email),
    deleteAuthUser: (userId) =>
      fake ? Promise.resolve() : deleteAuthUser(userId),
    unblockAuthUser: (userId) =>
      fake ? Promise.resolve(true) : setAuthUserBlocked(userId, false),
    addMember: async (userId, name, role) => {
      if (!portal) return fakeAddMember(userId, name, role);
      const { error } = await portal.rpc("portal_add_team_member", {
        p_user_id: userId,
        p_name: name,
        p_role: role,
      });
      return error ? { error: { code: error.code } } : "ok";
    },
    reportFailure: reportAdmin,
  });
}

export async function removeTeammateAction(
  input: unknown,
): Promise<RemoveResult> {
  const fake = isFakeBackendEnabled();
  const portal = fake ? null : await getPortalSupabase();

  return runRemove(input, {
    viewer: getTeamViewer,
    removeMember: async (userId) => {
      if (!portal) return fakeRemoveMember(userId);
      const { error } = await portal.rpc("portal_remove_team_member", {
        p_user_id: userId,
      });
      return error ? { error: { code: error.code } } : "ok";
    },
    blockAuthUser: (userId) =>
      fake ? Promise.resolve(true) : setAuthUserBlocked(userId, true),
    reportFailure: reportAdmin,
  });
}
