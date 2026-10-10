import type { ReactNode } from "react";

import { LogoMark } from "@/components/site/logo";

/*
 * The designed 404 (Figma 08 — System / States: desktop 320:3, tablet 380:77, mobile
 * 380:129): "4 · squiggle · 4", the H1, a lead and two actions. Shared by the localized
 * not-found page and the root fallback, which each pass their own links.
 * - The numerals are decorative: the H1 says what happened.
 * - The squiggle draws once on load (Motion Spec › System › 404); static with reduced
 *   motion.
 */
export function NotFoundContent({
  title,
  lead,
  actions,
}: {
  title: ReactNode;
  lead: string;
  actions: ReactNode;
}) {
  return (
    <main
      id="main"
      className="flex flex-1 flex-col items-center justify-center gap-lg bg-bg-surface px-(--gutter) pt-12 pb-20 text-center md:gap-xl md:pt-16 lg:pt-17"
    >
      <div
        aria-hidden
        className="flex items-center gap-1 text-numeral text-text-primary md:gap-sm"
      >
        <span>4</span>
        <LogoMark draw="once" className="size-21 md:size-35 lg:size-50" />
        <span>4</span>
      </div>
      <h1 className="text-h1 text-text-primary lg:max-w-200">{title}</h1>
      <p className="max-w-140 text-body text-text-muted md:text-lead">{lead}</p>
      <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:gap-md">
        {actions}
      </div>
    </main>
  );
}
