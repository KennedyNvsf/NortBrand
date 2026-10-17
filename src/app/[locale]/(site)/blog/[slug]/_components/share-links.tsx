"use client";

import { useSyncExternalStore } from "react";
import { Link2, Mail, Share2 } from "lucide-react";
import { toast } from "sonner";

import { ICON_STROKE } from "@/lib/icons";
import { cn } from "@/lib/utils";

/*
 * Figma 05 Blog › Post › Tags and Share (292:172): three round icon buttons.
 * - Share: the device's own share sheet (Web Share API). Shown only where the browser
 *   has one, so it never does nothing.
 * - Email: a mailto link with the title and address; works without JavaScript.
 * - Copy link: writes the address to the clipboard and confirms with a toast (Sonner
 *   announces it politely to screen readers).
 * Every control has a visible-icon-matching accessible name. 38 px on desktop, 44 px on
 * touch (Handoff tap targets).
 */

/* The share sheet's existence never changes, so there is nothing to subscribe to. */
const subscribe = () => () => undefined;
const hasShareSheet = () => typeof navigator.share === "function";

const control = cn(
  "inline-flex size-11 items-center justify-center rounded-full border border-border-default bg-bg-surface text-text-primary lg:size-9.5",
  "transition-colors duration-(--duration-fast) ease-standard hover:border-action-primary hover:text-text-accent",
);

export function ShareLinks({
  url,
  title,
  labels,
}: {
  url: string;
  title: string;
  labels: {
    share: string;
    email: string;
    copy: string;
    copied: string;
    copyFailed: string;
  };
}) {
  // The server render leaves the button out; the browser adds it if it can share.
  const canShare = useSyncExternalStore(subscribe, hasShareSheet, () => false);

  const share = () => {
    navigator.share({ title, url }).catch(() => undefined);
  };

  const copy = () => {
    navigator.clipboard.writeText(url).then(
      () => toast.success(labels.copied),
      () => toast.error(labels.copyFailed),
    );
  };

  const mailto = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`;

  return (
    <div className="flex items-center gap-2.5">
      {canShare ? (
        <button
          type="button"
          onClick={share}
          aria-label={labels.share}
          className={control}
        >
          <Share2 className="size-5" strokeWidth={ICON_STROKE} aria-hidden />
        </button>
      ) : null}
      <a href={mailto} aria-label={labels.email} className={control}>
        <Mail className="size-5" strokeWidth={ICON_STROKE} aria-hidden />
      </a>
      <button
        type="button"
        onClick={copy}
        aria-label={labels.copy}
        className={control}
      >
        <Link2 className="size-5" strokeWidth={ICON_STROKE} aria-hidden />
      </button>
    </div>
  );
}
