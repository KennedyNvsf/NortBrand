import { checkUnsubscribeToken } from "./links";
import { unsubscribeLinkSchema, type UnsubscribeLink } from "./schema";
import type { RpcError } from "./subscribe";

/** `unsubscribed` for every valid link, whether or not the address was on the list. */
export type UnsubscribeResult =
  { status: "unsubscribed" } | { status: "invalid" } | { status: "failed" };

export type UnsubscribeDependencies = {
  tokenSecret: string;
  /** `unsubscribe_newsletter`: true for any valid token. */
  unsubscribe: (
    link: UnsubscribeLink,
  ) => Promise<{ unsubscribed: boolean } | { error: RpcError }>;
  reportFailure: (code: string) => void;
  /** Runs after the database is updated (removes the Resend contact). */
  onUnsubscribed: (link: UnsubscribeLink) => void;
};

/**
 * Unsubscribes from a newsletter link: the page's button (#41) or a mail client's
 * one-click POST (src/app/api/newsletter/unsubscribe). The link never expires.
 */
export async function unsubscribe(
  input: unknown,
  deps: UnsubscribeDependencies,
): Promise<UnsubscribeResult> {
  const parsed = unsubscribeLinkSchema.safeParse(input);
  if (!parsed.success) return { status: "invalid" };
  const link = parsed.data;

  if (!checkUnsubscribeToken(deps.tokenSecret, link)) {
    return { status: "invalid" };
  }

  const result = await deps.unsubscribe(link);
  if ("error" in result) {
    deps.reportFailure(result.error.code);
    return { status: "failed" };
  }
  // The token was valid here, so false means the secrets differ between the app and
  // Vault: report it, as every link would fail the same way.
  if (!result.unsubscribed) {
    deps.reportFailure("token_rejected");
    return { status: "failed" };
  }

  deps.onUnsubscribed(link);
  return { status: "unsubscribed" };
}
