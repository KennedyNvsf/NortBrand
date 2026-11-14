import type { Metadata } from "next";

import { StatesGallery } from "@/features/portal/team/components/states-gallery";
import { teamStatesCopy } from "@/features/portal/team/copy";

/*
 * Portal states (#133): CP-08 and TM-09 as live components, for design review and the
 * accessibility checks. Team only (inside the workspace guard), noindex like every team
 * page, and not in the navigation.
 */

export const metadata: Metadata = { title: teamStatesCopy.metaTitle };

export default function StatesPage() {
  const copy = teamStatesCopy;
  return (
    <div className="flex flex-col gap-xl">
      <div className="flex flex-col gap-2">
        <p className="text-overline text-text-muted">{copy.eyebrow}</p>
        <h1 className="text-h3 text-text-primary">{copy.title}</h1>
        <p className="max-w-reading text-body text-text-muted">{copy.intro}</p>
      </div>
      <StatesGallery />
    </div>
  );
}
