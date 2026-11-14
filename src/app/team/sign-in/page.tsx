import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { Logo } from "@/components/site/logo";
import { AuthCard } from "@/features/portal/auth/components/auth-card";
import { BrandPanel } from "@/features/portal/auth/components/brand-panel";
import { getTeamViewer } from "@/features/portal/team/access";
import { TeamSignIn } from "@/features/portal/team/components/team-sign-in";
import { teamBrandCopy } from "@/features/portal/team/copy";

/*
 * Team sign-in (Figma TM-14, #132): standalone (logo only), the shared AuthCard and code
 * step. Like client sign-in, the form is part of the static shell; the session streams
 * in beside it and only ever redirects (a signed-in teammate → the workspace, an ended
 * session → ?reason=signed-out).
 */

export const metadata: Metadata = { title: "Sign in" };

export default function TeamSignInPage({
  searchParams,
}: PageProps<"/team/sign-in">) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="px-(--gutter) py-md lg:px-12 lg:py-8">
        <Logo className="h-6 w-auto" />
      </header>
      <main
        id="main"
        className="pb-16 md:px-(--gutter) md:pt-8 md:pb-24 lg:py-16"
      >
        <AuthCard
          form={
            <>
              <TeamSignIn />
              <Suspense fallback={null}>
                <SessionGate searchParams={searchParams} />
              </Suspense>
            </>
          }
          brand={
            <BrandPanel
              className="lg:flex-1"
              eyebrow={teamBrandCopy.eyebrow}
              title={
                <>
                  {teamBrandCopy.titleLines[0]}
                  <br />
                  {teamBrandCopy.titleLines[1]}
                </>
              }
              body={teamBrandCopy.body}
              stages={teamBrandCopy.stages}
            />
          }
        />
      </main>
    </div>
  );
}

async function SessionGate({
  searchParams,
}: {
  searchParams: PageProps<"/team/sign-in">["searchParams"];
}) {
  const viewer = await getTeamViewer();
  if (viewer.status === "signed_in") redirect("/team");
  if (viewer.status === "signed_out") {
    const { reason } = await searchParams;
    if (reason !== "signed-out") redirect("/team/sign-in?reason=signed-out");
  }
  return null;
}
