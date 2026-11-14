"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

import type { TeamPagesCopy } from "../../copy";

/*
 * The "New project" button (#136). The dialog (a form, Radix Dialog and Select) loads in
 * its own chunk: fetched when the browser is idle, or on hover/focus of the button, and
 * mounted the first time it opens; it then stays mounted so it can animate closed.
 */

const loadDialog = () =>
  import("./new-project-dialog").then((m) => m.NewProjectDialog);
const NewProjectDialog = dynamic(loadDialog);

const prefetch = () => {
  void loadDialog();
};

export function NewProjectLauncher({
  label,
  copy,
  team,
  viewerId,
  suggestedId,
}: {
  label: string;
  copy: TeamPagesCopy["newProject"];
  team: { userId: string; name: string }[];
  viewerId: string;
  suggestedId: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if ("requestIdleCallback" in window) {
      const handle = window.requestIdleCallback(prefetch, { timeout: 5000 });
      return () => {
        window.cancelIdleCallback(handle);
      };
    }
    const handle = setTimeout(prefetch, 3000);
    return () => {
      clearTimeout(handle);
    };
  }, []);

  return (
    <>
      <Button
        type="button"
        aria-haspopup="dialog"
        onPointerEnter={prefetch}
        onFocus={prefetch}
        onClick={() => {
          setMounted(true);
          setOpen(true);
        }}
      >
        {label}
      </Button>
      {mounted ? (
        <NewProjectDialog
          open={open}
          onOpenChange={setOpen}
          copy={copy}
          team={team}
          viewerId={viewerId}
          suggestedId={suggestedId}
        />
      ) : null}
    </>
  );
}
