import Image from "next/image";

import { sanityImageProps, type SanityImage } from "@/lib/sanity/image";
import { cn } from "@/lib/utils";

/*
 * An author's round photo (Figma Blog: featured byline 32 px, post byline 44 px, author
 * card 80 / 56 px). Decorative: the name always sits beside it, so alt="" keeps screen
 * readers from hearing it twice. Without a photo, the designed red/50 circle.
 * `size` is the largest rendered size in px, for the CDN request (2× for sharp screens).
 */
export function AuthorAvatar({
  image,
  size,
  className,
}: {
  image: SanityImage | null | undefined;
  size: number;
  className?: string;
}) {
  const photo = sanityImageProps(image, { width: size * 2, aspect: 1 });
  const frame = cn(
    "relative shrink-0 overflow-hidden rounded-full bg-action-primary-subtle",
    className,
  );
  if (!photo) return <span aria-hidden className={frame} />;
  return (
    <span className={frame}>
      <Image
        src={photo.src}
        alt=""
        fill
        sizes={`${String(size)}px`}
        className="object-cover"
      />
    </span>
  );
}
