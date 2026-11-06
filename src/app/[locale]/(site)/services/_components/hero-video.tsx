"use client";

import { useEffect, useRef, useState } from "react";

import { prefersReducedMotion } from "@/components/motion/reveal-dom";
import { cn } from "@/lib/utils";

/*
 * The Services hero's looping background video (#68), over the hero photo.
 * - Decorative and silent: muted, no audio track, hidden from assistive tech. The photo
 *   underneath is the first paint (next/image, priority); the video fades in over it
 *   once its first frame plays, so nothing ever flashes empty.
 * - preload="none": a file downloads only once playback starts. Each source's `media`
 *   query picks the smaller encode on phones.
 * - It loops with no pause control, by the lead's decision (#68 review). That is an
 *   exception to WCAG 2.2.2, recorded in docs/tech-debt.md. The project's reduced-motion
 *   rule still applies: with reduced motion (or Data Saver) it never starts, and the
 *   photo stays.
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

export function HeroVideo({
  sources,
}: {
  /** In order of preference; the browser plays the first whose media and type fit. */
  sources: { src: string; type: string; media?: string }[];
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  // Hidden until its first frame plays, so the photo shows until then.
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || prefersReducedMotion() || saveDataOn()) return;
    // A refused play() (a power-saving mode, say) simply leaves the photo.
    video.play().catch(() => undefined);
  }, []);

  return (
    <video
      ref={videoRef}
      aria-hidden
      muted
      loop
      playsInline
      disablePictureInPicture
      preload="none"
      onPlaying={() => {
        setStarted(true);
      }}
      className={cn(
        "pointer-events-none absolute inset-0 -z-10 size-full object-cover",
        "transition-opacity duration-(--duration-slow) ease-standard",
        started ? "opacity-100" : "opacity-0",
      )}
    >
      {sources.map(({ src, type, media }) => (
        <source key={src} src={src} type={type} media={media} />
      ))}
    </video>
  );
}
