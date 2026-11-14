import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import { fill } from "@/features/portal/auth/components/copy";
import { listTeammates } from "@/features/portal/team/access";
import { teamPagesCopy, teamShellCopy } from "@/features/portal/team/copy";
import { getTeamShell } from "@/features/portal/team/shell-data";
import { ReadOnlyNotice } from "@/features/portal/states/messages";
import { PageSkeleton } from "@/features/portal/states/skeletons";

/*
 * Settings (#133 shell; the settings themselves are #142). Members see the page exists
 * but not change it (TM-09 "Settings · members"); the server enforces the same rule in
 * every settings action and in SQL.
 */

export const metadata: Metadata = { title: teamPagesCopy.settings.title };

export default function SettingsPage() {
  return (
    <Suspense fallback={<PageSkeleton label={teamShellCopy.loading} />}>
      <SettingsContent />
    </Suspense>
  );
}

async function SettingsContent() {
  const data = await getTeamShell();
  if (!data) return null;
  const copy = teamPagesCopy.settings;

  if (data.viewer.role !== "admin") {
    const admin = (await listTeammates()).find(
      (person) => person.role === "admin",
    );
    return (
      <div className="flex flex-col gap-lg">
        <h1 className="text-h3 text-text-primary">{copy.title}</h1>
        <ReadOnlyNotice
          title={copy.readOnlyTitle}
          body={fill(copy.readOnlyBody, { admin: admin?.name ?? "an admin" })}
          action={
            <Button asChild variant="secondary">
              <Link href="/team">{copy.back}</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-lg">
      <h1 className="text-h3 text-text-primary">{copy.title}</h1>
      <p className="max-w-reading text-body text-text-muted">
        {copy.adminBody}
      </p>
    </div>
  );
}
