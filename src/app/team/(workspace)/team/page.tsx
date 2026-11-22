import * as Sentry from "@sentry/nextjs";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

import { PageSkeleton } from "@/features/portal/states/skeletons";
import { getTeamViewer } from "@/features/portal/team/access";
import { TeamRoster } from "@/features/portal/team/components/team-roster";
import {
  teamPageCopy,
  teamShellCopy,
  teamTableCopy,
} from "@/features/portal/team/copy";
import { getTeamOverview } from "@/features/portal/team/people/data";

/*
 * Team (#132, #142; Figma TM-12): role summary, the people table (role, projects, open
 * tickets, last active), invite, role change and remove. Dynamic and per user; the
 * workspace layout guards the session.
 */

export const metadata: Metadata = { title: teamPageCopy.metaTitle };

export default function TeamPage() {
  return (
    <Suspense fallback={<PageSkeleton label={teamShellCopy.loading} />}>
      <TeamContent />
    </Suspense>
  );
}

async function TeamContent() {
  await connection();
  const viewer = await getTeamViewer();
  if (viewer.status !== "signed_in") return null;

  let overview;
  try {
    overview = await getTeamOverview();
  } catch (error) {
    Sentry.captureException(error, { tags: { feature: "portal-team" } });
    return (
      <div className="flex flex-col gap-lg">
        <h1 className="text-h3 text-text-primary">{teamPageCopy.title}</h1>
        <p role="alert" className="text-body text-text-muted">
          {teamTableCopy.loadFailed}
        </p>
      </div>
    );
  }

  return (
    <TeamRoster
      copy={teamPageCopy}
      tableCopy={teamTableCopy}
      overview={overview}
      viewer={{ userId: viewer.userId, role: viewer.role }}
      now={new Date().toISOString()}
    />
  );
}
