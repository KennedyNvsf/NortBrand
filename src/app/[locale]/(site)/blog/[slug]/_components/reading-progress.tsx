"use client";

import { useEffect, useRef } from "react";

/*
 * Reading progress (Motion Spec › Blog: "The bar under the nav scales with scroll
 * progress. Scroll-linked · linear · scaleX, origin left"). It measures the article,
 * not the page, so it is full when the last paragraph has been read, before the author
 * card and related posts.
 * - Writes the transform and aria-valuenow straight to the DOM on each animation frame:
 *   no React render per scroll event.
 * - role="progressbar" with a name and a value, so a screen reader can ask how far
 *   along the reader is.
 * - Reduced motion: hidden (Motion Spec: no scaling). The table of contents still
 *   shows where the reader is.
 */
export function ReadingProgress({
  targetId,
  label,
}: {
  targetId: string;
  label: string;
}) {
  const barRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = document.getElementById(targetId);
    const bar = barRef.current;
    const fill = fillRef.current;
    if (!target || !bar || !fill) return;

    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        // How much of the article has come into view: 0 before it reaches the bottom
        // of the screen, 1 once its last line has. Smooth for short posts too.
        const rect = target.getBoundingClientRect();
        const progress =
          rect.height <= 0
            ? 0
            : Math.min(
                1,
                Math.max(0, (window.innerHeight - rect.top) / rect.height),
              );
        fill.style.transform = `scaleX(${String(progress)})`;
        bar.setAttribute("aria-valuenow", String(Math.round(progress * 100)));
      });
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [targetId]);

  return (
    <div
      ref={barRef}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={0}
      data-slot="reading-progress"
      className="fixed inset-x-0 top-(--header-height) z-30 h-0.5 motion-reduce:hidden"
    >
      <div
        ref={fillRef}
        // Inline, not Tailwind's scale-x-0: that sets `scale`, which would multiply
        // with the transform written above and keep the bar empty.
        style={{ transform: "scaleX(0)" }}
        className="h-full origin-left bg-action-primary"
      />
    </div>
  );
}
