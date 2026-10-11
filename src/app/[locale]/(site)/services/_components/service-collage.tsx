import { revealItem } from "@/components/motion/reveal-item";
import { cn } from "@/lib/utils";

/*
 * Figma Services › Collage (163:34, tablet 359:176, mobile 359:464): a red/50 panel
 * with a dark square overlapping its top-right corner. A placeholder for service
 * photography (CLAUDE.md, Images): decorative, hidden from assistive tech, logged in
 * docs/tech-debt.md. Geometry is proportional to the Figma 555 × 449 frame so one
 * component serves every breakpoint; the image glyphs are the Figma exports in
 * public/images/placeholder/.
 * Both pieces are "pop" reveal items: the panel lands first, the dark square a beat
 * later on top of it (ServiceStage / RevealGroup decide when).
 */
export function ServiceCollage({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      data-placeholder="image"
      className={cn("relative aspect-555/449 shrink-0", className)}
    >
      <div
        {...revealItem("pop")}
        className="absolute bottom-0 left-0 flex h-[85.3%] w-[76.2%] items-center justify-center rounded-md bg-action-primary-subtle lg:rounded-lg"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- 28 px decorative SVG; next/image adds nothing */}
        <img
          src="/images/placeholder/collage-icon-light.svg"
          alt=""
          width={28}
          height={28}
          className="w-[6.6%]"
        />
      </div>
      <div
        {...revealItem("pop")}
        className="absolute top-0 right-0 aspect-square w-[38.1%] rounded-md border-3 border-bg-surface bg-text-primary lg:rounded-lg lg:border-6"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- 24 px decorative SVG; next/image adds nothing */}
        <img
          src="/images/placeholder/collage-icon-dark.svg"
          alt=""
          width={24}
          height={24}
          className="absolute top-[29%] left-[29%] w-[11.4%]"
        />
      </div>
    </div>
  );
}
