import { test, type Page } from "@playwright/test";

const SETTLE_TIMEOUT_MS = 5000;
const SAMPLE_GAP_MS = 100;

/**
 * Waits until no finite animation or transition is moving, so axe audits the page at
 * rest. An element caught mid-fade is measured against a blend of colours, and its
 * contrast fails although the finished state passes. Scroll reveals waiting for the
 * reader stay at opacity 0, which axe skips, as before. Looping animations (spinners,
 * the hero video) are ignored.
 *
 * "Moving" means its `currentTime` advanced between two samples ~100 ms apart.
 * Headless WebKit can report a CSS colour transition as `running` with `currentTime`
 * stuck at 0 for good (#108): it never finishes, but it doesn't change what axe sees
 * either, so it is ignored. Without that, every axe spec timed out in WebKit.
 *
 * It never fails a test. After 5 s it gives up, records a `settle-timeout` annotation
 * in the report, and lets axe run: the wait exists to make axe reliable, and motion is
 * tested in motion.spec.ts.
 *
 * Call it right before every `new AxeBuilder(…)`. The reveal engine loads after
 * hydration (#105), so on a slow runner a reveal can start later than the test's
 * previous step expects.
 */
export async function settleAnimations(page: Page) {
  const deadline = Date.now() + SETTLE_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const settled = await page.evaluate(async (gapMs) => {
      const finiteRunning = () =>
        document
          .getAnimations()
          .filter(
            (animation) =>
              animation.playState === "running" &&
              animation.effect?.getTiming().iterations !== Infinity,
          );

      const before = new Map(
        finiteRunning().map((animation) => [animation, animation.currentTime]),
      );
      if (before.size === 0) return true;

      await new Promise((resolve) => setTimeout(resolve, gapMs));

      // Settled when everything still running was already running and hasn't moved.
      // One that started during the gap gets measured on the next round.
      return finiteRunning().every(
        (animation) =>
          before.has(animation) &&
          before.get(animation) === animation.currentTime,
      );
    }, SAMPLE_GAP_MS);
    if (settled) return;
  }

  test.info().annotations.push({
    type: "settle-timeout",
    description: `Animations still moving after ${String(SETTLE_TIMEOUT_MS)} ms on ${page.url()}; axe ran anyway.`,
  });
}
