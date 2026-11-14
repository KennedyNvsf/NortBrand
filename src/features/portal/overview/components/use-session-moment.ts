"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

/*
 * "Once a session" moments (14 Portal — Motion): a signature reveal plays the first time
 * a view appears in a browser session, then not again until the next one. The flag lives
 * in sessionStorage per view; storage can be unavailable (private mode, blocked), in
 * which case the moment simply doesn't play.
 *
 * Returns null on the server and during hydration (the page renders its final state),
 * then, after mount: true if this view hasn't played yet this session (and motion isn't
 * reduced), false otherwise.
 */
export function useSessionMoment(key: string): boolean | null {
  const reduced = useReducedMotion();
  const [play, setPlay] = useState<boolean | null>(null);

  useEffect(() => {
    const flag = `nb-portal-moment:${key}`;
    // Deferred so the final state paints first, then the moment replays from the start.
    // The flag is written here, not before, so a cancelled run (React's double effect in
    // development) doesn't use up the moment.
    const frame = window.requestAnimationFrame(() => {
      let seen = true;
      try {
        seen = window.sessionStorage.getItem(flag) === "1";
        if (!seen) window.sessionStorage.setItem(flag, "1");
      } catch {
        seen = true;
      }
      setPlay(!seen && !reduced);
    });
    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [key, reduced]);

  return play;
}
