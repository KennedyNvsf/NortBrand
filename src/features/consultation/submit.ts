import { z } from "zod";

import {
  consultationSchema,
  toFieldErrors,
  type ConsultationFieldErrors,
  type ConsultationRequest,
} from "./schema";
import { checkFormToken } from "./form-token";

/** What the form receives. Bots get a `success` too, so they learn nothing. */
export type ConsultationResult =
  | { status: "success" }
  | { status: "validation"; fieldErrors: ConsultationFieldErrors }
  | { status: "rate-limited" }
  | { status: "failed" };

/** The fields the form posts besides the request itself. */
const envelopeSchema = z.object({
  /** Honeypot: visually hidden, unlabelled for people; any value means a bot. */
  website: z.unknown().optional(),
  formToken: z.unknown().optional(),
});

/** A Postgres/PostgREST error, reduced to what is safe to log: the code. */
export type InsertError = { code: string };

export type SubmitDependencies = {
  now: () => number;
  tokenSecret: string;
  ipHash: () => string;
  insert: (
    request: ConsultationRequest,
    ipHash: string,
  ) => Promise<{ id: string } | { error: InsertError }>;
  /** Reports a failure with no personal data (Sentry in production). */
  reportFailure: (code: string) => void;
  /** Runs once the request is stored (schedules the emails). Never on a failed insert. */
  onCreated: (requestId: string, request: ConsultationRequest) => void;
};

/** SQLSTATE raised by `private.enforce_write_limit` (HTTP 429 through PostgREST). */
const RATE_LIMITED = "PT429";

/**
 * The consultation request flow after the browser: honeypot and fill-time check, zod,
 * then the `submit_consultation_request` RPC, then the emails via `onCreated`
 * (CLAUDE.md › Consultation request flow).
 */
export async function submitConsultation(
  input: unknown,
  deps: SubmitDependencies,
): Promise<ConsultationResult> {
  const envelope = envelopeSchema.safeParse(input);
  if (!envelope.success) return { status: "failed" };

  const { website, formToken } = envelope.data;
  if (website !== undefined && website !== "") return { status: "success" };
  if (checkFormToken(deps.tokenSecret, formToken, deps.now()) !== "ok") {
    return { status: "success" };
  }

  const parsed = consultationSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "validation", fieldErrors: toFieldErrors(parsed.error) };
  }

  const result = await deps.insert(parsed.data, deps.ipHash());
  if ("error" in result) {
    if (result.error.code === RATE_LIMITED) return { status: "rate-limited" };
    deps.reportFailure(result.error.code);
    return { status: "failed" };
  }

  deps.onCreated(result.id, parsed.data);
  return { status: "success" };
}
