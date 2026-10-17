import { ArticleCardSkeleton } from "@/components/site/article-card";
import { cn } from "@/lib/utils";

/*
 * The listing while its results load (Figma 08 System / States › Skeleton 320:80,
 * mobile 380:181): the featured slot, the section heading, the filter bar and a row of
 * cards, in the real layout, so nothing jumps when content arrives. Hidden from
 * assistive tech; the region announces itself with `aria-busy`.
 */
const bar = "rounded-sm bg-border-default motion-safe:animate-pulse";

export function ListingSkeleton({ label }: { label: string }) {
  return (
    <div aria-busy="true" aria-label={label} role="status">
      <div aria-hidden className="bg-bg-surface px-(--gutter) py-lg lg:py-xl">
        <div className="mx-auto flex max-w-[calc(var(--container-canvas)-2*var(--gutter))] flex-col gap-xl lg:flex-row lg:items-center lg:gap-16">
          <div className="aspect-[4/3] w-full rounded-lg bg-border-default motion-safe:animate-pulse lg:w-160" />
          <div className="flex flex-1 flex-col gap-lg">
            <div className={cn(bar, "h-6 w-24")} />
            <div className={cn(bar, "h-10 w-11/12")} />
            <div className={cn(bar, "h-10 w-3/4")} />
            <div className={cn(bar, "h-5 w-full")} />
            <div className={cn(bar, "h-10 w-36")} />
          </div>
        </div>
      </div>
      <div
        aria-hidden
        className="bg-bg-surface px-(--gutter) pt-18 pb-25 lg:pt-22.5"
      >
        <div className="mx-auto flex max-w-[calc(var(--container-canvas)-2*var(--gutter))] flex-col gap-xl">
          <div className="flex flex-col gap-lg">
            <div className={cn(bar, "h-3 w-24")} />
            <div className={cn(bar, "h-12 w-80 max-w-full")} />
            <div className={cn(bar, "h-12 w-64 max-w-full")} />
          </div>
          <div className="flex flex-wrap gap-2.5">
            <div className={cn(bar, "h-10 w-57.5")} />
            {[0, 1, 2, 3, 4].map((index) => (
              <div key={index} className={cn(bar, "h-8 w-18")} />
            ))}
          </div>
          <div className="grid gap-lg md:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((index) => (
              <ArticleCardSkeleton
                key={index}
                className={cn(
                  index > 0 && "hidden md:flex",
                  index > 1 && "md:hidden lg:flex",
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
