import type { ComponentProps, ReactNode } from "react";
import { ArrowRight } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { ICON_STROKE } from "@/lib/icons";
import { cn } from "@/lib/utils";

/*
 * Figma: 02 Components › Link (398:160). State: Default / Hover / Pressed / Focus.
 * - Small red text uses red/600 (`text-text-accent`); pressed shifts to action/primary
 *   hover. Hover underlines the label and moves the arrow 4 px (Figma gap 8 → 12),
 *   done with a transform so nothing reflows.
 * - Zero padding by design, but a 44 pt hit area on touch (Handoff). For standalone
 *   click targets use Button (ghost) instead.
 * - Hover is driven by the `group/link` class, so a whole clickable card can show the
 *   same hover on its "Learn More" label through <TextLinkContent />.
 */

const LINK_ROOT = "group/link";

function TextLinkContent({
  children,
  icon,
  showIcon = true,
  className,
}: {
  children: ReactNode;
  icon?: ReactNode;
  showIcon?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-sm text-label text-text-accent",
        "group-active/link:text-action-primary-hover",
        className,
      )}
    >
      <span className="underline-offset-4 group-hover/link:underline">
        {children}
      </span>
      {showIcon
        ? (icon ?? (
            <ArrowRight
              className="size-6 shrink-0 transition-transform duration-(--duration-fast) ease-standard motion-safe:group-hover/link:translate-x-1"
              strokeWidth={ICON_STROKE}
              aria-hidden
            />
          ))
        : null}
    </span>
  );
}

type TextLinkProps = ComponentProps<typeof Link> & {
  /** Trailing icon; defaults to Lucide ArrowRight. */
  icon?: ReactNode;
  /** Hide the trailing icon. */
  showIcon?: boolean;
};

function TextLink({
  className,
  children,
  icon,
  showIcon = true,
  ...props
}: TextLinkProps) {
  return (
    <Link
      data-slot="text-link"
      className={cn(
        LINK_ROOT,
        "inline-flex min-h-11 items-center rounded-sm lg:min-h-0",
        className,
      )}
      {...props}
    >
      <TextLinkContent icon={icon} showIcon={showIcon}>
        {children}
      </TextLinkContent>
    </Link>
  );
}

export { LINK_ROOT, TextLink, TextLinkContent };
