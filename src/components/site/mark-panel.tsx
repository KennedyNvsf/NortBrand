import { cn } from "@/lib/utils";

/*
 * Dark panel with the white NortBrand mark (Figma "Image Panel" / "Mark", Home 71:85,
 * 97:105). A placeholder for photography (CLAUDE.md, Images): decorative, so hidden
 * from assistive tech. The path is the Figma "Mark" export, stroked with currentColor.
 */
const MARK_PATH =
  "M69.64 39.42C113.59 22.89 131.17 60.09 96.01 72.48C21.3 93.15 25.69 134.48 52.06 142.74C96.01 159.27 131.17 60.09 175.12 84.88C199.81 98.81 198.15 132.3 184.94 156.79M184.94 156.79C174.63 175.89 157.3 189.5 139.96 184.07C98.37 164.51 139.44 100.54 184.94 156.79ZM184.94 156.79C187.51 159.97 190.11 163.55 192.7 167.54";

export function MarkPanel({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      data-placeholder="image"
      className={cn(
        "flex items-center justify-center overflow-hidden rounded-lg bg-text-primary text-text-on-accent",
        className,
      )}
    >
      <svg
        viewBox="0 0 221 221"
        fill="none"
        className="size-34 md:size-44 lg:size-55"
      >
        <path
          d={MARK_PATH}
          stroke="currentColor"
          strokeWidth={17}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
