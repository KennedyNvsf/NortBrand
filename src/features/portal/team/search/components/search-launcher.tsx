"use client";

import { Search } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import { ICON_STROKE } from "@/lib/icons";

import type { TeamSearchCopy } from "../../copy";

/*
 * The top-bar search (#142; Figma TM-01 top bar, TM-M05 icon on phones). A button that
 * looks like the search field on tablet and up, an icon on phones, and ⌘K / Ctrl+K from
 * anywhere in the workspace. The dialog loads in its own chunk: when the browser is idle,
 * or on hover/focus, and mounts the first time it opens.
 */

const loadDialog = () => import("./search-dialog").then((m) => m.SearchDialog);
const SearchDialog = dynamic(loadDialog);

const prefetch = () => {
  void loadDialog();
};

export function SearchLauncher({
  copy,
  label,
}: {
  copy: TeamSearchCopy;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setMounted(true);
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    // Prefetch the dialog when the browser is idle (Safari has no idle callback).
    const useIdle = typeof window.requestIdleCallback === "function";
    const idle = useIdle
      ? window.requestIdleCallback(prefetch, { timeout: 5000 })
      : window.setTimeout(prefetch, 3000);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (useIdle) window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
    };
  }, []);

  const openDialog = () => {
    setMounted(true);
    setOpen(true);
  };

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-label={label}
        aria-keyshortcuts="Meta+K Control+K"
        onPointerEnter={prefetch}
        onFocus={prefetch}
        onClick={openDialog}
        className="hidden h-10 w-full max-w-[360px] items-center gap-2 rounded-md border border-border-default bg-bg-primary px-3 text-left text-[14px] text-text-muted hover:border-border-strong md:flex"
      >
        <Search
          aria-hidden
          strokeWidth={ICON_STROKE}
          className="size-4 shrink-0"
        />
        <span className="flex-1 truncate">{copy.field}</span>
        <kbd aria-hidden className="font-sans text-[12px]">
          ⌘K
        </kbd>
      </button>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-label={label}
        onPointerEnter={prefetch}
        onFocus={prefetch}
        onClick={openDialog}
        className="grid size-11 place-items-center rounded-full text-text-primary max-md:order-1 md:hidden"
      >
        <Search aria-hidden strokeWidth={ICON_STROKE} className="size-5" />
      </button>
      {mounted ? (
        <SearchDialog copy={copy} open={open} onOpenChange={setOpen} />
      ) : null}
    </>
  );
}
