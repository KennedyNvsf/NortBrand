import { checkConfirmToken } from "./links";
import { confirmLinkSchema, type ConfirmLink } from "./schema";
import type { RpcError } from "./subscribe";

/**
 * What the confirm page (#41) shows. `invalid` covers forged links and links replaced
 * by a newer signup; `expired` is a genuine link older than seven days, so the page can
 * suggest subscribing again. Neither says whether the address is on the list.
 */
export type ConfirmResult =
  | { status: "confirmed" }
  | { status: "expired" }
  | { status: "invalid" }
  | { status: "failed" };

export type ConfirmDependencies = {
  /** Unix time in seconds. */
  now: () => number;
  tokenSecret: string;
  /** `confirm_newsletter`: false for a stale, reused or unknown link. */
  confirm: (
    link: ConfirmLink,
  ) => Promise<{ confirmed: boolean } | { error: RpcError }>;
  reportFailure: (code: string) => void;
  /** Runs once the address is subscribed (adds it to the Resend segment). */
  onConfirmed: (link: ConfirmLink) => void;
};

/**
 * Confirms a subscription from the confirm page's button, never from opening the link,
 * so a mail scanner that follows links cannot subscribe anyone.
 */
export async function confirmSubscription(
  input: unknown,
  deps: ConfirmDependencies,
): Promise<ConfirmResult> {
  const parsed = confirmLinkSchema.safeParse(input);
  if (!parsed.success) return { status: "invalid" };
  const link = parsed.data;

  const check = checkConfirmToken(
    deps.tokenSecret,
    { email: link.email, issuedAt: link.issued, token: link.token },
    deps.now(),
  );
  if (check !== "ok") return { status: check };

  const result = await deps.confirm(link);
  if ("error" in result) {
    deps.reportFailure(result.error.code);
    return { status: "failed" };
  }
  if (!result.confirmed) return { status: "invalid" };

  deps.onConfirmed(link);
  return { status: "confirmed" };
}
