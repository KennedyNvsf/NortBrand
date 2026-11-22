import { PORTAL_SESSION_DAYS, toSessionDays } from "./session-marker";

/*
 * What `portal_complete_client_sign_in` answers (#159). Since #159 it returns one row:
 * the project, the session length to sign the marker with, and, on a client's first
 * sign-in while Settings › "Tell me when a client signs in for the first time" is on,
 * the project lead to email. Before #159 it returned the project id alone; that shape is
 * still accepted, so sign-in keeps working while a deploy waits for its migration.
 *
 * Server-only data: the lead's address never reaches the browser.
 */

export type FirstSignInNotice = {
  leadEmail: string;
  leadName: string;
  projectName: string;
  publicId: string;
  clientEmail: string;
};

export type Completion = {
  projectId: string;
  sessionDays: number;
  notice: FirstSignInNotice | null;
};

const text = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 ? value : null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Null when nothing was completed (not a client of that project, or it's closed). */
export function parseCompletion(data: unknown): Completion | null {
  const legacyId = text(data);
  if (legacyId) {
    return {
      projectId: legacyId,
      sessionDays: PORTAL_SESSION_DAYS,
      notice: null,
    };
  }

  const row: unknown = Array.isArray(data) ? data[0] : data;
  if (!isRecord(row)) return null;
  const projectId = text(row.project_id);
  if (!projectId) return null;

  const leadEmail = text(row.notify_email);
  const leadName = text(row.notify_name);
  const projectName = text(row.project_name);
  const publicId = text(row.project_public_id);
  const clientEmail = text(row.client_email);

  return {
    projectId,
    sessionDays: toSessionDays(row.session_days),
    notice:
      leadEmail && leadName && projectName && publicId && clientEmail
        ? { leadEmail, leadName, projectName, publicId, clientEmail }
        : null,
  };
}
