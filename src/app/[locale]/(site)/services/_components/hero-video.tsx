"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

import { prefersReducedMotion } from "@/components/motion/reveal-engine";
import { ICON_STROKE } from "@/lib/icons";
import { cn } from "@/lib/utils";

/*
 * The Services hero's looping background video (#68), over the hero photo.
 * - Decorative and silent: muted, no captions needed, hidden from assistive tech. The
 *   photo underneath is the first paint (next/image, priority); the video fades in over
 *   it once its first frame plays, so nothing ever flashes empty.
 * - preload="none": the 6.5 MB file downloads only once playback starts.
 * - Autoplay is decided in the browser: not with reduced motion (Motion Spec: no
 *   auto-playing motion) and not with Data Saver on. A blocked play() simply leaves
 *   the photo.
 * - The pause/play button is required: moving content that starts by itself and lasts
 *   over 5 s must be pausable (WCAG 2.2.2). The button's state follows the video's own
 *   play and pause events, so it can never disagree with what is on screen.
 */

/* navigator.connection is Chromium-only and not in TypeScript's DOM types. */
function saveDataOn() {
  const connection: unknown = Reflect.get(navigator, "connection");
  return (
    typeof connection === "object" &&
    connection !== null &&
    "saveData" in connection &&
    connection.saveData === true
  );
}

function shouldAutoplay() {
  return !prefersReducedMotion() && !saveDataOn();
}

export function HeroVideo({
  src,
  labels,
}: {
  src: string;
  labels: { pause: string; play: string };
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  // Hidden until its first frame plays; after that a pause keeps the frozen frame.
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !shouldAutoplay()) return;
    video.play().catch(() => undefined);
  }, []);

  const toggle = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play().catch(() => undefined);
    else video.pause();
  };

  return (
    <>
      <video
        ref={videoRef}
        aria-hidden
        muted
        loop
        playsInline
        preload="none"
        onPlaying={() => {
          setPlaying(true);
          setStarted(true);
        }}
        onPause={() => {
          setPlaying(false);
        }}
        className={cn(
          "absolute inset-0 -z-10 size-full object-cover",
          "transition-opacity duration-(--duration-slow) ease-standard motion-reduce:duration-(--duration-fast)",
          started ? "opacity-100" : "opacity-0",
        )}
      >
        <source src={src} type="video/mp4" />
      </video>
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? labels.pause : labels.play}
        className={cn(
          "absolute top-[calc(var(--header-height)+1rem)] right-(--gutter) z-10",
          "inline-flex size-11 items-center justify-center rounded-full border border-text-on-accent/25 bg-text-primary/55 text-text-on-accent",
          "transition-colors duration-(--duration-fast) ease-standard hover:bg-text-primary/75",
        )}
      >
        {playing ? (
          <Pause className="size-5" strokeWidth={ICON_STROKE} aria-hidden />
        ) : (
          <Play className="size-5" strokeWidth={ICON_STROKE} aria-hidden />
        )}
      </button>
    </>
  );
}
