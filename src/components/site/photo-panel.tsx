import Image, { type StaticImageData } from "next/image";

import { Parallax } from "@/components/motion/parallax";
import { revealItem } from "@/components/motion/reveal-item";
import { cn } from "@/lib/utils";

/** Travel each way of the photo's parallax, px (Parallax's default). */
const DRIFT = 24;

/*
 * A photograph in the panel shape MarkPanel uses for its placeholder (Figma "Image
 * Panel", Home 71:85), so a section swaps one for the other without changing its layout
 * (#82). Decorative: the copy beside it carries the meaning, so alt="".
 * `parallax`: on desktop the photo drifts slower than the page, like the mark it
 * replaces. It is oversized by the drift each way, so its edges never show.
 * `sizes` must describe the panel's rendered width at each breakpoint.
 * - `isolate`: Safari can drop the rounded clip on a transformed child (the parallax),
 *   flashing square corners; a new stacking context keeps the radius.
 * - `settle`: inside a RevealGroup the photo zooms out from 101.6% as its panel arrives
 *   (reveal kind "settle"), standing in for the mark drawing itself.
 * - The hairline ring sits over the photo: light photos (a cream wall, white tiles)
 *   otherwise melt into the white page. On dark areas it is all but invisible.
 */
export function PhotoPanel({
  src,
  sizes,
  className,
  imageClassName,
  parallax = false,
  settle = false,
}: {
  src: StaticImageData;
  sizes: string;
  className?: string;
  /** Usually an object-position, to keep the subject in a cropped panel. */
  imageClassName?: string;
  parallax?: boolean;
  settle?: boolean;
}) {
  const photo = (
    <Image
      src={src}
      alt=""
      fill
      sizes={sizes}
      placeholder="blur"
      className={cn("object-cover", imageClassName)}
    />
  );
  // Its own layer, so the settle's scale and the parallax's drift never fight over one
  // element's transform.
  const image = (
    <div {...(settle && revealItem("settle"))} className="absolute inset-0">
      {photo}
    </div>
  );

  return (
    <div
      className={cn(
        "relative isolate overflow-hidden rounded-lg bg-text-primary",
        className,
      )}
    >
      {parallax ? (
        // -inset-y-6 is 24 px each way: keep it equal to DRIFT.
        <Parallax distance={DRIFT} className="absolute inset-x-0 -inset-y-6">
          {image}
        </Parallax>
      ) : (
        image
      )}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-text-primary/10 ring-inset"
      />
    </div>
  );
}
