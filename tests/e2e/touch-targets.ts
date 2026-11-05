import type { Page } from "@playwright/test";

/*
 * 44 px touch targets (CLAUDE.md › Accessibility, #95): buttons, nav items and form
 * controls need a 44 × 44 hit area on touch. Inline links in body copy are exempt, and
 * so is anything visually hidden (the skip link until it takes focus, sr-only inputs),
 * judged by its clipping: padding can make an sr-only box larger than 1 px.
 *
 * The check hit-tests instead of measuring boxes: `getBoundingClientRect` ignores the
 * invisible ::after that `touch-target` (globals.css) uses to grow a hit area without
 * changing the design. For every target it probes a grid of points over a 44 × 44
 * square centred on the element, and each point must land on the element or inside it.
 * A point that lands on a neighbouring control fails, so overlapping hit areas fail too.
 * A point covered by a fixed or sticky layer the target is not part of (the header, the
 * sticky CTA) is skipped: that is occlusion while scrolled, not target size.
 */

export const TOUCH_TARGET_PX = 44;

const TARGET_SELECTOR = [
  "a[href]",
  "button",
  "input:not([type='hidden'])",
  "select",
  "textarea",
  "summary",
  "[role='button']",
  "[role='link']",
  "[role='tab']",
  "[role='checkbox']",
  "[role='radio']",
  "[role='switch']",
  "[role='combobox']",
].join(", ");

export type TouchTargetFailure = {
  target: string;
  box: string;
  missed: string;
};

export async function findSmallTouchTargets(
  page: Page,
): Promise<TouchTargetFailure[]> {
  return page.evaluate(
    ({ selector, size }) => {
      const failures: TouchTargetFailure[] = [];

      const overlayLayer = (el: Element): Element | null => {
        for (let node: Element | null = el; node; node = node.parentElement) {
          const { position } = getComputedStyle(node);
          if (position === "fixed" || position === "sticky") return node;
        }
        return null;
      };

      const describe = (el: Element) => {
        const name = (
          el.getAttribute("aria-label") ??
          el.querySelector("[aria-label]")?.getAttribute("aria-label") ??
          el.textContent
        )
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 40);
        return `<${el.tagName.toLowerCase()}> "${name}"`;
      };

      for (const el of document.querySelectorAll<HTMLElement>(selector)) {
        if (!el.checkVisibility({ visibilityProperty: true })) continue;
        if (el.closest("[aria-hidden='true'], [inert]")) continue;

        const style = getComputedStyle(el);
        // Inline text links in prose are exempt; UI links are inline-flex or block.
        if (el.tagName === "A" && style.display === "inline") continue;

        // Visually hidden (sr-only: the skip link until focused, hidden inputs whose
        // label is the target). The box can be larger than 1 px when padding wins over
        // sr-only, so check the clipping, not the size.
        const initial = el.getBoundingClientRect();
        if (initial.width <= 1 || initial.height <= 1) continue;
        // Tailwind's sr-only clips with clip-path: inset(50%).
        if (style.clipPath === "inset(50%)") continue;

        el.scrollIntoView({ block: "center", inline: "center" });
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const layer = overlayLayer(el);

        // A 7 × 7 grid over the 44 px circle, 1 px inside its edge. A circle, not the
        // square: Chrome hit-tests border-radius, and a round 44 px button meets the
        // rule (its box is 44 × 44).
        const steps = [-1, -2 / 3, -1 / 3, 0, 1 / 3, 2 / 3, 1];
        const radius = size / 2 - 1;
        let missed = 0;
        let firstMiss = "";
        for (const dx of steps) {
          for (const dy of steps) {
            if (Math.hypot(dx, dy) > 1) continue;
            const x = cx + dx * radius;
            const y = cy + dy * radius;
            if (
              x < 0 ||
              y < 0 ||
              x >= window.innerWidth ||
              y >= window.innerHeight
            ) {
              missed += 1;
              firstMiss ||= `(${Math.round(x)}, ${Math.round(y)}) off screen`;
              continue;
            }
            const hit = document.elementFromPoint(x, y);
            if (hit && el.contains(hit)) continue;
            const hitLayer = hit ? overlayLayer(hit) : null;
            if (hitLayer && hitLayer !== layer && !hitLayer.contains(el)) {
              continue;
            }
            missed += 1;
            firstMiss ||= `(${Math.round(dx * radius)}, ${Math.round(dy * radius)}) from centre hits ${hit ? `<${hit.tagName.toLowerCase()}>` : "nothing"}`;
          }
        }

        if (missed > 0) {
          failures.push({
            target: describe(el),
            box: `${Math.round(rect.width)}×${Math.round(rect.height)}`,
            missed: `${missed} points, first ${firstMiss}`,
          });
        }
      }

      window.scrollTo(0, 0);
      return failures;
    },
    { selector: TARGET_SELECTOR, size: TOUCH_TARGET_PX },
  );
}
