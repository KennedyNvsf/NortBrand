import { LogoMark } from "@/components/site/logo";

/*
 * Loading splash (Figma 08 — System / States 320:73, mobile 380:174). Motion Spec ›
 * System: "The squiggle draws itself in a loop while the progress bar fills. Skip if
 * the load takes under 400 ms." Splash only on first load (Global › Route change).
 *
 * No React state and no client component: it must work before hydration.
 * 1. `splashScript` runs inline in <head> before the first paint and marks
 *    <html data-splash="pending"> (skipped if the document already finished loading).
 * 2. globals.css shows `.splash` only while pending, fading in after a 400 ms delay,
 *    so a fast load is over before it could appear: no flash.
 * 3. window "load" (or a 6 s failsafe) sets data-splash="done" and hides it at once.
 * Client-side navigations never reload the document, so they never show it. Without
 * JavaScript the attribute is never set, so the splash never covers the page.
 * Reduced motion: the mark and bar stay static (motion-safe animations only).
 * aria-hidden: the content underneath is already in the document; the splash is a
 * visual cover, not information.
 */

export const SPLASH_FAILSAFE_MS = 6000;

export const splashScript = `(function(){var d=document.documentElement;if(document.readyState==="complete")return;d.dataset.splash="pending";function done(){d.dataset.splash="done"}addEventListener("load",done,{once:true});setTimeout(done,${SPLASH_FAILSAFE_MS})})();`;

export function LoadingSplash({ label }: { label: string }) {
  return (
    <div
      aria-hidden
      data-slot="loading-splash"
      className="splash fixed inset-0 z-60 items-center justify-center bg-bg-surface"
    >
      <div className="flex flex-col items-center gap-2xl">
        <LogoMark draw="loop" className="h-24 w-28 md:h-36 md:w-37.5" />
        <div className="h-1 w-45 overflow-hidden rounded-[2px] bg-border-default">
          <div className="h-full w-full origin-left bg-action-primary motion-safe:animate-splash-progress motion-reduce:w-[47%]" />
        </div>
        <p className="text-overline text-text-muted">{label}</p>
      </div>
    </div>
  );
}
