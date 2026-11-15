"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { motionTokens } from "@/lib/motion";

/*
 * "New update arrives" on the client feed (#139; 14 Portal — Motion). While the tab is
 * visible, the server-rendered feed is refreshed every 30 s, and at once when the client
 * comes back to the tab; a post that wasn't there
 * before fades up 8 px (250 ms, emphasized) and is announced. Reduced motion: it simply
 * appears. Never scrolls the page.
 *
 * Why not Supabase Realtime: the portal session lives in httpOnly cookies, which the
 * browser can't hand to a Realtime socket without exposing the session token to page
 * scripts. Logged in docs/tech-debt.md as a decision for the lead.
 */

const REFRESH_MS = 30_000;

export function FeedRefresher({
  ids,
  announce,
}: {
  /** The ids of the posts rendered now, newest first. */
  ids: string[];
  /** "1 new update" style text; {count} is filled in. */
  announce: { one: string; many: string };
}) {
  const router = useRouter();
  const seen = useRef(new Set(ids));
  const [message, setMessage] = useState("");

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const handle = window.setInterval(tick, REFRESH_MS);
    // Coming back to the tab refreshes at once, so new posts are there when they look.
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(handle);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [router]);

  useEffect(() => {
    const fresh = ids.filter((id) => !seen.current.has(id));
    if (fresh.length === 0) return;
    for (const id of ids) seen.current.add(id);

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const [x1, y1, x2, y2] = motionTokens.ease.emphasized;
    for (const id of fresh) {
      const element = document.querySelector(
        `[data-update-id="${CSS.escape(id)}"]`,
      );
      if (!element || reduced) continue;
      element.animate(
        [
          { opacity: 0, transform: "translateY(8px)" },
          { opacity: 1, transform: "translateY(0)" },
        ],
        {
          duration: motionTokens.duration.base * 1000,
          easing: `cubic-bezier(${String(x1)}, ${String(y1)}, ${String(x2)}, ${String(y2)})`,
        },
      );
    }
    setMessage(
      fresh.length === 1
        ? announce.one
        : announce.many.replace("{count}", String(fresh.length)),
    );
  }, [ids, announce]);

  return (
    <p aria-live="polite" className="sr-only">
      {message}
    </p>
  );
}
