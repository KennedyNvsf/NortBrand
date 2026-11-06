import type { Page } from "@playwright/test";

/**
 * Waits until no finite animation or transition is running, so axe audits the page at
 * rest. An element caught mid-fade is measured against a blend of colours, and its
 * contrast fails although the finished state passes. Scroll reveals waiting for the
 * reader stay at opacity 0, which axe skips, as before. Looping animations (spinners,
 * the hero video) are ignored.
 *
 * Call it right before every `new AxeBuilder(…)`. The reveal engine loads after
 * hydration (#105), so on a slow runner a reveal can start later than the test's
 * previous step expects.
 */
export async function settleAnimations(page: Page) {
  await page.waitForFunction(
    () =>
      document
        .getAnimations()
        .every(
          (animation) =>
            animation.playState !== "running" ||
            animation.effect?.getTiming().iterations === Infinity,
        ),
    undefined,
    { timeout: 5000 },
  );
}
