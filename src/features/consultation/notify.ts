import type { OutgoingEmail, SendResult } from "@/lib/resend";

import type { ConsultationRequest } from "./schema";
import type { RenderedEmail } from "./emails/render";

export type NotifyDependencies = {
  notifyTo: string;
  studioEmail: string;
  renderAlert: (
    request: ConsultationRequest,
    requestId: string,
    receivedAt: Date,
  ) => Promise<RenderedEmail>;
  renderConfirmation: (request: ConsultationRequest) => Promise<RenderedEmail>;
  send: (email: OutgoingEmail) => Promise<SendResult>;
  /** `mark_consultation_notified`; false when the row was not updated. */
  markNotified: (requestId: string) => Promise<boolean>;
  /** Reports a failure with no personal data (Sentry in production). */
  reportFailure: (step: string, code: string) => void;
};

/**
 * Sends the team alert and the visitor confirmation, then records the alert. Runs after
 * the response, so nothing here can change what the visitor sees: the request is
 * already stored, and every failure is reported, never thrown.
 *
 * `notified_at` means "the team was told", so only the alert sets it. A failed
 * confirmation is reported but leaves the alert's record alone.
 */
export async function sendConsultationEmails(
  request: ConsultationRequest,
  requestId: string,
  receivedAt: Date,
  deps: NotifyDependencies,
): Promise<void> {
  const [alert, confirmation] = await Promise.allSettled([
    deps
      .renderAlert(request, requestId, receivedAt)
      .then((email) =>
        deps.send({ ...email, to: deps.notifyTo, replyTo: request.email }),
      ),
    deps
      .renderConfirmation(request)
      .then((email) =>
        deps.send({ ...email, to: request.email, replyTo: deps.studioEmail }),
      ),
  ]);

  if (confirmation.status === "rejected") {
    deps.reportFailure("confirmation", "render_failed");
  } else if (!confirmation.value.ok) {
    deps.reportFailure("confirmation", confirmation.value.code);
  }

  if (alert.status === "rejected") {
    deps.reportFailure("alert", "render_failed");
    return;
  }
  if (!alert.value.ok) {
    deps.reportFailure("alert", alert.value.code);
    return;
  }

  try {
    if (!(await deps.markNotified(requestId))) {
      deps.reportFailure("mark_notified", "not_updated");
    }
  } catch {
    deps.reportFailure("mark_notified", "threw");
  }
}
