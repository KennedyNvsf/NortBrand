"use client";

import dynamic from "next/dynamic";
import { useEffect, useId, useRef, useState } from "react";
import { Menu } from "lucide-react";
import { useTranslations } from "next-intl";

import { ICON_STROKE } from "@/lib/icons";

export const roundButton =
  "flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border-default bg-bg-surface text-icon-default transition-colors duration-(--duration-fast) ease-standard hover:border-border-strong";

/*
 * The tablet and mobile menu button. The full-screen sheet (Radix Dialog, about
 * 19 KiB of JavaScript) is in mobile-menu-panel.tsx and loads in its own chunk
 * (#105): fetched when the browser is idle, or as soon as the button is hovered or
 * focused, and mounted the first time the menu opens. It then stays mounted, so it
 * can play its close animation.
 */
const loadPanel = () =>
  import("./mobile-menu-panel").then((m) => m.MobileMenuPanel);
const MobileMenuPanel = dynamic(loadPanel);

const prefetch = () => {
  void loadPanel();
};

export function MobileMenu() {
  const t = useTranslations("Nav");
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
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
      <button
        ref={triggerRef}
        type="button"
        className={roundButton}
        aria-label={t("openMenu")}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onPointerEnter={prefetch}
        onFocus={prefetch}
        onClick={() => {
          setMounted(true);
          setOpen(true);
        }}
      >
        <Menu className="size-6" strokeWidth={ICON_STROKE} aria-hidden />
      </button>
      {mounted ? (
        <MobileMenuPanel
          id={id}
          open={open}
          setOpen={setOpen}
          triggerRef={triggerRef}
        />
      ) : null}
    </>
  );
}
