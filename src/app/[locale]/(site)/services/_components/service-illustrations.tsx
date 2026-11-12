import type { ComponentType, ReactNode } from "react";

import type { ServiceSlug } from "@/content/services";
import { cn } from "@/lib/utils";

import { drawPart } from "./illustration-parts";

/*
 * The five service illustrations (Figma components 486:265, 486:289, 486:305, 486:317,
 * 486:335): 240 × 160, one solid pen (stroke 5, color/action/primary, round caps),
 * solid red accents, white underlays where shapes overlap. Paths are exported from
 * Figma unchanged; they are inline SVG, not image files, because the parts animate.
 *
 * - Draw-on: each part carries its start and duration from the Figma timeline
 *   (drawPart, illustration-parts.ts); IllustrationPlayer plays them once the card
 *   scrolls into view. Server-rendered, the drawing is complete, so without
 *   JavaScript, above the fold or with reduced motion it simply shows.
 * - Hover accent (Motion Spec › Service illustrations): one per card, CSS transitions
 *   on the card's hover, held while the pointer stays and sprung back when it leaves,
 *   so it can be interrupted at any moment. Durations are the Figma accents': cursor
 *   150 ms and button 100 ms, brackets 300 ms, pencil 150 ms, heart 250 ms, ring
 *   600 ms, all on the emphasized curve. Hover only fires on devices that can hover
 *   (Tailwind v4), and `motion-safe` drops the accents with reduced motion.
 * - The accents use the individual `translate`, `scale` and `rotate` properties, so
 *   they combine with the `transform` the draw-on leaves on the same element.
 */

const pen = {
  stroke: "currentColor",
  strokeWidth: 5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

/** Scales and rotates around the part's own centre, not the SVG's origin. */
const ownCentre = "origin-center [transform-box:fill-box]";

const accent = "ease-emphasized";

type TraceProps = {
  d: string;
  at: number;
  duration: number;
  linear?: boolean;
  className?: string;
};

/** A pen stroke that trims on from its start. */
function Trace({ d, at, duration, linear, className }: TraceProps) {
  return (
    <path
      d={d}
      {...pen}
      pathLength={1}
      className={cn("[stroke-dasharray:1]", className)}
      {...drawPart("trace", at, { duration, linear })}
    />
  );
}

function Canvas({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 240 160"
      width={240}
      height={160}
      fill="none"
      aria-hidden
      focusable="false"
      className="h-40 w-60 shrink-0 overflow-visible text-action-primary"
    >
      {children}
    </svg>
  );
}

/* Figma 494:476. Hover: the cursor presses the button. */
function WebDesign() {
  return (
    <Canvas>
      <Trace
        d="M70 24H168C171.183 24 174.235 25.2643 176.485 27.5147C178.736 29.7652 180 32.8174 180 36V122C180 125.183 178.736 128.235 176.485 130.485C174.235 132.736 171.183 134 168 134H56C52.8174 134 49.7652 132.736 47.5147 130.485C45.2643 128.235 44 125.183 44 122V36C44 32.8174 45.2643 29.7652 47.5147 27.5147C49.7652 25.2643 52.8174 24 56 24H69"
        at={0}
        duration={0.55}
      />
      <Trace d="M44 44H180" at={0.35} duration={0.3} />
      <path
        d="M54 34C54 34.7956 54.3161 35.5587 54.8787 36.1213C55.4413 36.6839 56.2044 37 57 37C57.7956 37 58.5587 36.6839 59.1213 36.1213C59.6839 35.5587 60 34.7956 60 34C60 33.2044 59.6839 32.4413 59.1213 31.8787C58.5587 31.3161 57.7956 31 57 31C56.2044 31 55.4413 31.3161 54.8787 31.8787C54.3161 32.4413 54 33.2044 54 34ZM65 34C65 34.7956 65.3161 35.5587 65.8787 36.1213C66.4413 36.6839 67.2044 37 68 37C68.7956 37 69.5587 36.6839 70.1213 36.1213C70.6839 35.5587 71 34.7956 71 34C71 33.2044 70.6839 32.4413 70.1213 31.8787C69.5587 31.3161 68.7956 31 68 31C67.2044 31 66.4413 31.3161 65.8787 31.8787C65.3161 32.4413 65 33.2044 65 34ZM76 34C76 34.7956 76.3161 35.5587 76.8787 36.1213C77.4413 36.6839 78.2044 37 79 37C79.7956 37 80.5587 36.6839 81.1213 36.1213C81.6839 35.5587 82 34.7956 82 34C82 33.2044 81.6839 32.4413 81.1213 31.8787C80.5587 31.3161 79.7956 31 79 31C78.2044 31 77.4413 31.3161 76.8787 31.8787C76.3161 32.4413 76 33.2044 76 34Z"
        fill="currentColor"
        className={ownCentre}
        {...drawPart("pop", 0.5, { duration: 0.25 })}
      />
      <path
        d="M66 58H100C102.122 58 104.157 58.8429 105.657 60.3431C107.157 61.8434 108 63.8783 108 66V108C108 110.122 107.157 112.157 105.657 113.657C104.157 115.157 102.122 116 100 116H66C63.8783 116 61.8434 115.157 60.3431 113.657C58.8429 112.157 58 110.122 58 108V66C58 63.8783 58.8429 61.8434 60.3431 60.3431C61.8434 58.8429 63.8783 58 66 58Z"
        fill="currentColor"
        className={ownCentre}
        {...drawPart("pop", 0.6, { duration: 0.4 })}
      />
      <Trace d="M122 64H164" at={0.8} duration={0.25} />
      <Trace d="M122 79H152" at={0.9} duration={0.25} />
      <path
        d="M124 92H150C152.122 92 154.157 92.8429 155.657 94.3431C157.157 95.8434 158 97.8783 158 100C158 102.122 157.157 104.157 155.657 105.657C154.157 107.157 152.122 108 150 108H124C121.878 108 119.843 107.157 118.343 105.657C116.843 104.157 116 102.122 116 100C116 97.8783 116.843 95.8434 118.343 94.3431C119.843 92.8429 121.878 92 124 92Z"
        fill="currentColor"
        className={cn(
          ownCentre,
          accent,
          "transition-[scale] duration-(--duration-instant) motion-safe:group-hover/card:scale-90",
        )}
        {...drawPart("pop", 1.1, { duration: 0.3 })}
      />
      <g
        className={cn(
          accent,
          "transition-[translate] duration-(--duration-fast) motion-safe:group-hover/card:-translate-x-1.25 motion-safe:group-hover/card:translate-y-1",
        )}
      >
        <path
          d="M142 100V124L148.5 118L153 128L159.5 125L155 115.5H164L142 100Z"
          className="fill-bg-surface"
          {...drawPart("appear", 1.35)}
        />
        <Trace
          d="M142 100V124L148.5 118L153 128L159.5 125L155 115.5H164L143.2 100.9"
          at={1.35}
          duration={0.45}
        />
      </g>
    </Canvas>
  );
}

/* Figma 494:547. Hover: the brackets spread. */
function WebDevelopment() {
  const spread = cn(accent, "transition-[translate] duration-300");
  return (
    <Canvas>
      <Trace
        d="M72 38L28 80L72 122"
        at={0}
        duration={0.5}
        className={cn(spread, "motion-safe:group-hover/card:-translate-x-1.5")}
      />
      <Trace
        d="M168 38L212 80L168 122"
        at={0.1}
        duration={0.5}
        className={cn(spread, "motion-safe:group-hover/card:translate-x-1.5")}
      />
      <Trace
        d="M97.5 48.6C117.1 41.2 125 57.8 109.2 63.4C75.8 72.6 77.8 91.1 89.6 94.8C109.2 102.2 125 57.8 144.6 68.9C155.669 75.1368 154.931 90.1185 149.019 101.073M149.019 101.073C144.41 109.616 136.655 115.71 128.9 113.3C110.26 104.5 128.685 75.9148 149.019 101.073ZM149.019 101.073C150.175 102.504 151.338 104.108 152.5 105.9"
        at={0.45}
        duration={0.9}
      />
    </Canvas>
  );
}

/* Figma 494:595. The pencil writes the line; hover: it tilts. */
function ContentWriting() {
  return (
    <Canvas>
      <Trace d="M40 44H146" at={0} duration={0.45} />
      <Trace d="M40 64H122" at={0.3} duration={0.4} />
      <Trace
        d="M40 112C45.3015 101.397 52.3595 96.9422 57.391 98.6355M57.391 98.6355C59.9521 99.4974 61.988 101.952 63 106C66 120 48 122 50 110C50.6575 105.398 53.4764 101.444 57.391 98.6355ZM57.391 98.6355C65.384 92.9016 77.9449 91.9449 86 100C86.1414 100.141 86.2797 100.283 86.4148 100.424M86.4148 100.424C95.8299 110.28 89.8868 119.929 82 115C77.6414 112.276 80.4068 105.099 86.4148 100.424ZM86.4148 100.424C91.4342 96.5184 98.7171 94.3586 106 98C116 103 118 116 128 109C136 104 140 98 150 100"
        at={0.8}
        duration={1.1}
        linear
      />
      <g
        className={cn(
          ownCentre,
          accent,
          "transition-[rotate] duration-(--duration-fast) motion-safe:group-hover/card:rotate-5",
        )}
        {...drawPart("ride", 0.75)}
      >
        <path
          d="M150 100L153.5 83.7L186 51.2L198.8 64L166.3 96.5L150 100Z"
          className="fill-bg-surface"
        />
        <path
          d="M180.5 56.7L153.5 83.7L150 100M153.5 83.7L166.3 96.5M180.5 56.7L186 51.2L198.8 64L193.3 69.5M180.5 56.7L193.3 69.5M151.1 100.9L166.3 96.5L193.3 69.5"
          {...pen}
        />
        <path d="M150 100L153.5 83.7L166.3 96.5L150 100Z" fill="currentColor" />
      </g>
    </Canvas>
  );
}

/* Figma 494:652. Hover: the heart swells. */
function SocialMediaManagement() {
  return (
    <Canvas>
      <path
        d="M80 32H160C164.243 32 168.313 33.6857 171.314 36.6863C174.314 39.6869 176 43.7565 176 48V88C176 92.2435 174.314 96.3131 171.314 99.3137C168.313 102.314 164.243 104 160 104H106L84 126V104H80C75.7565 104 71.6869 102.314 68.6863 99.3137C65.6857 96.3131 64 92.2435 64 88V48C64 43.7565 65.6857 39.6869 68.6863 36.6863C71.6869 33.6857 75.7565 32 80 32Z"
        className="fill-bg-surface"
        {...drawPart("appear", 0)}
      />
      <Trace
        d="M96 32H160C164.243 32 168.313 33.6857 171.314 36.6863C174.314 39.6869 176 43.7565 176 48V88C176 92.2435 174.314 96.3131 171.314 99.3137C168.313 102.314 164.243 104 160 104H106L84 126V104H80C75.7565 104 71.6869 102.314 68.6863 99.3137C65.6857 96.3131 64 92.2435 64 88V48C64 43.7565 65.6857 39.6869 68.6863 36.6863C71.6869 33.6857 75.7565 32 80 32H95"
        at={0}
        duration={0.6}
      />
      <path
        d="M120 90.2C108 80.6 98.4 73.4 98.4 63.8C98.4 56.6 103.2 51.8 109.2 51.8C114 51.8 117.6 54.2 120 57.8C122.4 54.2 126 51.8 130.8 51.8C136.8 51.8 141.6 56.6 141.6 63.8C141.6 73.4 132 80.6 120 90.2Z"
        fill="currentColor"
        className={cn(
          ownCentre,
          accent,
          "transition-[scale] duration-(--duration-base) motion-safe:group-hover/card:scale-112",
        )}
        {...drawPart("pop", 0.55, { duration: 0.4 })}
      />
      <Trace d="M45 61L64 67" at={0.95} duration={0.25} />
      <Trace
        d="M34 49C36.8808 49.1048 39.6054 50.3364 41.5874 52.4296C43.5695 54.5228 44.6506 57.3105 44.5982 60.1928C44.5458 63.075 43.364 65.8215 41.3071 67.8413C39.2503 69.8611 36.4827 70.9927 33.6 70.9927C30.7173 70.9927 27.9497 69.8611 25.8929 67.8413C23.836 65.8215 22.6542 63.075 22.6018 60.1928C22.5494 57.3105 23.6305 54.5228 25.6126 52.4296C27.5946 50.3364 30.3192 49.1048 33.2 49"
        at={0.9}
        duration={0.3}
      />
      <Trace d="M195 110L176 102" at={1.1} duration={0.25} />
      <Trace
        d="M206 101C208.881 101.105 211.605 102.336 213.587 104.43C215.569 106.523 216.651 109.31 216.598 112.193C216.546 115.075 215.364 117.822 213.307 119.841C211.25 121.861 208.483 122.993 205.6 122.993C202.717 122.993 199.95 121.861 197.893 119.841C195.836 117.822 194.654 115.075 194.602 112.193C194.549 109.31 195.631 106.523 197.613 104.43C199.595 102.336 202.319 101.105 205.2 101"
        at={1.05}
        duration={0.3}
      />
      <Trace
        d="M188 34C191.713 34 195.274 35.475 197.899 38.1005C200.525 40.726 202 44.287 202 48"
        at={1.3}
        duration={0.2}
      />
      <Trace
        d="M188 18C195.956 18 203.587 21.1607 209.213 26.7868C214.839 32.4129 218 40.0435 218 48"
        at={1.45}
        duration={0.3}
      />
    </Canvas>
  );
}

/* Figma 494:715. Hover: the update ring turns half a revolution. */
function WebsiteMaintenance() {
  return (
    <Canvas>
      <path
        d="M120 38L158 52V84C158 106 142 120 120 130C98 120 82 106 82 84V52L120 38Z"
        fill="currentColor"
        className={ownCentre}
        {...drawPart("pop", 0, { duration: 0.45 })}
      />
      <path
        d="M101 82L115 96L140 68"
        strokeWidth={6}
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        className="stroke-icon-on-accent [stroke-dasharray:1]"
        {...drawPart("trace", 0.45, { duration: 0.35 })}
      />
      <g
        className={cn(
          ownCentre,
          accent,
          "transition-[rotate] duration-600 motion-safe:group-hover/card:rotate-180",
        )}
      >
        <Trace
          d="M60.2 56.1C65.091 45.5934 72.6624 36.5598 82.1526 29.9079C91.6428 23.2561 102.717 19.2204 114.262 18.2068C125.807 17.1932 137.415 19.2374 147.919 24.1339C158.423 29.0303 167.453 36.6063 174.1 46.1"
          at={0.8}
          duration={0.45}
        />
        <Trace d="M175 36.1L174.1 46.1L164.4 43.5" at={1.2} duration={0.15} />
        <Trace
          d="M179.8 111.9C174.909 122.407 167.338 131.44 157.847 138.092C148.357 144.744 137.283 148.78 125.738 149.793C114.193 150.807 102.585 148.763 92.0807 143.866C81.5766 138.97 72.547 131.394 65.9 121.9"
          at={0.95}
          duration={0.45}
        />
        <Trace d="M65 131.9L65.9 121.9L75.6 124.5" at={1.35} duration={0.15} />
      </g>
    </Canvas>
  );
}

export const serviceIllustrations = {
  "web-design": WebDesign,
  "web-development": WebDevelopment,
  "content-writing": ContentWriting,
  "social-media-management": SocialMediaManagement,
  "website-maintenance": WebsiteMaintenance,
} as const satisfies Record<ServiceSlug, ComponentType>;
