import type { z } from "zod";

import {
  maskEmail,
  requestCodeSchema,
  signInErrorKeys,
  teamRequestCodeSchema,
  teamVerifyCodeSchema,
  verifyCodeSchema,
  type RequestCode,
  type SignInErrorKey,
  type TeamRequestCode,
  type TeamVerifyCode,
  type VerifyCode,
} from "./schema";

/*
 * The client sign-in rules (#131, ADR-009), free of Next.js and Supabase so they can be
 * tested with fakes. The server actions (actions.ts) supply the real dependencies, or
 * the e2e fakes (e2e-backend.ts).
 *
 * Step 1 (CP-01): email + Project ID → the database answers ok / no_match / locked, and
 * only on ok does Supabase send a code. Every outcome takes at least MIN_RESPONSE_MS,
 * so the response time doesn't tell a valid Project ID from an invalid one.
 * Step 2 (CP-02): the code → the database says whether a code is live; Supabase checks
 * it; a miss is counted (3 tries, then a pause); a match completes the sign-in as the
 * new user, which only succeeds for that user's own client row.
 *
 * Team sign-in (TM-14, #132) runs the same rules with the email alone: requestTeamCode
 * and verifyTeamCode. Completion then succeeds only for an active teammate.
 */

export const MIN_RESPONSE_MS = 1200;

type FieldErrors = Partial<
  Record<"email" | "projectId" | "code", SignInErrorKey>
>;

export type RequestCodeResult =
  | {
      status: "code_sent";
      email: string;
      /** null for team sign-in, which has no Project ID. */
      projectId: string | null;
      maskedEmail: string;
    }
  | { status: "invalid"; fieldErrors: FieldErrors }
  | { status: "no_match" }
  | { status: "locked" }
  | { status: "rate_limited" }
  | { status: "failed" };

export type VerifyCodeResult =
  | { status: "signed_in"; projectId: string | null }
  | { status: "invalid"; fieldErrors: FieldErrors }
  | { status: "wrong_code"; triesLeft: number }
  | { status: "locked" }
  | { status: "expired" }
  | { status: "no_match" }
  | { status: "failed" };

type DbError = { error: { code: string | undefined } };

type Identity = { email: string; projectId?: string };

export type RequestCodeDeps<R extends Identity = RequestCode> = {
  begin: (request: R) => Promise<"ok" | "no_match" | "locked" | DbError>;
  sendCode: (
    request: R,
  ) => Promise<{ ok: true } | { ok: false; rateLimited: boolean }>;
  sleep: (ms: number) => Promise<void>;
  now: () => number;
  reportFailure: (where: string, code: string | undefined) => void;
};

export type VerifyCodeDeps<V extends Identity & { code: string } = VerifyCode> =
  {
    codeState: (
      request: V,
    ) => Promise<"active" | "expired" | "locked" | DbError>;
    verify: (request: V) => Promise<"ok" | "mismatch" | "error">;
    registerWrongCode: (request: V) => Promise<number | DbError>;
    /**
     * Run with the new session; null when the user isn't this project's client (or,
     * for the team, not an active teammate).
     */
    complete: (request: V) => Promise<string | null | DbError>;
    /** Called when verification succeeded but completion didn't: drop the session. */
    signOut: () => Promise<void>;
    /** Start the 30-day session marker (session-marker.ts). */
    startSession: () => Promise<void>;
    reportFailure: (where: string, code: string | undefined) => void;
  };

function isDbError(value: unknown): value is DbError {
  return typeof value === "object" && value !== null && "error" in value;
}

function isErrorKey(message: string): message is SignInErrorKey {
  return (signInErrorKeys as readonly string[]).includes(message);
}

function fieldErrors(
  issues: { path: PropertyKey[]; message: string }[],
): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of issues) {
    const field = issue.path[0];
    const isField =
      field === "email" || field === "projectId" || field === "code";
    if (isField && !errors[field] && isErrorKey(issue.message)) {
      errors[field] = issue.message;
    }
  }
  return errors;
}

/** Client sign-in, step 1: email + Project ID. */
export function requestCode(
  input: unknown,
  deps: RequestCodeDeps,
): Promise<RequestCodeResult> {
  return requestWith(requestCodeSchema, input, deps);
}

/** Team sign-in, step 1: email only. */
export function requestTeamCode(
  input: unknown,
  deps: RequestCodeDeps<TeamRequestCode>,
): Promise<RequestCodeResult> {
  return requestWith(teamRequestCodeSchema, input, deps);
}

async function requestWith<R extends Identity>(
  schema: z.ZodType<R>,
  input: unknown,
  deps: RequestCodeDeps<R>,
): Promise<RequestCodeResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { status: "invalid", fieldErrors: fieldErrors(parsed.error.issues) };
  }

  const started = deps.now();
  const result = await runRequestCode(parsed.data, deps);
  const elapsed = deps.now() - started;
  if (elapsed < MIN_RESPONSE_MS) await deps.sleep(MIN_RESPONSE_MS - elapsed);
  return result;
}

async function runRequestCode<R extends Identity>(
  request: R,
  deps: RequestCodeDeps<R>,
): Promise<RequestCodeResult> {
  const answer = await deps.begin(request);
  if (isDbError(answer)) {
    if (answer.error.code === "PT429") return { status: "rate_limited" };
    deps.reportFailure("begin", answer.error.code);
    return { status: "failed" };
  }
  if (answer === "no_match") return { status: "no_match" };
  if (answer === "locked") return { status: "locked" };

  const sent = await deps.sendCode(request);
  if (!sent.ok) {
    if (sent.rateLimited) return { status: "rate_limited" };
    deps.reportFailure("send", undefined);
    return { status: "failed" };
  }
  return {
    status: "code_sent",
    email: request.email,
    projectId: request.projectId ?? null,
    maskedEmail: maskEmail(request.email),
  };
}

/** Client sign-in, step 2. */
export function verifyCode(
  input: unknown,
  deps: VerifyCodeDeps,
): Promise<VerifyCodeResult> {
  return verifyWith(verifyCodeSchema, input, deps);
}

/** Team sign-in, step 2. */
export function verifyTeamCode(
  input: unknown,
  deps: VerifyCodeDeps<TeamVerifyCode>,
): Promise<VerifyCodeResult> {
  return verifyWith(teamVerifyCodeSchema, input, deps);
}

async function verifyWith<V extends Identity & { code: string }>(
  schema: z.ZodType<V>,
  input: unknown,
  deps: VerifyCodeDeps<V>,
): Promise<VerifyCodeResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { status: "invalid", fieldErrors: fieldErrors(parsed.error.issues) };
  }
  const request = parsed.data;

  const state = await deps.codeState(request);
  if (isDbError(state)) {
    deps.reportFailure("code_state", state.error.code);
    return { status: "failed" };
  }
  if (state !== "active") return { status: state };

  const verified = await deps.verify(request);
  if (verified === "error") {
    deps.reportFailure("verify", undefined);
    return { status: "failed" };
  }
  if (verified === "mismatch") {
    const triesLeft = await deps.registerWrongCode(request);
    if (isDbError(triesLeft)) {
      deps.reportFailure("register_wrong_code", triesLeft.error.code);
      return { status: "failed" };
    }
    return triesLeft > 0
      ? { status: "wrong_code", triesLeft }
      : { status: "locked" };
  }

  const projectUuid = await deps.complete(request);
  if (isDbError(projectUuid) || projectUuid === null) {
    if (isDbError(projectUuid))
      deps.reportFailure("complete", projectUuid.error.code);
    await deps.signOut();
    return isDbError(projectUuid)
      ? { status: "failed" }
      : { status: "no_match" };
  }

  await deps.startSession();
  return { status: "signed_in", projectId: request.projectId ?? null };
}
