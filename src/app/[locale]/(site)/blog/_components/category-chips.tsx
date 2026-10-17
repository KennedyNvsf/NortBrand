import { Badge } from "@/components/ui/badge";
import {
  listingQuery,
  type ListingParams,
} from "@/features/blog/listing-params";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/*
 * The category filter (Figma 251:172): "All" plus one chip per category. Each chip is a
 * link (?category=), so filtering works without JavaScript and every view has a URL; the
 * active one is the Selected badge with aria-current. 44 px tap height on touch; the
 * row scrolls sideways on mobile instead of wrapping (Figma 370:646).
 */
export function CategoryChips({
  params,
  categories,
  allLabel,
  label,
  className,
}: {
  params: ListingParams;
  categories: { slug: string; name: string | null }[];
  allLabel: string;
  label: string;
  className?: string;
}) {
  const chips = [{ slug: "", name: allLabel }, ...categories];

  return (
    <nav aria-label={label} className={className}>
      <ul className="-mx-(--gutter) flex gap-2.5 overflow-x-auto px-(--gutter) py-0.5 md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
        {chips.map(({ slug, name }) => {
          const active = params.category === slug;
          return (
            <li key={slug || "all"} className="shrink-0">
              <Badge asChild variant={active ? "selected" : "neutral"}>
                <Link
                  href={{
                    pathname: "/blog",
                    query: listingQuery(params, { category: slug }),
                  }}
                  aria-current={active ? "true" : undefined}
                  scroll={false}
                  className={cn(
                    "min-h-11 px-3 text-small md:min-h-9 lg:min-h-0 lg:px-sm lg:text-caption",
                    !active &&
                      "transition-colors duration-(--duration-fast) ease-standard hover:bg-border-strong/40",
                  )}
                >
                  {name ?? slug}
                </Link>
              </Badge>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
