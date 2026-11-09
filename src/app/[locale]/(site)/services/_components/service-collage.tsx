import type { StaticImageData } from "next/image";

import { revealItem } from "@/components/motion/reveal-item";
import { PhotoPanel } from "@/components/site/photo-panel";
import { cn } from "@/lib/utils";

import type { CollagePhotos } from "./service-photos";

/* The collage's width per breakpoint (service-blocks.tsx: lg:w-139, md:w-78, and the
 * full 20 px-gutter container below 768). Keep in step with those classes. */
const COLLAGE_LG = 556;
const COLLAGE_MD = 312;
const COLLAGE_SM = "100vw - 40px";

/* Each piece's width as a share of the collage, and its width : height. */
const MAIN = { share: 0.762, aspect: (0.762 * 555) / (0.853 * 449) };
const DETAIL = { share: 0.381, aspect: 1 };

/*
 * `sizes` for a photo in a piece. object-cover scales a photo wider than its panel up
 * to the panel's height, so the photo is drawn wider than the panel (a 3:2 photo in
 * the main panel is about 1.36× its width). Sizing for the panel alone made browsers
 * pick a file below the drawn width, a touch soft on 2× screens.
 */
function coverSizes(
  piece: { share: number; aspect: number },
  photo: StaticImageData,
) {
  const drawn =
    piece.share * Math.max(1, photo.width / photo.height / piece.aspect);
  return [
    `(min-width: 1024px) ${String(Math.ceil(COLLAGE_LG * drawn))}px`,
    `(min-width: 768px) ${String(Math.ceil(COLLAGE_MD * drawn))}px`,
    `calc((${COLLAGE_SM}) * ${drawn.toFixed(3)})`,
  ].join(", ");
}

/*
 * Figma Services › Collage (163:34, tablet 359:176, mobile 359:464): a large panel with
 * a smaller square overlapping its top-right corner. Geometry is proportional to the
 * Figma 555 × 449 frame, so one component serves every breakpoint.
 * - With `photos` (#82): both pieces are PhotoPanels. Decorative, like the Home photos:
 *   the copy beside the collage carries the meaning, so the collage stays aria-hidden.
 *   No `settle` here, unlike Home: the pop already scales each panel 0.88 → 1, photo
 *   included, so a 1.6% zoom inside it would not read; and as two more reveal items it
 *   would push the square and the copy 100–200 ms later on every stage step.
 * - Without: the Figma placeholder (a red/50 panel and a dark square, with the glyphs
 *   in public/images/placeholder/), logged in docs/tech-debt.md.
 * Both pieces are "pop" reveal items: the panel lands first, the square a beat later on
 * top of it (ServiceStage / RevealGroup decide when). The square's surface-coloured
 * border separates it from the panel; its overflow clip follows the border's inner
 * radius, so the photo's corners match.
 */
export function ServiceCollage({
  photos,
  className,
}: {
  photos?: CollagePhotos;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      data-placeholder={photos ? undefined : "image"}
      className={cn("relative aspect-555/449 shrink-0", className)}
    >
      <div
        {...revealItem("pop")}
        className={cn(
          "absolute bottom-0 left-0 h-[85.3%] w-[76.2%] rounded-md lg:rounded-lg",
          photos
            ? "isolate overflow-hidden"
            : "flex items-center justify-center bg-action-primary-subtle",
        )}
      >
        {photos ? (
          <PhotoPanel
            src={photos.main.src}
            sizes={coverSizes(MAIN, photos.main.src)}
            imageClassName={photos.main.position}
            className="size-full rounded-[inherit]"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- 28 px decorative SVG; next/image adds nothing
          <img
            src="/images/placeholder/collage-icon-light.svg"
            alt=""
            width={28}
            height={28}
            className="w-[6.6%]"
          />
        )}
      </div>
      <div
        {...revealItem("pop")}
        className={cn(
          "absolute top-0 right-0 aspect-square w-[38.1%] rounded-md border-3 border-bg-surface bg-text-primary lg:rounded-lg lg:border-6",
          photos && "isolate overflow-hidden",
        )}
      >
        {photos ? (
          <PhotoPanel
            src={photos.detail.src}
            sizes={coverSizes(DETAIL, photos.detail.src)}
            imageClassName={photos.detail.position}
            className="size-full rounded-none"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- 24 px decorative SVG; next/image adds nothing
          <img
            src="/images/placeholder/collage-icon-dark.svg"
            alt=""
            width={24}
            height={24}
            className="absolute top-[29%] left-[29%] w-[11.4%]"
          />
        )}
      </div>
    </div>
  );
}
