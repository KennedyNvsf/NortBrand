import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import { fill } from "@/features/portal/auth/components/copy";
import { listTeammates } from "@/features/portal/team/access";
import {
  settingsCopy,
  teamPagesCopy,
  teamShellCopy,
} from "@/features/portal/team/copy";
import { SettingsForm } from "@/features/portal/team/settings/components/settings-form";
import { getWorkspaceSettings } from "@/features/portal/team/settings/data";
import { getTeamShell } from "@/features/portal/team/shell-data";
import { ReadOnlyNotice } from "@/features/portal/states/messages";
import { PageSkeleton } from "@/features/portal/states/skeletons";

/*
 * Settings (#133 shell; #159 the settings; Figma TM-13 546:583). Admins edit; members see
 * the TM-09 "Settings · members" notice above the same values, read-only. The server
 * refuses a member's save in the action and in SQL (portal_save_settings).
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
  const isAdmin = data.viewer.role === "admin";
  const settings = await getWorkspaceSettings();

  const notice = isAdmin ? null : (
    <ReadOnlyNotice
      title={copy.readOnlyTitle}
      body={fill(copy.readOnlyBody, {
        admin:
          (await listTeammates()).find((person) => person.role === "admin")
            ?.name ?? "an admin",
      })}
      action={
        <Button asChild variant="secondary">
          <Link href="/team">{copy.back}</Link>
        </Button>
      }
    />
  );

  return (
    <div className="flex flex-col gap-lg">
      <div className="flex flex-col gap-sm">
        <h1 className="text-h3 text-text-primary">{copy.title}</h1>
        {isAdmin ? (
          <p className="text-body text-text-muted">{copy.adminBody}</p>
        ) : null}
      </div>
      {notice}
      {settings ? (
        <SettingsForm
          // A new key after every save or discard: the form starts clean from the
          // stored values.
          key={settings.updatedAt}
          settings={settings}
          copy={settingsCopy}
          readOnly={!isAdmin}
        />
      ) : (
        <p role="alert" className="text-body text-text-muted">
          {copy.loadFailed}
        </p>
      )}
    </div>
  );
}
