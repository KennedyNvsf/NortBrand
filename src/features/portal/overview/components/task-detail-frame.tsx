"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSyncExternalStore, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

/*
 * Where a task's detail shows (#134; Portal · Responsive rules "Detail panel"):
 *   ≥ 1280 px  a right column beside the list (CP-04)
 *   768–1279   a 440 px sheet from the right (CP-T04)
 *   < 768      a bottom sheet (CP-M04b)
 * The detail itself is server-rendered (children). The URL holds the open task
 * (?task=18), so closing replaces the URL without it. Before hydration the column is
 * assumed (server snapshot); it's display:none below 1280, so nothing flashes.
 * Motion (14 Portal — Motion): the column slides 24 px in with a fade (250 ms); sheets
 * slide from their edge; reduced motion keeps the fade only.
 */

const WIDE = "(min-width: 80rem)";
const MOBILE = "(max-width: 47.9375rem)";

function subscribe(onChange: () => void) {
  const queries = [window.matchMedia(WIDE), window.matchMedia(MOBILE)];
  for (const query of queries) query.addEventListener("change", onChange);
  return () => {
    for (const query of queries) query.removeEventListener("change", onChange);
  };
}

function layout(): "column" | "side" | "bottom" {
  if (window.matchMedia(WIDE).matches) return "column";
  return window.matchMedia(MOBILE).matches ? "bottom" : "side";
}

export function TaskDetailFrame({
  title,
  closeHref,
  closeLabel,
  children,
}: {
  title: string;
  closeHref: string;
  closeLabel: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const mode = useSyncExternalStore(subscribe, layout, () => "column" as const);

  if (mode === "column") {
    return (
      <aside
        aria-label={title}
        className="relative hidden border-l border-border-default motion-safe:animate-in motion-safe:duration-(--duration-base) motion-safe:fade-in-0 motion-safe:slide-in-from-right-6 min-[80rem]:block"
      >
        <Button
          asChild
          variant="ghost"
          size="icon"
          className="absolute top-md right-md border border-border-default"
        >
          <Link href={closeHref} replace scroll={false} aria-label={closeLabel}>
            <X strokeWidth={1.75} aria-hidden />
          </Link>
        </Button>
        {children}
      </aside>
    );
  }

  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) router.replace(closeHref, { scroll: false });
      }}
    >
      <SheetContent
        side={mode === "bottom" ? "bottom" : "right"}
        aria-describedby={undefined}
        className={
          mode === "bottom"
            ? "max-h-[88dvh] overflow-y-auto rounded-t-lg"
            : "w-full overflow-y-auto md:max-w-[440px]"
        }
      >
        <SheetTitle className="sr-only">{title}</SheetTitle>
        {children}
      </SheetContent>
    </Sheet>
  );
}
