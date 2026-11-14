import {
  maskEmail,
  requestCodeSchema,
  signInErrorKeys,
  verifyCodeSchema,
  type RequestCode,
  type SignInErrorKey,
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
 */

export const MIN_RESPONSE_MS = 1200;

type FieldErrors = Partial<
  Record<"email" | "projectId" | "code", SignInErrorKey>
>;

export type RequestCodeResult =
  | {
      status: "code_sent";
      email: string;
      projectId: string;
      maskedEmail: string;
    }
  | { status: "invalid"; fieldErrors: FieldErrors }
  | { status: "no_match" }
  | { status: "locked" }
  | { status: "rate_limited" }
  | { status: "failed" };

export type VerifyCodeResult =
  | { status: "signed_in"; projectId: string }
  | { status: "invalid"; fieldErrors: FieldErrors }
  | { status: "wrong_code"; triesLeft: number }
  | { status: "locked" }
  | { status: "expired" }
  | { status: "no_match" }
  | { status: "failed" };

type DbError = { error: { code: string | undefined } };

export type RequestCodeDeps = {
  begin: (
    request: RequestCode,
  ) => Promise<"ok" | "no_match" | "locked" | DbError>;
  sendCode: (
    request: RequestCode,
  ) => Promise<{ ok: true } | { ok: false; rateLimited: boolean }>;
  sleep: (ms: number) => Promise<void>;
  now: () => number;
  reportFailure: (where: string, code: string | undefined) => void;
};

export type VerifyCodeDeps = {
  codeState: (
    request: VerifyCode,
  ) => Promise<"active" | "expired" | "locked" | DbError>;
  verify: (request: VerifyCode) => Promise<"ok" | "mismatch" | "error">;
  registerWrongCode: (request: VerifyCode) => Promise<number | DbError>;
  /** Run with the new session; null when the user isn't this project's client. */
  complete: (request: VerifyCode) => Promise<string | null | DbError>;
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

export async function requestCode(
  input: unknown,
  deps: RequestCodeDeps,
): Promise<RequestCodeResult> {
  const parsed = requestCodeSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "invalid", fieldErrors: fieldErrors(parsed.error.issues) };
  }

  const started = deps.now();
  const result = await runRequestCode(parsed.data, deps);
  const elapsed = deps.now() - started;
  if (elapsed < MIN_RESPONSE_MS) await deps.sleep(MIN_RESPONSE_MS - elapsed);
  return result;
}

async function runRequestCode(
  request: RequestCode,
  deps: RequestCodeDeps,
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
    projectId: request.projectId,
    maskedEmail: maskEmail(request.email),
  };
}

export async function verifyCode(
  input: unknown,
  deps: VerifyCodeDeps,
): Promise<VerifyCodeResult> {
  const parsed = verifyCodeSchema.safeParse(input);
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
  return { status: "signed_in", projectId: request.projectId };
}
