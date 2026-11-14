import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { Logo } from "@/components/site/logo";
import { SignOutButton } from "@/features/portal/auth/components/sign-out-button";
import { getTeamViewer, listTeammates } from "@/features/portal/team/access";
import { signOutTeam } from "@/features/portal/team/actions";
import { TeamRoster } from "@/features/portal/team/components/team-roster";
import { teamPageCopy } from "@/features/portal/team/copy";

/*
 * The team workspace (#132). For now the guard, the role summary and the team list with
 * invite and remove: the portal shell (#133) and the full Team page (TM-12, the My
 * tickets / Team / Settings ticket) build on it. Logged in docs/tech-debt.md.
 * Per request and per user (ADR-009): the session is read inside Suspense, nothing is
 * cached across users.
 */

export const metadata: Metadata = { title: teamPageCopy.metaTitle };

export default function TeamPage() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-reading flex-col gap-lg px-(--gutter) py-10 lg:py-16">
      <header className="flex items-center justify-between gap-md">
        <Logo className="h-6 w-auto" />
      </header>
      <main id="main" className="flex flex-col gap-lg">
        <Suspense fallback={<div aria-hidden className="h-40" />}>
          <TeamContent />
        </Suspense>
      </main>
    </div>
  );
}

async function TeamContent() {
  const viewer = await getTeamViewer();
  if (viewer.status !== "signed_in") {
    redirect(
      viewer.status === "signed_out"
        ? "/team/sign-in?reason=signed-out"
        : "/team/sign-in",
    );
  }
  const team = await listTeammates();
  const copy = teamPageCopy;

  return (
    <>
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-2">
          <p className="text-overline text-action-secondary">{copy.eyebrow}</p>
          <h1 className="text-h1 text-text-primary">{copy.title}</h1>
        </div>
        <SignOutButton label={copy.signOut} signOut={signOutTeam} />
      </div>
      <div className="grid gap-md md:grid-cols-2">
        <div className="rounded-lg border border-border-default p-lg">
          <h2 className="text-label text-text-primary">{copy.admin}</h2>
          <p className="text-small text-text-muted">{copy.adminSummary}</p>
        </div>
        <div className="rounded-lg border border-border-default p-lg">
          <h2 className="text-label text-text-primary">{copy.member}</h2>
          <p className="text-small text-text-muted">{copy.memberSummary}</p>
        </div>
      </div>
      <TeamRoster
        copy={copy}
        team={team}
        viewer={{ userId: viewer.userId, role: viewer.role }}
      />
    </>
  );
}
