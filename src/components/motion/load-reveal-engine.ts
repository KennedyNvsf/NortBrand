import type * as RevealEngineModule from "./reveal-engine";

type RevealEngine = typeof RevealEngineModule;

let engine: Promise<RevealEngine> | undefined;

/*
 * The reveal engine and Motion's `animate()`, fetched once, in their own chunk (#105).
 * Call it from an effect or an event handler, never during render: the request then
 * starts after hydration, so it never competes with the first paint. Lighthouse's
 * simulated LCP counts every script requested before the first paint, and this one
 * is about 17 KiB gzipped.
 *
 * Components hide items with reveal-dom.ts straight away and play them once the
 * engine has loaded. If loading fails, the caller must show its items (`unhide`):
 * content never stays hidden.
 */
export function loadRevealEngine(): Promise<RevealEngine> {
  engine ??= import("./reveal-engine").catch((error: unknown) => {
    engine = undefined; // let a later call retry
    throw error;
  });
  return engine;
}
