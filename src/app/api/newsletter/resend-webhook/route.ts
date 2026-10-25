import { getServerEnv } from "@/env";
import { unsubscribeNewsletter } from "@/features/newsletter/actions";
import { syncResendUnsubscribe } from "@/features/newsletter/resend-webhook";
import { verifyResendWebhook } from "@/lib/resend-webhook";

/**
 * Resend's webhook (#86), subscribed to `contact.updated` only (runbook: environments.md
 * › Resend). The signature is checked before anything else: an unsigned or forged
 * request gets 401 and changes nothing.
 *
 * Status codes tell Resend whether to retry: 500 only when the database or Resend failed
 * (a retry may succeed). Ignored events and addresses our schema rejects get 200, since
 * retrying cannot change them. The body never echoes the address.
 */
export async function POST(request: Request): Promise<Response> {
  const event = verifyResendWebhook(await request.text(), request.headers);
  if (event === null) {
    return Response.json(
      { result: "invalid signature" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const { status } = await syncResendUnsubscribe(event, {
    tokenSecret: getServerEnv().NEWSLETTER_TOKEN_SECRET,
    unsubscribe: unsubscribeNewsletter,
  });

  return Response.json(
    { result: status },
    {
      status: status === "failed" ? 500 : 200,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
