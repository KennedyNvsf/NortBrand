import type { ReactNode } from "react";

import { LogoMark } from "@/components/site/logo";
import { cn } from "@/lib/utils";

/*
 * Empty states (#133; CP-08 "Overview · new project", TM-09 "Projects · first run"). One
 * clear sentence about what happens next instead of zeros or an empty table, and at
 * most one action.
 */
export function EmptyState({
  title,
  body,
  action,
  mark = false,
  headingLevel = 2,
  className,
}: {
  title: string;
  body: string;
  action?: ReactNode;
  /** The logomark above the title (the client's day-one state). */
  mark?: boolean;
  headingLevel?: 1 | 2;
  className?: string;
}) {
  const Heading = headingLevel === 1 ? "h1" : "h2";
  return (
    <div
      className={cn(
        "flex max-w-[480px] flex-col items-start gap-md rounded-lg border border-border-default bg-bg-surface p-lg md:p-xl",
        className,
      )}
    >
      {mark ? <LogoMark className="h-10 w-12 text-action-primary" /> : null}
      <Heading className="text-h4 text-text-primary">{title}</Heading>
      <p className="text-body text-text-muted">{body}</p>
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  );
}
