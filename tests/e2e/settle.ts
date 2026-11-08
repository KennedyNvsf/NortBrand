import { test, type Page } from "@playwright/test";

const SETTLE_TIMEOUT_MS = 5000;
const SAMPLE_GAP_MS = 100;

const TIMED_OUT = Symbol("timed out");

declare global {
  interface Window {
    /** The first sample of a settle round (tests/e2e/settle.ts), kept between calls. */
    __nbSettleSample?: Map<Animation, CSSNumberish | null>;
  }
}

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
 * The 100 ms gap is waited out here, in the test runner, never inside the page (#112).
 * A timer inside `page.evaluate` never fires when a WebKit page stalls, and
 * `page.evaluate` has no timeout of its own, so the test hung until Playwright's 60 s
 * limit. Each in-page call is synchronous and raced against the 5 s deadline.
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
    // First sample: the finite animations running now, and where each one is.
    const running = await beforeDeadline(
      page.evaluate(() => {
        const sample = new Map<Animation, CSSNumberish | null>();
        for (const animation of document.getAnimations()) {
          if (
            animation.playState === "running" &&
            animation.effect?.getTiming().iterations !== Infinity
          ) {
            sample.set(animation, animation.currentTime);
          }
        }
        window.__nbSettleSample = sample;
        return sample.size;
      }),
      deadline,
    );
    if (running === TIMED_OUT) break;
    if (running === 0) return;

    await new Promise((resolve) => setTimeout(resolve, SAMPLE_GAP_MS));

    // Second sample: settled when everything still running was already running and
    // hasn't moved. One that started in the gap is measured on the next round.
    const settled = await beforeDeadline(
      page.evaluate(() => {
        const before =
          window.__nbSettleSample ?? new Map<Animation, CSSNumberish | null>();
        return document
          .getAnimations()
          .filter(
            (animation) =>
              animation.playState === "running" &&
              animation.effect?.getTiming().iterations !== Infinity,
          )
          .every(
            (animation) =>
              before.has(animation) &&
              before.get(animation) === animation.currentTime,
          );
      }),
      deadline,
    );
    if (settled === TIMED_OUT) break;
    if (settled) return;
  }

  test.info().annotations.push({
    type: "settle-timeout",
    description: `Animations still moving (or the page not answering) after ${String(SETTLE_TIMEOUT_MS)} ms on ${page.url()}; axe ran anyway.`,
  });
}

/** `work`, or TIMED_OUT if the deadline passes first. A late rejection is ignored. */
async function beforeDeadline<T>(
  work: Promise<T>,
  deadline: number,
): Promise<T | typeof TIMED_OUT> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<typeof TIMED_OUT>((resolve) => {
    timer = setTimeout(
      () => {
        resolve(TIMED_OUT);
      },
      Math.max(0, deadline - Date.now()),
    );
  });
  try {
    return await Promise.race([work, timeout]);
  } finally {
    clearTimeout(timer);
    // An abandoned call can still reject later (the test closes the page); that must
    // not surface as an unhandled rejection.
    work.catch(() => undefined);
  }
}
