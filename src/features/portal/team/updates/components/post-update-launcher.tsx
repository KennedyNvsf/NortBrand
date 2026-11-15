"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";

import type { TeamUpdatesCopy } from "../../copy";
import type { EditingUpdate } from "./post-update-dialog";

/*
 * Opens the Post update dialog (#139). The dialog loads in its own chunk: fetched when
 * the browser is idle, or on hover/focus of the button, and mounted the first time it
 * opens. `variant="composer"` is the "Share an update with …" bar on the updates page;
 * `editing` turns it into an Edit button for one post.
 */

const loadDialog = () =>
  import("./post-update-dialog").then((m) => m.PostUpdateDialog);
const PostUpdateDialog = dynamic(loadDialog);

const prefetch = () => {
  void loadDialog();
};

export function PostUpdateLauncher({
  copy,
  projectId,
  clientName,
  authorName,
  tickets,
  editing = null,
  variant = "button",
  label,
  ariaLabel,
  children,
}: {
  copy: TeamUpdatesCopy;
  projectId: string;
  clientName: string;
  authorName: string;
  tickets: { id: string; title: string }[];
  editing?: EditingUpdate | null;
  variant?: "button" | "secondary" | "composer" | "link";
  label: string;
  ariaLabel?: string;
  children?: ReactNode;
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

  const openDialog = () => {
    setMounted(true);
    setOpen(true);
  };

  const trigger =
    variant === "composer" ? (
      <button
        type="button"
        aria-haspopup="dialog"
        onPointerEnter={prefetch}
        onFocus={prefetch}
        onClick={openDialog}
        className="flex min-h-11 flex-1 items-center text-left text-[15px] text-text-muted"
      >
        {label}
      </button>
    ) : variant === "link" ? (
      <button
        type="button"
        aria-haspopup="dialog"
        aria-label={ariaLabel}
        onPointerEnter={prefetch}
        onFocus={prefetch}
        onClick={openDialog}
        className="touch-target min-h-11 text-[14px] text-text-primary hover:underline lg:min-h-8"
      >
        {label}
      </button>
    ) : (
      <Button
        type="button"
        variant={variant === "secondary" ? "secondary" : "primary"}
        aria-haspopup="dialog"
        onPointerEnter={prefetch}
        onFocus={prefetch}
        onClick={openDialog}
      >
        {label}
      </Button>
    );

  return (
    <>
      {children}
      {trigger}
      {mounted ? (
        <PostUpdateDialog
          key={editing?.updateId ?? "new"}
          copy={copy}
          projectId={projectId}
          clientName={clientName}
          authorName={authorName}
          tickets={tickets}
          editing={editing}
          open={open}
          onOpenChange={setOpen}
        />
      ) : null}
    </>
  );
}
