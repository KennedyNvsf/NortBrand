import type { ReactNode } from "react";

/*
 * Message states (#133; TM-09).
 * - NoResults ("Search · no results"): explains what search covers, so the next try works.
 * - ReadOnlyNotice ("Settings · members"): members can see a page exists but not change
 *   it; the server enforces the same rule.
 */

export function NoResults({ title, body }: { title: string; body: string }) {
  return (
    <div role="status" className="flex flex-col gap-2">
      <h2 className="text-h4 text-text-primary">{title}</h2>
      <p className="text-body text-text-muted">{body}</p>
    </div>
  );
}

export function ReadOnlyNotice({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex max-w-[480px] flex-col items-start gap-md rounded-lg border border-border-default p-lg md:p-xl">
      <h2 className="text-h4 text-text-primary">{title}</h2>
      <p className="text-body text-text-muted">{body}</p>
      {action}
    </div>
  );
}
