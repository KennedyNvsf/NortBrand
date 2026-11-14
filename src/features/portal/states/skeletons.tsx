import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/*
 * Loading states (#133; Figma CP-08 "Overview · loading", 14 Portal — Motion "Loading").
 * A static skeleton in the final layout, so nothing jumps when data arrives. It appears
 * only after 300 ms (a fast load shows nothing), then the content replaces it. No
 * shimmer and never a spinner. Server-safe: the delay is a CSS animation.
 */

export function Delayed({
  label,
  children,
  className,
}: {
  /** Announced to screen readers while loading. */
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-label={label}
      className={className}
      style={{ animation: "enter-fade var(--duration-fast) linear 300ms both" }}
    >
      {children}
    </div>
  );
}

export function Bone({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("block rounded-sm bg-bg-primary", className)}
    />
  );
}

/** A page's heading, intro and a row of cards: the Overview shape at every width. */
export function PageSkeleton({ label }: { label: string }) {
  return (
    <Delayed label={label} className="flex flex-col gap-lg">
      <div className="flex flex-col gap-3">
        <Bone className="h-3 w-32" />
        <Bone className="h-9 w-2/3 max-w-md" />
        <Bone className="h-4 w-full max-w-xl" />
      </div>
      <div className="grid gap-md md:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((card) => (
          <div
            key={card}
            className="flex flex-col gap-3 rounded-lg border border-border-default p-lg"
          >
            <Bone className="h-3 w-20" />
            <Bone className="h-6 w-28" />
          </div>
        ))}
      </div>
      <Bone className="h-48 w-full rounded-lg" />
    </Delayed>
  );
}

/** The shell's frame while the session and project load: top bar and sidebar shapes. */
export function ShellSkeleton({ label }: { label: string }) {
  return (
    <div className="flex min-h-dvh flex-col bg-bg-surface">
      <div className="h-14 border-b border-border-default md:h-16" />
      <div className="flex flex-1">
        <div className="hidden w-[232px] shrink-0 border-r border-border-default lg:block" />
        <main id="main" className="min-w-0 flex-1 px-(--gutter) py-8 lg:px-10">
          <PageSkeleton label={label} />
        </main>
      </div>
    </div>
  );
}
