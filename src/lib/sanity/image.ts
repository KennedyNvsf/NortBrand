import { createImageUrlBuilder } from "@sanity/image-url";

import { publicEnv } from "@/env";

const builder = createImageUrlBuilder({
  projectId: publicEnv.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: publicEnv.NEXT_PUBLIC_SANITY_DATASET,
});

/** An image as the queries return it: the asset reference, crop, hotspot and alt. */
export type SanityImage = {
  asset: { _ref: string } | null;
  alt: string | null;
  crop?: unknown;
  hotspot?: unknown;
};

/**
 * `next/image` props for a Sanity image cropped to an aspect ratio, honouring the
 * editor's hotspot. The URL asks the Sanity CDN for webp/avif at the exact size;
 * next.config.ts allows cdn.sanity.io. Null when the image has no asset (never rendered
 * as a broken image).
 */
export function sanityImageProps(
  image: SanityImage | null | undefined,
  { width, aspect }: { width: number; aspect: number },
): { src: string; width: number; height: number; alt: string } | null {
  if (!image?.asset?._ref) return null;
  const height = Math.round(width / aspect);
  return {
    src: builder
      .image(image)
      .width(width)
      .height(height)
      .fit("crop")
      .auto("format")
      .url(),
    width,
    height,
    alt: image.alt ?? "",
  };
}
